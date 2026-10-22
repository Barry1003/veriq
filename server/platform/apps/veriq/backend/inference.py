"""Real local OpenAI-compatible invocation; schemas and policy are outside prompts."""

import hashlib
import json
import os
import time
from copy import deepcopy
from threading import Lock, local
from typing import Literal
from urllib.parse import urlparse

import httpx
from pydantic import Field

from apps.veriq.backend.adaptive_contracts import AdaptiveAssessment, InvestigativeChoice
from apps.veriq.backend.prompts import BASE, EXAMPLES, PROMPT_VERSION, TASKS
from shared.contracts import Contract, Knowledge, now


class Interpretation(Contract):
    category: Literal["transfer_delay", "reported_failure", "access_problem", "other"]
    transaction_reference: str | None = None
    unknowns: list[str] = Field(max_length=20)


class Statement(Contract):
    text: str = Field(min_length=1, max_length=2000)
    evidence_ids: list[str] = Field(min_length=1, max_length=50)
    epistemic_status: Literal["hypothesis", "recommendation", "unknown"]


class Analysis(Contract):
    hypotheses: list[Statement] = Field(max_length=20)
    missing_information: list[str] = Field(max_length=20)
    recommendations: list[Statement] = Field(max_length=20)


SCHEMAS = {
    "adaptive_investigation": InvestigativeChoice,
    "adaptive_assessment": AdaptiveAssessment,
    "extract_knowledge": Knowledge,
    "interpret_interaction": Interpretation,
    "analyze_investigation": Analysis,
}


class InferenceUnavailable(Exception):
    pass


class InvalidInference(Exception):
    def __init__(self, message, raw_output=None, validation_error=None):
        super().__init__(message)
        self.raw_output = raw_output
        self.validation_error = validation_error


class LocalInference:
    def __init__(self, endpoint: str | None = None, model: str | None = None, client=None):
        self.endpoint = endpoint or os.getenv("LOCAL_AI_URL")
        self.model = model or os.getenv("LOCAL_AI_MODEL")
        self.client = client
        self.timeout = float(os.getenv("LOCAL_AI_TIMEOUT_SECONDS", "180"))
        self.max_tokens = int(os.getenv("LOCAL_AI_MAX_OUTPUT_TOKENS", "768"))
        self._local = local()
        self._successes = {}
        self._lock = Lock()
        if self.endpoint:
            parsed = urlparse(self.endpoint)
            allowed = {
                x.strip()
                for x in os.getenv("LOCAL_AI_ALLOWED_HOSTS", "127.0.0.1,localhost,ollama").split(
                    ","
                )
            }
            if (
                parsed.scheme not in {"http", "https"}
                or parsed.hostname not in allowed
                or parsed.username
            ):
                raise ValueError("Inference endpoint must be on the bank-approved host allowlist")

    def status(self):
        if not self.endpoint or not self.model:
            return {"state": "unconfigured", "model": self.model, "live_inference_verified": False}
        try:
            with httpx.Client(timeout=3, trust_env=False) as client:
                response = client.get(self.endpoint.rstrip("/") + "/models")
                response.raise_for_status()
                found = any(x.get("id") == self.model for x in response.json().get("data", []))
                return {
                    "state": "reachable" if found else "model_missing",
                    "model": self.model,
                    "live_inference_verified": bool(self._successes),
                    "verified_tasks": dict(self._successes),
                }
        except (httpx.HTTPError, ValueError):
            return {"state": "unavailable", "model": self.model, "live_inference_verified": False}

    def run(self, task: str, inputs: dict) -> dict:
        self._local.receipt = {}
        if not self.endpoint or not self.model:
            raise InferenceUnavailable("Local inference is not configured")
        schema = SCHEMAS[task]
        output_schema = schema.model_json_schema()
        if task == "adaptive_investigation":
            # Express mutually exclusive actions in the runtime grammar, rather
            # than asking a small model to correlate independent optional fields.
            variants = []
            for action in ("tool", "assess", "inconclusive"):
                variant = deepcopy({k: v for k, v in output_schema.items() if k != "$defs"})
                variant["required"] = ["action", "question", "tool_call"]
                variant["properties"]["action"] = {"type": "string", "const": action}
                variant["properties"]["tool_call"] = (
                    {"$ref": "#/$defs/ToolCall"} if action == "tool" else {"type": "null"}
                )
                variants.append(variant)
            output_schema = {"$defs": output_schema["$defs"], "oneOf": variants}
        if task == "adaptive_assessment":
            shown = {e["id"]: e for e in inputs["seed_evidence"]}
            for step in inputs.get("history", []):
                shown.update(
                    {e["id"]: e for e in (step.get("tool_result") or {}).get("evidence", [])}
                )
            if shown:
                citation = {"type": "string", "enum": sorted(shown)}
                variants = []
                for eid, evidence in sorted(shown.items()):
                    paths = []

                    def collect(value, prefix="", depth=0):
                        if depth > 4 or len(paths) >= 64:
                            return
                        if isinstance(value, dict):
                            for key, item in value.items():
                                collect(item, prefix + ("." if prefix else "") + key, depth + 1)
                        elif isinstance(value, list):
                            for index, item in enumerate(value[:10]):
                                collect(item, prefix + "." + str(index), depth + 1)
                        elif prefix and not (
                            prefix == "text" and evidence.get("content_truncated")
                        ):
                            paths.append(prefix)

                    collect(evidence["payload"])
                    if paths:
                        variants.append(
                            {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "evidence_id": {"type": "string", "const": eid},
                                    "field": {"type": "string", "enum": paths},
                                },
                                "required": ["evidence_id", "field"],
                            }
                        )
                if variants:
                    output_schema["$defs"]["SourceFact"] = {"oneOf": variants}
                output_schema["$defs"]["DerivedFinding"]["properties"]["evidence_ids"]["items"] = (
                    citation
                )
                for field in ("supports", "weakens"):
                    output_schema["$defs"]["Hypothesis"]["properties"][field]["items"] = citation
        if task == "interpret_interaction" and inputs.get("allowed_unknowns"):
            output_schema["properties"]["unknowns"]["items"] = {
                "type": "string",
                "enum": inputs["allowed_unknowns"],
            }
        if task == "analyze_investigation":
            allowed_ids = sorted({e["id"] for e in inputs["evidence"]})
            if allowed_ids:
                output_schema["$defs"]["Statement"]["properties"]["evidence_ids"]["items"] = {
                    "type": "string",
                    "enum": allowed_ids,
                }
            catalog = inputs.get("allowed_statements")
            for section, status in (
                ("hypotheses", "hypothesis"),
                ("recommendations", "recommendation"),
            ):
                item = deepcopy(output_schema["$defs"]["Statement"])
                item["properties"]["epistemic_status"] = {"type": "string", "const": status}
                item["properties"]["text"]["maxLength"] = 250
                item["properties"]["evidence_ids"]["maxItems"] = 2
                if catalog:
                    item["properties"]["text"] = {
                        "type": "string",
                        "enum": sorted({x["text"] for x in catalog[section]}),
                    }
                output_schema["properties"][section]["items"] = item
                output_schema["properties"][section]["maxItems"] = 2
            output_schema["properties"]["missing_information"]["maxItems"] = 4
            output_schema["properties"]["missing_information"]["items"] = {
                "type": "string",
                "maxLength": 200,
            }
            if catalog:
                output_schema["properties"]["missing_information"]["items"] = {
                    "type": "string",
                    "enum": catalog["missing_information"],
                }
        example_input, example_output = EXAMPLES.get(task, ({}, {}))
        system_prompt = BASE + TASKS.get(task, "")
        if task in {"adaptive_investigation", "adaptive_assessment"}:
            from apps.veriq.backend.adaptive import CHOICE_PROMPT, PROMPT

            system_prompt = PROMPT if task == "adaptive_assessment" else CHOICE_PROMPT
        request = {
            "model": self.model,
            "temperature": 0,
            "max_tokens": self.max_tokens,
            "stream": False,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                    + (
                        " Select exact text and its matching evidence IDs from allowed_statements. Include status conflicts. Do not paraphrase."
                        if inputs.get("allowed_statements")
                        else ""
                    ),
                },
                {"role": "user", "content": "Example task input: " + json.dumps(example_input)},
                {"role": "assistant", "content": json.dumps(example_output)},
                {
                    "role": "user",
                    "content": "Actual task input; use only evidence/IDs from this input, not the example: "
                    + json.dumps(inputs),
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": task, "strict": True, "schema": output_schema},
            },
        }
        if task in {"adaptive_investigation", "adaptive_assessment"}:
            request["messages"] = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(inputs)},
            ]
        started = time.monotonic()
        self._local.receipt = {
            "model": self.model,
            "task": task,
            "transport": "injected_client" if self.client else "http",
            "started_at": now(),
            "prompt_version": "ticket005-adaptive-v3"
            if task in {"adaptive_investigation", "adaptive_assessment"}
            else PROMPT_VERSION,
            "prompt_sha256": hashlib.sha256(system_prompt.encode()).hexdigest(),
            "output_schema_sha256": hashlib.sha256(
                json.dumps(output_schema, sort_keys=True).encode()
            ).hexdigest(),
        }
        try:
            if self.client:
                response = self.client.post(
                    self.endpoint.rstrip("/") + "/chat/completions", json=request
                )
            else:
                with httpx.Client(timeout=self.timeout, trust_env=False) as client:
                    response = client.post(
                        self.endpoint.rstrip("/") + "/chat/completions", json=request
                    )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise InferenceUnavailable("Local runtime request failed") from exc
        content = None
        try:
            body = response.json()
            choice = body["choices"][0]
            self._local.receipt.update(
                elapsed_seconds=round(time.monotonic() - started, 3),
                completed_at=now(),
                usage=body.get("usage", {}),
                runtime_timings=body.get("timings", {}),
            )
            content = choice["message"]["content"]
            if choice.get("finish_reason") == "length":
                raise InvalidInference(
                    "Model output truncated at configured token budget", raw_output=content
                )
            result = schema.model_validate_json(content)
            if task == "analyze_investigation":
                allowed = {e["id"] for e in inputs["evidence"]}
                for section, status in (
                    ("hypotheses", "hypothesis"),
                    ("recommendations", "recommendation"),
                ):
                    for statement in getattr(result, section):
                        if (
                            not set(statement.evidence_ids) <= allowed
                            or statement.epistemic_status != status
                        ):
                            raise InvalidInference(
                                "Unsupported citation or claim status", raw_output=content
                            )
            if task == "interpret_interaction":
                supplied = inputs["interaction"].get("transaction_id")
                if result.transaction_reference and result.transaction_reference != supplied:
                    raise InvalidInference(
                        "Model invented a transaction reference", raw_output=content
                    )
            if not self.client:
                with self._lock:
                    self._successes[task] = now()
            return result.model_dump()
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise InvalidInference(
                "Malformed structured model response", raw_output=content, validation_error=str(exc)
            ) from exc

    def execution_metadata(self):
        return dict(getattr(self._local, "receipt", {}))
