# Institutional identity and migration contract

## New identities

Each source has `identity_namespace`, defaulting to `source:<source_id>`. Native strings are exact, case-sensitive identifiers. Canonical UUIDv5 input uses an unambiguous JSON tuple of scope, namespace and native ID; delimiter-containing identifiers cannot collide through concatenation. Namespace keys allow the default prefix plus the maximum supported source ID.

New entities with the same native string in independent namespaces stay distinct. Renames/verified aliases do not change bindings. Names, case-folded search matches and model suggestions never establish equivalence. Entity type conflicts within a binding are rejected.

A shared namespace requires an existing approved identifier-authority grant naming the source ID and matching authority reference. Only authorized identity administrators can create/extend grants, and existing grant classification is enforced. The live Cedar demonstration explicitly approved the known Cedar master identifier domain for its institutional, processing, status and channel sources; correlation did not assume raw IDs were globally shared by every source.

Bank transaction/customer references use separate typed reference keys. They cannot accidentally inherit a mapping between institutional routes/gateways that use the same native text.

## Explicit reconciliation

`POST /v1/identity/mappings` records source/target namespaces and native IDs, evidence from both bindings, type compatibility, authority reference, actor, rationale and effective time. Candidate mappings do not merge. An accepted mapping changes current resolution only at/after its effective and known time, preserving original bindings and source identities. Cycles/redundant or conflicting active redirects are rejected. Historical queries before the mapping still reconstruct distinct identities. Restricted mapping evidence is not used in lower-clearance projections; supporting mapping evidence is retained with resolved context.

This is an authorized identity attestation workflow. It does not independently verify the contents of an external master registry. Current mappings require existing institutional identity bindings. Orphan operational/status references without a binding need explicit administrator reconciliation/provisioning; the API does not infer such bindings or merge them from name similarity. Transaction/customer reference reconciliation across unrelated namespaces is not implemented; provision an approved shared identifier domain where justified.

## v0.3.0 compatibility — migration 0002

Alembic `0002` creates compatibility bindings using the **stored** canonical UUIDs from legacy entity records. It adds server-owned namespace metadata to source evidence and assertions. It does not modify source payloads/digests, evidence UUIDs, old review decisions, or historical investigation revision JSON/references. A source's existing known entities therefore retain their IDs rather than being silently regenerated under the new formula.

Where the old global native-ID rule already combined multiple source namespaces, the old UUID is retained for compatibility and a restricted `identity_reconciliation` record marks manual review required. Current projections flag those identities/relationships as requiring review; historical stored investigation snapshots remain untouched. The system does not retrospectively certify those merges or silently split UUIDs referenced by old investigations.

New registrations default to isolation, including unknown IDs added to a legacy source. Legacy sources without `ai_enabled` remain opted out of automatic processing until an administrator enables their processing policy. Old queued tasks without source-grant/digest snapshots fail closed and require authorized reprocessing. No attempt is made to approve old unqualified model results as part of migration.

## Administrator procedure and manual cases

1. Back up each independent database; run the packaged Alembic upgrade with its own credentials.
2. Inspect `/v1/identity/bindings` and `/v1/identity/reconciliation`; retain the legacy-to-namespace compatibility records and historical references.
3. Establish actual identifier authority. Provision approved shared namespaces for new sources only where the institution has verified that authority.
4. Use explicit candidate/reviewed mapping records for already bound identities with sufficient evidence. Keep ambiguous cases unresolved.
5. Existing shared legacy UUIDs that need splitting, source-namespace reassignment, and unbound processing references require an administrator-reviewed data migration. There is no automatic split/reassignment or browser remediation action in this release. Old cross-source assumptions may consequently need reconciliation before future joins become supported; guessing equivalence is intentionally avoided.

The automated migration path was exercised with real Alembic 0001->0002 on a seeded SQLite legacy database, including a non-derived stored UUID and an unchanged historical investigation reference. Fresh PostgreSQL deployments applied migration 0002 with zero metadata differences. A nonempty production PostgreSQL upgrade and institution-specific legacy reconciliation were not performed or certified.

Downgrading all the way to an empty base is tested. Running old application code over newly namespaced data is unsupported; compatibility data is retained on migration downgrade rather than destructively removed.
