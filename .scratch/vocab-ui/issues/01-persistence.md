# Vocabulary notes, positions and deletion

Status: resolved
Type: task

Implement the host and bridge slice of [the approved spec](../spec.md). Add compatible local note persistence, return collected positions and delete a single entry with its contexts/positions transactionally. Preserve source material and historical Story snapshots.

Verify with focused host tests, migration/restart checks, failure rollback and IPC parity/access tests.

## Outcome

Implemented additive note persistence, position reads and transactional deletion in `desktop/operations.ts`, with matching typed bridge, preload and IPC registration. Host tests verify migration, validation, notes across edits/recollection/retranscription/restart, delete rollback and preservation of media and Story snapshots. See [acceptance](../acceptance.md).
