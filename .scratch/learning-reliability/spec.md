# Learning reliability and vocabulary latency

## Acceptance

1. Ask for confirmation before replacing an existing transcript. Identify the affected media vocabulary sources and positions, sentence translations and meaning-group masks. Keep vocabulary entries and notes. First transcription starts directly. If transcription succeeds but the library list fails to refresh, retry only the list.
2. Reading a candidate media item from Library or a vocabulary source must leave the accepted media and the saved selection intact. Accept only the latest valid navigation. Editing a vocabulary draft or leaving for another view cancels a pending switch, including when the draft is subsequently saved or discarded. Restart restores the accepted media.
3. Settings must offer preparation or repair for incomplete recognition, translation and English analysis models. Existing complete installations remain usable offline. After interruption, the next launch must identify incomplete resources and allow repair of the affected component. Validate the repaired model before reporting success.
4. Two successive Korean or English word lookups can use the same local analysis process. Late or canceled responses cannot update a newer selection. An idle worker exits and a later lookup can recover from a crashed worker. Exercise the source and packaged command paths.
5. Selecting targets updates just their IDs across the bridge. Applying that reply preserves other current vocabulary fields. Loading the notebook builds generated contexts with a single pass over historical stories, preserving order, occurrence offsets and generation-time snapshots. Compare read and selection latency on a disposable database containing 500 entries and 100 stories.

Use component tests for interaction and delayed replies, a real Electron and SQLite regression for durable media selection, processor tests for cancellation and recovery, and isolated Python model directories for installation failures.

## Windows verification, 2026-11-19

The [renderer regressions](../../src/workspace/media-navigation.test.tsx) and [native Electron driver](../../tests/electron/media-navigation.cjs) cover delayed navigation, draft edits, selection failure and restart. The driver also verifies that retrying the list after a successful replacement leaves the transcription count unchanged. [Model integrity tests](../../scripts/test_model_integrity.py) exercise interruption and repair in disposable directories.

The full runs passed 88 Node, 32 frontend, 28 Python and five native regression checks, plus four packaged-verifier orchestration tests. The English and Chinese visual driver passed at 900, 1200 and 1440 pixels wide. The production web and desktop builds, lint and type checking passed.

Five timed rounds used a temporary SQLite database with 500 English entries and 100 stories. Each story had five distinct target entries. Each round read all entries, checked one context per entry and selected one target. On the same machine, median notebook read time fell from 1,600 ms to 20 ms and selection from 1,465 ms to 12 ms. [Database regressions](../../desktop/artifacts.test.ts) cover historical ordering, target snapshots and occurrence offsets.

An isolated Electron run used the standalone Windows worker and the existing offline models. English returned `child` and `run`, Korean returned `가다` and `먹다`, and all four requests used one child process. The child exited with the app. The [transport regressions](../../src/listening/media-server.test.ts) cover cancellation, idle expiry and recovery. Full installation on a clean Windows machine remains a release check.

In the final build, the second lookup in each language took 17 ms for English and 10 ms for Korean. In a separate model directory, the same executable repaired an incomplete English parser from the cached wheel. A new process reported it ready and returned `child` for `children`.
