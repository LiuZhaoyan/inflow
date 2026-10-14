# Vocabulary state ownership

Approved: 2026-10-14

One hook owned by LearningWorkspace manages the complete mutable vocabulary list, reads and writes. Notebook retains selection, filters, editor/note drafts, pronunciation and navigation guards. Generation targets derive from the latest list; unconfirmed target choices stay local to the dialog.

Successful SQLite writes update the current list without requiring a reload. Failed writes preserve drafts. Failed reads retain existing data and expose retry; initial failure is not an empty notebook. Old reads cannot overwrite later successful writes. Reads interrupted by writes must retry when needed to retain generated Context changes and retranscription source cleanup.

Story retains its artifact-specific collection query and historical target snapshots. Generation/transcription run independently of short vocabulary writes; completion refreshes saved data without resetting drafts or bypassing navigation guards. No global store, write queue, schema changes or multi-window conflict handling.

## Acceptance

Use the real Electron renderer, shipped bridge and isolated SQLite, with deterministic local processor/generator fixtures and delayed IPC replies. Cover target selection followed by note saving, Story collection/highlights, old reads after writes, generation completion during drafts, vocabulary deletion and retranscription source cleanup. Distinguish rendered-state divergence from a reproduced user-visible generation failure.

Delete Notebook's complete list ownership, full-list callback, Workspace's separately stored generation targets and scattered complete-list request ordering. Keep necessary artifact-query ordering.
