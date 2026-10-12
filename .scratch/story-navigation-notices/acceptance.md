# Story navigation and notices acceptance

Date: 2026-10-12
Status: passed for the source checkout
Scope: [approved Q1–Q14](spec.md), [resolved task](issues/01-implement-navigation-and-notices.md)

## Result and decisions

Library, Story history, vocabulary sources and generated passages share the latest valid navigation intent in [useLearningArtifacts](../../src/workspace/useLearningArtifacts.ts). Loading preserves the accepted view. Superseded reads, failed reads, real unsaved changes and view departure cannot change the visible or persisted Story. Saving or discarding a draft never revives its canceled request. Opening an editor or selecting an identical value does not create a dirty draft. Cloud-applied meaning changes follow the same cancellation rule.

[DesktopOperations](../../desktop/operations.ts) reads candidate artifacts without saving the selection. Acceptance validates the saved artifact and updates the existing current-artifact setting with one SQLite statement. A small synchronous, named [IPC operation](../../desktop/main.ts) makes the final renderer eligibility check, durable commit and selection update run without intervening renderer events. Failed writes retain the previous selection. A process exit after the commit but before painting restores the new selection. This deliberately trades a brief renderer wait on disk for a narrow acceptance boundary; no schema migration or generic scheduler was introduced.

Successful generation retains the passage, annotations and historical target snapshots independently of accepting it as current. Closing the generation dialog immediately restores editing access while generation continues; an ensuing draft can cancel the automatic switch. Normal generation still opens and remembers its new Story.

[Notice](../../src/workspace/Notice.tsx) and [shared styling](../../src/workspace/notice.css) cover application-owned errors in Listen, Story, Vocabulary, Library and Settings. Inline field errors preserve validation associations and retry/help controls. General failures, loading and cancellation appear in the upper-right stack. Notices remain single-line, content-sized up to 370px and 44px high, with ellipsis, full sanitized details, native popover keyboard access and dismissal. Transient cancellation expires after five seconds; actionable failures persist. Interface-owned text follows English or Simplified Chinese; external diagnostic text remains available after credential redaction. Success styling is supported without adding unrelated success flows.

## Verification

| Check | Outcome |
| --- | --- |
| Focused artifact, English lifecycle, IPC and localization tests | 21 passed; candidate-read persistence and diagnostic redaction were demonstrated failing before their fixes |
| `npm test` | 83 passed, zero failed or skipped |
| `npm run lint` | Passed, no warnings |
| `npm run typecheck` | Passed, including generated Next route types |
| `npm run desktop:build` | Passed, static production renderer and desktop compilation; exited successfully before final native acceptance |
| `node .scratch/story-navigation-notices/verify.cjs` | Passed all six isolated native-process phases using Electron 44.5.1, production main/preload/renderer and real SQLite |
| Independent code review | Standards: zero findings; Spec: zero remaining findings after draft/loading/close-event fixes |

The [native driver](verify.cjs) creates a new disposable profile, substitutes only external generation/lookup/model results, gates actual host artifact-read replies, and injects a SQLite trigger failure. It uses rendered controls, the public bridge and durable restoration rather than private hook state. Final evidence is under `.scratch/desktop-learning/generated-samples/story-navigation-lfhn3R/`: `initial.json`, `restart.json`, `before-commit.json`, `restart-before.json`, `after-commit.json` and `restart-after.json`. Profiles and regenerable evidence are ignored and are not committed.

Verified behaviors:

- Mixed Library/history/source requests and A→B→C reverse completion accept only the latest intent. A newer failed read cannot resurrect an older request; the prior Story stays visible during loading.
- A real collection change, cloud-applied meaning, or notebook note edit permanently cancels pending navigation, including immediate save/discard. Draft text and accepted selection remain intact. An unedited collection editor permits switching.
- Leaving Story prevents late focus and selection changes. Injected SQLite failure retains the old Story; an explicit fresh selection retries successfully and reload agrees.
- Generation with a draft retains its passage, translations and target snapshots without changing the Story or discarding the draft. Normal generation accepts the saved result.
- Persistent errors remain after 5.2 seconds; transient cancellation disappears. Rendered floating notices measure at most 370px wide and exactly 44px high, use the intended dusty-purple background, truncate long text and remove fixture credentials. Native Enter opens full details with focus; Escape closes; dismissal works. Settings notices retain `aria-describedby`, localize in both languages and fit a 480px window.
- A fresh process restores the last durable selection and all five generated artifacts. An exit before acceptance restores A; an exit immediately after committing B, before returning to the renderer, restores B. No renderer console errors were recorded.

## Limits and remaining release work

These are controlled source-checkout timing tests, not evidence of a routine-use defect frequency. External providers and local processing are deterministic fixtures in the native run; live model/provider quality, installed-package behavior, audible playback, screen-reader operation and owner visual approval were not reassessed.

Electron screenshot capture returned `UnknownVizError`, including with hardware acceleration disabled. Failed attempts remain in ignored generated profiles (`story-navigation-S7Tz95`, `story-navigation-5m4GbI`); the final driver verifies computed layout and keyboard behavior without claiming screenshot or human visual acceptance. To reproduce the capture limitation, call `await window.webContents.capturePage(undefined, { stayHidden: true, stayAwake: true })` in the driver after the English Settings error assertion, with its hidden native window. Initial restricted-environment checks also encountered temporary-file permissions and Next path canonicalization errors; normal host runs passed the complete checks above.

The synchronous acceptance call briefly waits for the local SQLite write and artifact serialization. It contains no provider or worker work; unusually slow disk access can delay the renderer. Packaged navigation/notices and owner visual acceptance belong to the next release, alongside existing release checks.
