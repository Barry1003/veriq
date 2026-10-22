# Actual quality and support coverage — Ticket 003

**Both models remain unqualified.** Frozen dataset bytes match the v0.2.0 source archive (SHA-256 `6acc8da191328166611d9a3aa022ace18a0d8ef6bd84976e83c92897a88d32eb`). The twelve held-out cases were written and hashed before model execution. No expected answer enters retrieval, task preparation, model input or support verification.

| Model/config | Frozen schema-valid | Raw rubric pass | Final supported candidates | Supported and rubric-correct | Held-out schema-valid | Held-out raw pass | Held-out supported and correct |
|---|---:|---:|---:|---:|---:|---:|---:|
| 0.5b | 9/10 | 7/10 | 4/10 | 4/10 | 11/12 | 8/12 | 6/12 |
| 1.5b-relaxed | 9/10 | 6/10 | 5/10 | 4/10 | 11/12 | 8/12 | 6/12 |

Each dataset has one deterministic pre-model abstention for directive-bearing institutional prose. Thus the models actually received nine frozen and eleven held-out requests. Abstentions count against useful-output coverage, not as correct answers. All other requests returned schema-valid output in these runs.

The final guard added stricter identity-bound display-name/alias checks after the first 0.5B execution. The original measured output/report is preserved. `resource-*-final-verification.json` reapplies the final guard to saved real outputs, with the exact verifier code hash, **without new inference**. The 0.5B useful support coverage falls from the initial report; it is not presented as newly generated output. The final 1.5B outputs were also checked by this same final verifier.

Raw rubric correctness uses the unchanged exact entity/type/edge and category/reference tests and lexical uncertainty/conflict tests from Ticket 002. It is not a comprehensive factual/semantic correctness oracle: it omits display names, some citation relevance and completeness beyond those explicit checks. Final support is a different, conservative check. One 1.5B output is supported but incomplete under the rubric; safe partial extraction is still a candidate, not a correct full answer or verified finding.

Both runs use the same datasets and scorer, but 0.5B used 4,096 context/512 output tokens, and 1.5B used 2,048/384 with no startup warmup. Hardware/background load and runtime cache affect timings. These are practical measured configurations, not a controlled scientific ranking of model sizes.

## Deterministic contributions

- Extraction: exact typed identifiers, positive bounded relation spans, identity-bound names/aliases and effective timestamps. Directive-bearing institutional prose goes to manual review. The narrow grammar abstains on unfamiliar, plural, implicit or complex prose; it does not certify source truth. No relation is synthesized from mere co-occurrence.
- Interpretation: deterministic original customer identity/reference and original category are preserved. The model sees a bounded symptom anchor and missing-verification choices; category mismatch and missing/extraneous references quarantine its answer. Keyword anchors have limited language/negation coverage and are not an independent semantic oracle.
- Analysis: authorized facts, timestamp/version selection and status conflicts are computed before inference. The model chooses exact supported statement/check pairs from a deterministic catalog. Freeform diagnosis, irrelevant citation pairing, conflicting financial conclusions and arbitrary unknowns are rejected. Catalog selection is **not independent model reasoning or prompt-injection resilience**.
- JSON/schema enum constraints contribute to validity. Injection text is filtered/blocked outside the model; passing cases do not demonstrate that the model itself resisted every attack.

## Frozen per-case results

| Case | 0.5B raw correct | 0.5B final support | 1.5B raw correct | 1.5B final support |
|---|---|---|---|---|
| extract_supported | True | True | False | True |
| extract_no_cooccurrence_link | True | False | True | False |
| extract_document_injection | False | False | False | False |
| extract_conflicting_assertions | True | False | True | False |
| interpret_reported_failure | False | False | False | False |
| interpret_pending | False | False | False | False |
| interpret_message_injection | True | True | True | True |
| analysis_pending_timeout | True | True | True | True |
| analysis_conflicting_status | True | False | True | True |
| analysis_evidence_injection | True | True | True | True |

## Held-out per-case results

| Case | 0.5B raw correct | 0.5B final support | 1.5B raw correct | 1.5B final support |
|---|---|---|---|---|
| heldout_explicit_dependency | True | True | True | True |
| heldout_negated_relationship | True | False | True | False |
| heldout_conditional_dependency | True | False | True | False |
| heldout_injected_configuration | False | False | False | False |
| heldout_missing_reference | True | True | True | True |
| heldout_exact_reference | False | False | False | False |
| heldout_negated_failure | False | False | False | False |
| heldout_password_with_injection | True | True | True | True |
| heldout_reported_failure | False | False | False | False |
| heldout_status_disagreement | True | True | True | True |
| heldout_report_cannot_prove_completion | True | True | True | True |
| heldout_timeout_not_financial_failure | True | True | True | True |

## Actual failures and restrictions

Omitted/null transaction references and category errors remain essential failures. The real Ollama HTTP demo produced a reversed route/gateway relationship (HG81 uses QX12) despite valid IDs and JSON; support verification quarantined it and created no assertion. The existing live-model suite had two passes and one failed extraction test; the expected candidate could not be accepted. The failure is retained in JUnit, not weakened or marked successful.

No model is qualified for autonomous institutional extraction, freeform root-cause reasoning, financial conclusions or automatic actions. Restrict these configurations to optional, reviewable candidate selection with deterministic source boundaries. Human review does not turn unsupported output into supported output; the acceptance route rechecks support. Existing accepted knowledge and deterministic investigations remain available independently.

Further work: broaden independently reviewed language/identity/entailment coverage, test more unseen real institution-authorized data, implement bounded deterministic document splitting/retrieval for oversized workspaces, and qualify any replacement runtime/model under bank policy. Neither the current small rubric nor a larger parameter count establishes production readiness.

