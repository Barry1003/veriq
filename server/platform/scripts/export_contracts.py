"""Export only implemented APIs and runtime-validated event/task schemas."""

import json
from pathlib import Path

from apps.cedar.backend.api import create_app as cedar
from apps.cedar.backend.channels import BranchVisit, CallTranscript, EmailMessage, InAppMessage
from apps.veriq.backend.adaptive_contracts import PublishedAssessment
from apps.veriq.backend.api import create_app as veriq
from apps.veriq.backend.inference import SCHEMAS
from shared.contracts import (
    PAYLOADS,
    Envelope,
    IdentityMapping,
    IdentityNamespace,
    ProcessingPolicy,
    SourceAuthorization,
)

root = Path(__file__).resolve().parents[1] / "contracts"
for name, factory in (("cedar", cedar), ("veriq", veriq)):
    (root / "api" / f"{name}-v{'0.5.0' if name == 'veriq' else '0.4.0'}.openapi.json").write_text(
        json.dumps(factory().openapi(), indent=2) + "\n"
    )
(root / "events" / "source-envelope-v1.1.schema.json").write_text(
    json.dumps(Envelope.model_json_schema(), indent=2) + "\n"
)
for name, model in {**PAYLOADS, **SCHEMAS}.items():
    (root / "schemas" / f"{name}-v1.schema.json").write_text(
        json.dumps(model.model_json_schema(), indent=2) + "\n"
    )


for name, model in {
    "in-app-message": InAppMessage,
    "email-message": EmailMessage,
    "call-transcript": CallTranscript,
    "branch-visit": BranchVisit,
}.items():
    (root / "schemas" / f"{name}-v1.schema.json").write_text(
        json.dumps(model.model_json_schema(), indent=2) + "\n"
    )

for name, model in {
    "identity-namespace": IdentityNamespace,
    "identity-mapping": IdentityMapping,
    "source-authorization": SourceAuthorization,
    "processing-policy": ProcessingPolicy,
}.items():
    (root / "schemas" / f"{name}-v1.schema.json").write_text(
        json.dumps(model.model_json_schema(), indent=2) + "\n"
    )

(root / "schemas" / "adaptive-assessment-public-v1.schema.json").write_text(
    json.dumps(PublishedAssessment.model_json_schema(), indent=2) + "\n"
)
