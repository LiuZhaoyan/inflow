# Windows Korean Learning Desktop MVP

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../README.md) for remaining work.

Status: ready-for-agent
Confirmation: the owner confirmed the proposed application-operations and Windows acceptance boundary on 2026-09-30.
Updated: 2026-09-30

## Problem Statement

The learner wants to study Korean videos of their own choosing, replay individual sentences and retain unfamiliar words in context. Suitable follow-up reading material is difficult to find: existing articles rarely use the exact vocabulary the learner wants to practice while keeping other words common. The current browser prototype can transcribe and replay media but loses its working state when reopened and has no vocabulary-to-passage learning loop.

The learner needs an installable Windows application for personal use that retains their material and turns collected vocabulary into reusable reading material.

## Solution

Provide a Windows-first desktop application with two connected learning paths. Source media supports sentence-by-sentence intensive listening and vocabulary collection. Selected vocabulary produces one short Korean generated passage, optionally guided by a topic, using every selected contextual meaning and common supporting vocabulary. Normal Korean inflection is allowed.

Save each generated passage as a learning artifact with target-vocabulary highlighting and a Chinese translation revealed on demand. The learner can collect further vocabulary from that artifact and generate another passage. Initial artifacts are text-only. Source media, processing results, vocabulary and artifacts remain available after restarting the application.

## User Stories

1. As the learner, I want to install and launch Inflow on Windows, so that I can use it without running a development server.
2. As the learner, I want the installed application to include its processing runtime and clearly explain any initial model download, so that I do not need to install system Python manually.
3. As the learner, I want to choose Korean video or currently supported audio from my computer, so that I can study material I care about.
4. As the learner, I want imported media retained in the application library, so that moving the original download does not interrupt later learning.
5. As the learner, I want automatic transcript text and sentence timings without a subtitle file, so that I can begin intensive listening without preparing a course.
6. As the learner, I want visible processing status and a way to cancel or retry, so that a long-running or failed transcription does not leave me stuck.
7. As the learner, I want to play the original media when transcription fails, so that an automatic-processing problem does not remove access to my material.
8. As the learner, I want to know that automatic transcript text may contain errors, so that I can treat it as learning assistance rather than an answer key.
9. As the learner, I want full-media playback and seeking, so that I can first listen in context and return to a section.
10. As the learner, I want previous/next sentence controls and current-sentence looping, so that I can repeat difficult speech.
11. As the learner, I want adjustable playback speed, so that I can listen at a useful pace.
12. As the learner, I want to choose which system-defined meaning groups to mask, so that I can practise selected parts of a sentence.
13. As the learner, I want full source text and word collection outside mask mode, with saved masks applied when I re-enter the mode, so that I can alternate reading and listening practice.
14. As the learner, I want current-sentence Chinese translation independently of masking, so that I can check meaning when necessary.
15. As the learner, I want to reopen processed media without repeating transcription, so that earlier processing time is not wasted.
16. As the learner, I want my learning position and playback preferences restored, so that I can continue where I left off.
17. As the learner, I want to collect a word from a media sentence, so that its encountered surface form, original sentence and source remain available.
18. As the learner, I want to enter or correct the Korean dictionary form and contextual Chinese meaning before saving a vocabulary entry, so that future practice uses the intended word and sense.
19. As the learner, I want to add vocabulary manually, so that the notebook can include words outside my imported media.
20. As the learner, I want distinct contextual meanings of the same dictionary form preserved, so that collecting another sense does not silently replace an earlier one.
21. As the learner, I want to see my saved vocabulary and select target vocabulary, so that I can choose what the next passage practices.
22. As the learner, I want word selection alone to be enough for generation, so that preparing a passage requires little setup.
23. As the learner, I want to supply an optional topic, so that I can guide the passage when I have a subject in mind.
24. As the learner, I want one short passage per selection with no required difficulty level or passage-length setting, so that generation follows the simple agreed learning rule.
25. As the learner, I want all selected target words used in their recorded meanings, including natural Korean inflection, so that every chosen word receives relevant practice.
26. As the learner, I want non-target vocabulary to be common and everyday, so that practicing my chosen words does not create unnecessary vocabulary overhead.
27. As the learner, I want the completed passage saved as a learning artifact, so that I can revisit it without generating it again.
28. As the learner, I want target-word occurrences highlighted in the Korean text, so that I can recognize their contextual and inflected uses.
29. As the learner, I want an artifact's Chinese translation hidden initially and available on demand, so that I can read Korean first and check understanding when needed.
30. As the learner, I want to collect unfamiliar words from an artifact with their original sentence and artifact source, so that generated material can feed the vocabulary notebook.
31. As the learner, I want to generate another passage from those collected words, so that I can repeat the learning cycle.
32. As the learner, I want saved artifacts to remain readable without another API call, so that reopening material does not require payment or connectivity.
33. As the learner, I want a later vocabulary correction to leave an older artifact's original target meanings intact, so that its creation context stays understandable.
34. As the learner, I want to configure my own generation API key, so that I can use the service under my own account.
35. As the learner, I want generation failures or incomplete results to leave saved work intact and offer a clear retry, so that failure does not destroy my learning material.
36. As the learner, I want a missing media file reported while its transcript and vocabulary are preserved, so that I can re-associate the file and continue.
37. As the learner, I want source media, vocabulary and artifacts restored after closing and reopening the application, so that learning remains continuous.

## Implementation Decisions

- Use Electron as the Windows desktop host. Reuse the existing React learning interface and Next as a static build tool. Move the current POST transcription and translation behavior into narrow desktop operations; the packaged application does not run a Next HTTP server.
- Keep one application operations interface between the renderer and desktop host. Its behavior covers media import/transcription, learning restoration, vocabulary saving and artifact generation/retrieval. Identifiers refer to managed records; the renderer does not receive unrestricted filesystem, SQL or shell access.
- Preserve playback-segment validation and meaning-group integrity. Source text starts visible; Set masks toggles a mode where clicking whole groups immediately hides or shows them, separate from native word selection. Persist masks per saved sentence in the existing learning JSON. Exiting mask mode or changing sentences shows the full source text and enables native word selection. Saved choices apply on re-entering mask mode; changing sentences also hides translation. Successful retranscription clears masks; failures retain them.
- Start with the existing faster-whisper base CPU/int8 transcription and Korean meaning-group processing as the baseline. Validate speed, accuracy and sentence timings on representative Windows media before treating it as the accepted final path. Current local sentence translation remains the initial baseline. An online transcription replacement requires comparative evidence; multiple transcription backends are not part of the first build.
- Package the Python worker for Windows, initially using PyInstaller one-folder mode, with explicit model and resource locations. First validate in an isolated Windows Python 3.12 environment. Preserve cancellable child-process lifecycle and JSON communication; installed use must not depend on repository paths, a developer virtual environment or system Python.
- Use native media selection and managed file copies. Store large media and model files separately from learning records and installed executable resources. Serve managed media to the existing native player; codec decoding, seeking and sentence loops require packaged Windows verification.
- Store learning records in SQLite owned by the desktop host. Prefer builtin Node SQLite in the selected supported Electron runtime, one connection, direct SQL and transactions. Runtime import/persistence compatibility is a gate; no ORM, database server or parallel driver infrastructure is required.
- Represent source media, playback segments, vocabulary entries, source occurrences, learning artifacts and artifact targets with stable IDs. Keep a vocabulary entry's dictionary form and contextual meaning separate from its source occurrences; manual additions may lack a source occurrence.
- Persist source sentence text and encountered surface form with each collected occurrence. An occurrence references either its source playback segment or its learning artifact. Distinct word meanings must not be collapsed solely by matching dictionary-form spelling.
- Persist an artifact's Korean text, Chinese translation, highlight data, optional topic and generation metadata. Artifact targets retain snapshots of the dictionary forms and contextual meanings supplied for that generation. Saving an artifact and its targets is atomic; changing the notebook does not rewrite saved artifacts.
- Use one text-generation provider for the first implementation. DeepSeek Flash Responses is the researched default candidate; access and Korean quality must pass evaluation before it is accepted. If the owner's existing usable account or evaluation evidence favors another provider, select that single provider before integrating it. Free availability is an account/service condition, not an application guarantee.
- Send selected vocabulary IDs, dictionary forms, contextual Chinese meanings, necessary source sentences and optional topic to the generation provider. Do not upload the video for passage generation. Request one short passage, all selected meanings, normal inflection and common supporting vocabulary.
- Request structured output containing Korean sentence text parts, selected vocabulary IDs for target occurrences, and Chinese sentence translations. Validate nonempty text, known target IDs, full requested-ID coverage and well-formed highlights. An annotation claiming a target ID is not proof of the correct lemma or meaning; semantic acceptance requires representative review.
- Render generated content as text. Keep the API key and requests in the desktop host; store the credential separately from learning records using Windows-backed credential encryption. Saved artifacts and logs contain no API credentials.
- Preserve existing saved material when processing/generation fails. A retry produces a new result rather than overwriting an existing artifact. API authentication errors, quota failures, malformed responses and incomplete output must be actionable without presenting an invalid result as complete.
- Persist committed learning changes as they occur rather than relying only on a shutdown callback. Reopening restores processing results, learning position, playback preferences, vocabulary, artifacts and source relationships.
- Retain the prototype's 50 MB and 10-minute processing limits initially while establishing Windows feasibility. These are baseline implementation limits, not desktop-platform limits. Expanding them needs resource evidence and a separately scoped change.

## Testing Decisions

- The proposed highest testing seam is the application operations interface used by the learning UI. Tests exercise an observable action and then read the resulting material or reopened state; they do not inspect private helpers, table layouts or implementation call counts.
- Reuse existing Node/TypeScript test conventions and the processing-result and learning-state test surfaces. Preserve checks for ordered/nonoverlapping times, complete text/group reconstruction, valid mask indices and mask restoration.
- At the operations seam, test import/save/reopen, source-linked vocabulary collection, distinct contextual meanings, artifact generation from selected entries, and a second vocabulary collection/generation cycle. Use a real temporary SQLite database and managed files when checking persistence, with deterministic substitutes only for external model/API results.
- Test that incomplete processing, unknown target IDs, missing targets, malformed generation, credential/quota failures and canceled work do not replace saved material or create a complete-looking partial artifact.
- Verify that normal inflected target occurrences can be highlighted and that selected entry IDs remain connected to saved target snapshots. Lexical/structural checks do not count as proof of semantic correctness.
- Review real Korean generations for genuine all-target coverage, intended word meanings, natural inflection, common supporting vocabulary and faithful Chinese translation. Use the prepared cases of everyday words, inflected verbs/adjectives, ambiguous words with a specified sense and an unrelated-word selection. Record latency, usage and failures. Do not claim a fixed semantic pass rate before this evaluation.
- Windows acceptance uses the installed application and a real Korean video without subtitles. Verify usable transcription waiting time, transcript correspondence, complete playback boundaries, full/segment playback, speed/loop/reveal/translation, collection and generation, and restoration after restart.
- Verify managed-copy playback after moving the original file, missing-managed-file recovery, Chinese/spaced paths, worker operation without system Python, cancellation and clean shutdown. A successful audio transcription does not establish video-decoder or seeking compatibility.
- Completion requires the full owner-visible loop: source media → intensive listening → vocabulary → text-only artifact → further vocabulary → another artifact → restart and reopen. Automated checks and human/Windows evidence must be reported separately.
- Run checks appropriate to each future implementation change. Writing this specification does not execute the test suite, build or live model calls.

## Out of Scope

- Generated audio, TTS, generated video or timed playback for learning artifacts.
- Difficulty-level selection, a passage-length control, automatic learner-level estimation, mastery scoring, dictated-answer submission or grading.
- Accounts, cloud synchronization, a content marketplace, official large-scale course hosting or an application-operated model subscription.
- Multiple generation/transcription providers, automatic provider failover, retrieval pipelines, embeddings or a second model that grades every result.
- macOS/Linux installers, a mobile-native app or PWA as first-release deliverables.
- Professional subtitle editing, generated-article editing, arbitrary media transcoding and a promise to play every codec/container.
- The older roadmap's A–B looping, revisit-mark/notes workflows and current-segment transcript/timing editor as additional first-release requirements. They remain separate possible improvements rather than prerequisites for the confirmed vocabulary-to-text loop.
- Public distribution infrastructure, automatic updates and a new backup/export interface. Durable local storage and Windows personal installation remain in scope.

## Further Notes

- The owner confirmed shared understanding on 2026-09-30. The initial generated-audio idea was subsequently narrowed to text-only generation, and that correction governs this specification.
- Product behavior is summarized in [the product specification](../../../docs/PRODUCT_SPEC.md); delivery sequencing is in [the roadmap](../../../docs/ROADMAP.md). [The domain glossary](../../../CONTEXT.md) defines vocabulary used here.
- [Technical research](technical-recommendation.md) contains the source evidence and trade-offs; [generation research](generation-api-research.md) describes the candidate contract and semantic evaluation; [storage research](storage-research.md) outlines record relationships.
- Windows Node and Miniconda Python were found during read-only investigation. Native worker feasibility, packaged SQLite behavior, codec/seek quality and generation account/semantic quality remain unverified. These are implementation evidence gates, not completed delivery claims.
- The existing listening prototype and Linux/WSL backend evidence are reusable starting points. No application implementation, dependency installation, live API call or Windows build was performed in the requirements/specification phase.
