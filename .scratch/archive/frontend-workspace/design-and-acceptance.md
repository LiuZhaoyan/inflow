# Frontend workspace: design and acceptance (historical)

Implemented and locally verified 2026-10-01–02. Current behavior is documented in [Project Status](../../../docs/PROJECT_STATUS.md).

The desktop UI introduced a dark, media-centered listening workspace, Context/Library surfaces, then Story reading and Vocabulary master/detail views. It reused the existing Electron bridge, host-owned SQLite, vocabulary provenance and generation pipeline rather than rewriting backend processing. The original Story/Vocabulary reference screenshots guided the dark palette, purple accents and compact navigation; exact visual fidelity remained pending owner review at the time.

## Interaction decisions

- Keep media, Story and Vocabulary subtrees mounted so tab switches preserve playback state and unsaved drafts.
- Open media provenance paused at the source sentence position; open Story provenance at its sentence index.
- Keep vocabulary selection separate from generation; show saved target snapshots and translations without regenerating.
- Protect edited vocabulary drafts from navigation or replacement; allow unedited drafts to close.
- The initial interface showed pronunciation, Add context, Dictionary and Notes as placeholders, not delivered business features. Those historical deferrals are not claims about current behavior.
- Early staging temporarily hid Story; the later Story/Vocabulary phase superseded that intermediate plan.

## Acceptance boundary

At the time, host and Python tests, typecheck, lint, renderer and desktop builds, browser playback/interaction and native workflow fixtures passed. Coverage included media import/processing and retry/cancel, playback and sentence position, Context seeking, vocabulary draft guards, Library opening, retained learning state and Story/Vocabulary source navigation. Automated verification did not constitute owner visual approval; the original acceptance reports explicitly left visual review pending.

Original detailed phase specs, browser test logs and screenshot notes were retired during documentation consolidation. Consult source and current docs before treating historical UI constraints as active requirements.
