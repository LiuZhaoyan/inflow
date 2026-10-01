# Desktop text artifact acceptance

Date: 2026-10-01. Ticket: [05](issues/05-text-artifact-learning-cycle.md).

## Delivered behavior

The notebook's selected entries generate one short text-only Korean passage through the accepted DeepSeek Flash Responses adapter. Topic is optional. The host resolves managed vocabulary IDs into dictionary forms, contextual Chinese meanings and source sentences. The renderer sends no media or credentials to the provider and renders all output as text.

The host reads the owner's existing `DEEPSEEK_API_KEY` from the environment or ignored `.env` / `.env.local` on first configuration. It stores encrypted credentials in a separate `deepseek.key` file, outside SQLite. A password field allows replacement; status operations expose only configuration state. Existing encrypted credentials take precedence on restart. Encryption uses Electron [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage), backed by Windows DPAPI. A failed save retains the previous credential; failed decryption requests reconfiguration.

Before saving, the shared validator checks text, translations, known target IDs, full ID coverage and ordered highlight parts. One SQLite JSON record atomically saves all passage sentences, translations, highlights, target snapshots, optional topic, timestamp, latency, model/response identifiers and token usage. A retry creates another artifact. Later notebook corrections do not rewrite the saved target meanings.

The artifact reader highlights annotated occurrences, initially hides Chinese translation and offers saved-artifact selection without inference. Selecting Korean text from a sentence reuses the notebook review form. The host derives and retains the original sentence, artifact ID, sentence index and encountered form. Source links reopen the appropriate artifact. Repeated collection of the same occurrence is deduplicated; media sources and earlier notebook records remain intact.

## Automated and native evidence

- All 20 TypeScript tests passed, including a real SQLite/file operation story spanning media collection, first artifact, further collection, second artifact, historical meanings, retry and restart. The real adapter uses deterministic external responses for authentication, quota, incomplete/malformed output, unknown/missing targets, missing credentials and cancellation. These cases leave saved records intact. Reopening uses a generator that would fail if called.
- Root typecheck, changed-file ESLint and the static desktop build passed. React review covered native controls/labels, derived selection, independent startup reads, effect cleanup and repeated source navigation. No dependency was added.
- The existing native video-collection and notebook-restart interaction also passed with the new media/artifact source union: [regression evidence](generated-samples/desktop-acceptance-7rfcd9/vocabulary-reopen.json).
- The production static renderer, sandboxed preload and SQLite host ran natively in Electron 44.5.1 / Node 24.21.0. The isolated profile copied ticket 04's accepted material and notebook; original acceptance profiles were preserved.
- First live request: `배` / `船` plus `타이완` / `台湾（地名）`, topic `친구와 타이완 여행`; three Korean sentences, 1,864 ms, 394 input / 345 output / 739 total tokens. Both intended nouns appear with ordinary particles; Chinese translations correspond to the displayed trip/boat context.
- Actual reading interaction revealed translation, collected `친구` / `朋友` from the first sentence and retained its full artifact context. Editing the notebook's boat meaning left the first artifact's `船` snapshot unchanged.
- Second live request used the collected friend entry alone, without a topic; one sentence, 1,049 ms, 339 input / 96 output / 435 total tokens. The new artifact has a distinct ID and retains the first artifact's sentence as its target source.
- A separate Electron process restored both artifacts, all four vocabulary entries, target selection and both media/artifact source relationships with identical contents. Provider fetch was disabled while reopening. Translation remained hidden; repeated source navigation returned to the original artifact. The existing 33-sentence video and listening preferences survived.
- Native host verification encrypted a test credential, confirmed that its bytes did not contain the plaintext and decrypted it in a fresh credential instance. The owner credential also restored from its encrypted file. Simulated quota failure and cancellation through the actual UI/IPC preserved both artifacts and notebook records; localized errors cleared on reopening saved material. Final renderer alerts and console errors were empty. Expected rejected IPC operations print their sanitized errors in the development console.

Evidence: [real learning-cycle records](generated-samples/desktop-acceptance-uA3v3w/artifacts.json), [offline restoration and failure checks](generated-samples/desktop-acceptance-uA3v3w/artifacts-reopen.json), [restored reader](generated-samples/desktop-acceptance-uA3v3w/artifacts-reopen.png), [readable samples](generated-samples/desktop-acceptance-uA3v3w/review.md). Generated evidence, databases, media and encrypted credential files remain ignored.

## Verification correction and quality boundary

The first run completed both real requests and wrote its learning-cycle evidence, but hidden-window screenshot capture did not return. The runner now explicitly keeps capture hidden/awake and bounds it to ten seconds. The existing completed profile was reopened and captured without repeating paid requests. `--resume-artifacts` reruns restoration and deterministic failure checks against an existing evidence directory.

The second passage repeats its source sentence. This is the already owner-accepted limitation from ticket 02, not evidence of improved variety or a guaranteed Korean quality rate. Inflected verbs/adjectives and ambiguous senses retain ticket 02's separate reviewed baseline. Structural annotations alone do not establish semantic accuracy. Tickets 06 and 07 still own packaged resources and installed-app acceptance.
