# Unify mutable vocabulary ownership

Type: task
Status: resolved

Implement the [approved scope](../spec.md): one Workspace-owned vocabulary hook, direct committed-result updates, derived generation targets, centralized complete-list read ordering and preserved Notebook drafts. Keep SQLite transactions, artifact collection queries and historical target snapshots.

## Answer

Implemented in [useVocabulary](../../../src/workspace/useVocabulary.ts), with Notebook, collection and target-selection callers migrated. Removed complete-list callbacks, duplicate target state and the revision counter. Native acceptance first reproduced a closed-generation-preview divergence, then passed the agreed consistency scenarios. See [acceptance](../acceptance.md) for verification and remaining release limits.
