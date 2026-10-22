# Model qualification — v0.5.0 candidate

**Unqualified. Full Ticket 005 reasoning acceptance remains unmet, including with the requested 1.5B model.**

Qwen2.5-1.5B Q4_K_M made 18 real HTTP generations and eight tool requests in the final seven-case frozen suite. Seventeen generations were schema-valid; three cases retrieved new transaction evidence. **No assessment became reviewable, and none of the four reasoning prerequisites passed.** Two lifecycle invalidations and the closed-capability containment check are safety observations, not successful reasoning. Injection still distracted model attention.

The independent real Cedar/Veriq/worker HTTP demo passed six functional checks; its 1.5B outcome was inconclusive. Controlled positive examples use a clearly labelled model double with real persisted tool reads. They do not substitute for successful actual-model investigations.

Historical failures remain visible: both earlier models scored 4/10 original and 6/12 held-out, with the preserved Ticket 003 live extraction failure. Ticket 004 smoke passes did not confer qualification. Earlier failed/interrupted Ticket 005 trials are retained; protocol/configuration changed, so these are not a model-size-only A/B comparison.

Source-fact values are read by the server, not invented by the model. Supported derived predicates remain narrow; customer failure-language co-occurrence is not semantic truth certification. Hypothesis relevance and free prose remain unverified. No automatic knowledge approval or financial action is authorized.

The 1.5B session reached about 1.87 GiB RSS and 923 MiB process swap. Services were unloaded after measurement. Larger bank-hosted hardware/model capability can use the same interfaces but needs independent qualification; there is no mandatory cloud dependency.
