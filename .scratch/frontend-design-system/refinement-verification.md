# Frontend refinement verification

Date: 2026-10-19
Status: implemented; owner visual review pending

## Scope

The owner authorized the proposed incremental visual and usability improvements on October 19, including screenshots. This authorization extends the existing shared system to Story without introducing a new palette or changing learning-data contracts.

- Story buttons, fields, language badges, menu surfaces and dialogs consume shared roles/tokens. Reading typography and the subdued cover remain intentional exceptions. Cover height responds to window height and content can grow without overlapping the controls.
- Empty Listen presents one import action and hides inactive practice controls. Automatic processing after import remains intact. Initial processing and failed processing have distinct labels; failure preserves the existing retry operation.
- Listen reserves 360px below the media stage for status, sentence content and controls. Pointer/keyboard resize limits match the CSS cap. Playback tools can wrap without overlaying sentence text. At exactly 900px, Content retains its two-column layout; stacking begins below 900px, matching the frontend guide.
- Compact vocabulary lists give more space to meanings, reduce source prominence and omit list thumbnails below 1240px. Source details and navigation remain available. Small language badges and Library metadata are more readable.

## Evidence

`verify-polish.cjs` loads the production renderer in a hidden Electron window using the real preload bridge with isolated IPC sample data. It creates a separate profile and a silent WAV fixture; it does not access the owner's database, credentials or media. Screenshots represent actual rendered components, not mockups.

Run a production build and local server, then set `INFLOW_CONTENT_URL` to that server and run `node .scratch/frontend-design-system/verify-polish.cjs`. Output defaults to `.scratch/desktop-learning/generated-samples/frontend-polish/` (ignored, regenerable).

Passed checks:

- Chinese and English at exact content viewport sizes 1200 × 800, 1440 × 900 and 900 × 650.
- Empty Listen, populated Listen, vocabulary, Story, Story target menu, Settings and generation-dialog screenshots at all six combinations.
- No horizontal or vertical page overflow in the primary workspace views; playback actions remain inside the viewport and sentence content retains at least 80px of reading height.
- Meaning-group masking toggles; Library opens Story; vocabulary selection reaches generation; Settings opens and closes in the production renderer.
- Initial processing label, injected processing failure, retry label, successful retry, first import and automatic processing. The logged `Processing fixture failed` exception is intentional.
- Manual inspection of empty, Listen, Story, vocabulary and generation screenshots, including the 900 × 650 Listen layout.
- Typecheck and production build passed. Focused lint of changed orchestration, Story, catalog and the verification harness passed.
- Unit suite: 82/83 passed in the sandbox; the remaining filesystem-rename test passed when its six-test file was rerun outside the sandbox. A temporary Windows esbuild binary was used because installed dependencies contained only the Linux binary; manifests and lockfile were not changed.

## Remaining limitations

- Full lint still reports two pre-existing errors: `react-hooks/refs` in `VideoStage.tsx` and `react-hooks/set-state-in-effect` in `useVocabulary.ts`. The same errors were reproduced against HEAD versions before these changes.
- Settings did not remain open during the development-server fixture run; production-renderer checks passed. The development-only behavior was not diagnosed or changed in this visual task.
- Installed-package/native title-bar checks, real model processing, live generation, video subtitle-mask calibration and owner visual approval are not established by these fixture checks. Existing domain tests remain the evidence for unchanged processing and mask rules.
