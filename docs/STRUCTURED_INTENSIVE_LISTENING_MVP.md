# Structured Intensive Listening MVP

> Historical document: this file records the superseded design for a preloaded Korean course, dictation and review MVP. It does not define the current subtitle-free media intensive-listening task or its completion status. See [PRODUCT_SPEC.md](PRODUCT_SPEC.md) for the current product specification, [ROADMAP.md](ROADMAP.md) for the implementation roadmap and [INTENSIVE_LISTENING_TASK.md](INTENSIVE_LISTENING_TASK.md) for the current task.

## Product positioning

Inflow targets beginner learners who know the target language's writing system and basic pronunciation but still struggle to understand authentic content.

The product turns intensive listening into sustainable self-study through segmented dictation, progressive hints, deeper analysis and weak-area review without requiring a human teacher.

The first version focuses on Korean. A complete piece of material is treated as one learning project, ideally 1–3 minutes long and divided into 3–15 second sentences or meaning groups for practice.

## Learning flow

1. **Blind full-length listening:** play the material without showing text and record a subjective understanding level.
2. **Segmented dictation:** loop and change the speed of a segment, enter the dictated text and compare it with the reference transcript for correct, missing and uncertain content.
3. **Progressive hints:** when the learner is stuck, progressively reveal word counts, partial characters and the complete source text to avoid revealing the answer too early.
4. **Deep analysis:** the learner looks up vocabulary, analyzes grammar and understands the sentence; the platform provides dictionary entry points, notes and progressively displayed source text and translation.
5. **Completion confirmation:** after working through dictation and understanding, the learner practices full-text memorization, shadowing and repetition at natural speed.
6. **Weak-area review:** the system schedules weak segments for later practice based on errors, replay counts and hint usage.

## Mastery signals

- Dictation accuracy
- Replay count
- Hint levels used
- Learner-marked understanding level
- Whether dictation is correct again during delayed review

Subjective marks and system measurements jointly determine learning state; clicking an understanding button alone must not increase difficulty.

## MVP boundaries

- The system does not evaluate memorization, intonation or repetition quality. It provides the complete material, source text and playback controls.
- The core learning flow does not depend on an LLM. LLMs are reserved for later on-demand explanations and other enhancements.
- The product does not promise mastery of a language after a fixed number of materials.
- Material provenance, copyright and user-upload flows require separate design.
