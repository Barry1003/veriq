"""Open hypothesis space, closed read-only capability and publication contracts."""

from typing import Literal

from pydantic import Field, model_validator

from shared.contracts import Contract, Key, Namespace

ToolName = Literal[
    "get_transaction_evidence",
    "get_operational_observations",
    "get_institutional_context",
    "get_customer_issue_context",
    "search_institutional_sources",
]


class ToolArguments(Contract):
    namespace: Namespace | None = None
    native_id: Key | None = None
    query: str | None = Field(default=None, min_length=1, max_length=100)
    at: str | None = Field(default=None, max_length=40)


class ToolCall(Contract):
    name: ToolName
    arguments: ToolArguments


class SourceFact(Contract):
    evidence_id: str = Field(max_length=36)
    field: str = Field(min_length=1, max_length=100)


class Hypothesis(Contract):
    label: str = Field(min_length=1, max_length=100)
    explanation: str = Field(min_length=1, max_length=500)
    supports: list[str] = Field(max_length=4)
    weakens: list[str] = Field(max_length=4)
    next_check: str = Field(min_length=1, max_length=200)


class DerivedFinding(Contract):
    rule: Literal[
        "processing_receipt_unverified",
        "configured_execution_mismatch",
        "customer_completion_dispute",
    ]
    evidence_ids: list[str] = Field(min_length=1, max_length=4)


class AdaptiveAssessment(Contract):
    source_facts: list[SourceFact] = Field(max_length=4)
    derived_findings: list[DerivedFinding] = Field(max_length=4)
    hypotheses: list[Hypothesis] = Field(max_length=3)
    contradictions: list[DerivedFinding] = Field(max_length=3)
    unknowns: list[str] = Field(max_length=4)
    recommended_next_actions: list[str] = Field(max_length=4)

    @model_validator(mode="after")
    def bounded_text(self):
        if any(len(t) > 250 for t in self.unknowns + self.recommended_next_actions):
            raise ValueError("Assessment text exceeds budget")
        return self


class InvestigativeChoice(Contract):
    action: Literal["tool", "assess", "inconclusive"]
    question: str = Field(min_length=1, max_length=250)
    tool_call: ToolCall | None = None

    @model_validator(mode="after")
    def choice_contract(self):
        if (self.action == "tool") != (self.tool_call is not None):
            raise ValueError("Only a tool action carries a tool call")
        return self


class VerifiedSourceFact(SourceFact):
    value: str | int | float | bool | None
    status: Literal["verified_source_fact"]
    scope: str
    source_id: str
    authority: list[str]
    valid_at: str | None
    known_at: str | None


class PremiseTime(Contract):
    evidence_id: str
    valid_at: str | None
    known_at: str | None


class SupportedFinding(DerivedFinding):
    status: Literal["supported_derived_finding"]
    conclusion: str
    method: Literal["inspectable-rule-v1"]
    as_of: str
    premise_times: list[PremiseTime]


class UnverifiedHypothesis(Hypothesis):
    status: Literal["unverified_hypothesis"]
    support_semantics: str


class PublishedAssessment(Contract):
    source_facts: list[VerifiedSourceFact]
    derived_findings: list[SupportedFinding]
    contradictions: list[SupportedFinding]
    hypotheses: list[UnverifiedHypothesis]
    unknowns: list[str]
    recommended_next_actions: list[str]
    prose_status: Literal["unverified_model_proposals"]
    financial_actions_authorized: Literal[False]
