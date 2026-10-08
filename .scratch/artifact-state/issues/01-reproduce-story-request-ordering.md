# 01: Reproduce overlapping Story request ordering

Status: ready-for-agent
Type: research
Approved: 2026-10-08
Specification: [Shared Learning artifact state](../spec.md).

## TODO

Attempt to reproduce late Story opening or generation results replacing a more recent learner choice. This is a hypothesis from source inspection, not a confirmed bug. Keep reproduction separate from the approved shared-state refactor; do not implement an ordering fix before gathering evidence.

## Evidence to investigate

- ArtifactLibrary's history-opening path checks drafts before and after awaiting DesktopBridge, but has no explicit ordering check for two overlapping history requests.
- The source-navigation effect already ignores replies after cleanup; preserve and test this existing protection.
- DesktopOperations.openArtifact saves the active Learning artifact before its reply reaches the renderer. Successful generation saves the artifact and active ID in one transaction.
- Existing delayed-open acceptance proves draft protection. It does not prove that two open requests or generation and opening can complete out of order in the ordinary runtime.

## Reproduction checklist

- [ ] Try rapid A then B selection through the history dropdown and Library with the real desktop host.
- [ ] If the ordinary runtime does not reproduce it, use controlled reply delays and record exactly which host execution or reply order was changed.
- [ ] Separately test delayed restoration and generation completion alongside a newer article choice, where the current interface permits it.
- [ ] Record the reader's artifact ID, Library selection, vocabulary source and host restoreArtifact result before and after completion and restart.
- [ ] Check whether a blocked navigation with an edited word draft changes only the saved active artifact.
- [ ] Record either a reproducible failure and its runnable check or a negative result with the conditions tested; do not label a fixture-only schedule as a demonstrated ordinary-runtime bug.

## Comments

2026-10-08: The owner requested reproduction and deferred this investigation to TODO while the shared-state refactor proceeds.
