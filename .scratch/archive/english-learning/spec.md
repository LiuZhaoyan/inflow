# English Learning Support

Archived: 2026-10-06. Historical delivery record; see [the task index](../../README.md) for remaining work.

Status: complete
Updated: 2026-10-03
Requirement basis: the owner confirmed English as an additional learning language and the decisions below during the design interview. The application-operations, real-worker and native Electron verification boundary was explicitly confirmed on 2026-10-03.
Implementation state: specified, not implemented or runtime-verified by this document.

## Problem Statement

The learner can use Inflow's complete listening and vocabulary-to-reading cycle for Korean, but cannot use the same application to study English. Import, transcription, dictionary-form lookup, translation and generation currently assume Korean, even though saved media and vocabulary already carry source-language identity.

The learner wants to import English audio or video, practice it sentence by sentence, collect unfamiliar English words with contextual Chinese meanings, and generate English reading passages that reuse those meanings. English and Korean learning material must coexist without confusing word identities, generation language or historical context.

## Solution

Extend the existing Windows desktop learning loop to English:

```text
English media → Listening → English vocabulary → English learning artifact → Vocabulary
```

Keep Chinese sentence translations and contextual meanings. Use local English transcription, sentence and grammatical analysis, dictionary-form suggestions and offline English–Chinese candidates. Cloud translation, contextual glosses and passage generation remain explicit learner actions through the existing host-owned provider credential.

The learner confirms each imported material's language. Media, vocabulary and saved reading material share the existing application, with independent All/Korean/English filters. A generated passage uses target vocabulary from exactly one source language. Preserve existing Korean data and behavior throughout the extension.

## User Stories

1. As the learner, I want to import English audio or video through the existing desktop workflow, so that I can study material of my choosing.
2. As the learner, I want to confirm English or Korean before an import is saved, so that processing uses the intended source language.
3. As the learner, I want the last confirmed import language offered as the next default, so that repeated imports require less setup.
4. As the learner, I want canceling import to leave my library unchanged, so that an abandoned choice creates no material.
5. As the learner, I want to reimport material with the correct language when I selected the wrong one, so that I can recover without changing existing saved context.
6. As the learner, I want English imports to retain the existing managed-copy behavior and media limits, so that moving an original file does not break my learning material.
7. As the learner, I want an English transcript without supplying subtitles, so that I can begin intensive listening directly from media.
8. As the learner, I want playable English sentence ranges, so that previous/next navigation and sentence looping follow the spoken material.
9. As the learner, I want English meaning groups based on grammatical phrases or clauses, so that masking supports useful listening practice.
10. As the learner, I want sentence groups to cover the complete sentence in order and preserve whole words, so that masking does not lose text or split contractions and hyphenated words.
11. As the learner, I want English full playback, seeking, speed and sentence looping to use the existing controls, so that I can use familiar learning interactions.
12. As the learner, I want my English mask choices and playback state saved, so that I can resume after reopening the application.
13. As the learner, I want full source text and word collection outside mask mode, so that listening practice and vocabulary collection remain distinct actions.
14. As the learner, I want Chinese translation hidden on sentence changes and shown only when requested, so that playback does not trigger cloud requests.
15. As the learner, I want contextual English-to-Chinese translation on explicit request, so that I can check the current sentence's meaning.
16. As the learner, I want successful translations reused after revisiting or restart, so that repeated reading does not require another provider request.
17. As the learner, I want a failed or canceled translation refresh to retain the previous successful result, so that temporary failure does not remove useful work.
18. As the learner, I want an explicitly chosen local English-to-Chinese reference translation after cloud failure, so that offline assistance remains available without silent fallback.
19. As the learner, I want to collect one complete English word from visible Listen or Story text, so that its surface form, sentence and source stay connected.
20. As the learner, I want contractions and hyphenated forms treated as whole selected words, so that selecting `don't` or `well-known` does not collect only one internal token.
21. As the learner, I want partial-word, hidden-text, cross-sentence and whitespace-containing phrase selections rejected with guidance, so that collection follows the agreed single-word boundary.
22. As the learner, I want contextual dictionary-form suggestions such as `running → run` and `children → child`, so that ordinary inflections do not create unnecessary separate entries.
23. As the learner, I want ordinary dictionary forms suggested in lowercase and proper names with their appropriate spelling, so that sentence capitalization does not automatically determine vocabulary identity.
24. As the learner, I want contractions such as `don't`, `can't` and `I'm` retained as complete forms, so that normalization does not discard their meaning.
25. As the learner, I want possessives such as `teacher's` suggested as `teacher` and hyphenated forms retained, so that dictionary-form suggestions respect the agreed word types.
26. As the learner, I want curly and straight apostrophes normalized consistently in dictionary forms while preserving the encountered text, so that typographic differences do not fragment the same entry.
27. As the learner, I want to correct any dictionary-form suggestion before saving, so that uncertain analysis does not decide my vocabulary for me.
28. As the learner, I want offline English–Chinese sense candidates, so that ordinary word lookup requires no network or provider credential.
29. As the learner, I want to choose among multiple candidate meanings and edit the contextual Chinese meaning, so that the saved entry reflects this occurrence.
30. As the learner, I want missing dictionary entries and failed analysis to permit manual entry, so that lookup coverage does not prevent collection.
31. As the learner, I want cloud gloss lookup only when I explicitly request it, so that selecting a word alone remains local.
32. As the learner, I want pending lookup results to respect newer selections and edits, so that a delayed suggestion cannot overwrite my work.
33. As the learner, I want an edited collection draft protected during navigation and retained after saving failure, so that I can save, discard or retry deliberately.
34. As the learner, I want manual vocabulary additions to include a confirmed source language, so that English and Korean entries have an unambiguous identity.
35. As the learner, I want repeated encounters with the same language, dictionary form and meaning to reuse an entry, so that contexts accumulate without duplicate senses.
36. As the learner, I want different senses and different source languages kept distinct, so that matching spellings do not collapse unrelated entries.
37. As the learner, I want media, vocabulary and reading lists to identify their source language, so that mixed libraries remain understandable.
38. As the learner, I want each list to offer All/Korean/English filtering independently and start with All, so that filtering one view does not unexpectedly filter another.
39. As the learner, I want filtering to leave saved target selections unchanged, so that hidden entries are not silently deselected.
40. As the learner, I want one English passage generated from my selected English vocabulary, so that the notebook feeds relevant English reading practice.
41. As the learner, I want generation language determined by the full selected target set, so that a view filter cannot silently change what the passage practices.
42. As the learner, I want mixed English/Korean selections rejected with guidance and all selections preserved, so that I can correct the selection without losing it.
43. As the learner, I want every selected target used naturally in its recorded contextual meaning, including ordinary English inflection, so that generation practices the intended vocabulary.
44. As the learner, I want one short passage with common supporting vocabulary and an optional topic, so that generation retains the existing simple workflow.
45. As the learner, I want English target occurrences highlighted and Chinese sentence translations saved, so that I can review the passage and its intended meanings.
46. As the learner, I want an English artifact's language and target-meaning snapshot retained, so that later notebook edits do not rewrite its creation context.
47. As the learner, I want to collect another English word from a generated artifact and generate again, so that the English learning loop is complete.
48. As the learner, I want saved English artifacts readable offline without regeneration, so that reopening them requires no provider call.
49. As the learner, I want generation failures to preserve existing artifacts, entries and selection, so that retry cannot destroy earlier learning material.
50. As the learner, I want successful retranscription to clear that material's old masks and vocabulary sources while retaining the entries themselves, so that provenance follows the replacement transcript.
51. As the learner, I want failed or canceled retranscription to preserve the previous transcript, masks and vocabulary sources, so that incomplete processing does not discard valid learning data.
52. As the learner, I want existing Korean material, IDs, meanings, sources and target snapshots preserved, so that adding English does not reset my earlier work.
53. As the learner, I want English resources prepared through the existing setup workflow and processing to remain offline at runtime, so that normal local operations do not download resources or upload media.
54. As the learner, I want missing-resource errors to explain preparation and allow retry while preserving saved work, so that an incomplete setup does not appear as successful analysis.
55. As the learner, I want automatic transcription, word analysis and grouping treated as assistance, so that I can judge errors rather than treating model output as an answer key.

## Implementation Decisions

- Extend the existing source-language contract to Korean and English across the renderer bridge, host operations, worker requests, translation/gloss adapters and generation. Keep processing and persistence host-owned; reuse existing operations rather than introducing a second English subsystem.
- Native import requires explicit language confirmation and remembers the last confirmed choice as its default. Persist one source language per material. Automatic detection and a language-edit/retranscription workflow are not part of this change; a mistaken choice is corrected by reimporting.
- Preserve supported media formats, the 50 MB and 10-minute import limits, managed-copy ownership, automatic processing after valid import, cancellation and manual retry.
- Reuse the existing multilingual Whisper model, passing the material's confirmed language. Keep Korean analysis on Kiwi. Add a local spaCy English pipeline for sentence boundaries, contextual part-of-speech analysis, lemmatization and grammatical structure.
- Use toolkit sentence boundaries directly. English mask grouping adds only the application rules needed to turn grammatical analysis into ordered, nonoverlapping groups covering the sentence under the existing text/group integrity contract. Prefer intact phrases or clauses and larger groups when boundaries are ambiguous. Preserve contractions and hyphenated words as masking units. Do not equate spaCy noun chunks with a complete sentence partition.
- Preserve sentence-level timing and storage. ASR word timings remain intermediate data; introducing persisted word alignment is unnecessary for this feature.
- Map selected original-text spans to complete English words even when the NLP tokenizer emits several tokens. Validate original UTF-16 selection positions at the existing host boundary. Do not blindly use a single token's lemma for contractions or hyphenated forms.
- English lookup suggests lowercase contextual dictionary forms for ordinary words and appropriate case for proper names. Preserve complete contractions, remove possessive endings when suggesting the underlying word, and retain hyphenated forms. Normalize curly/straight apostrophes in dictionary forms while storing the original surface unchanged. These are editable suggestions, not an automatic sense or mastery decision.
- Keep vocabulary identity as source language plus confirmed dictionary form plus contextual Chinese meaning. Preserve existing same-occurrence reuse, distinct senses, manual additions and media/artifact provenance rules. Do not renormalize existing Korean entries or historical target snapshots.
- Bundle an English–Chinese dictionary resource alongside the existing Korean dictionary. Prefer evaluating WikDict/FreeDict data with documented source and distribution terms; pin the chosen artifact and record its origin, license, version/checksum and any transformations. Check usable Chinese candidates and representative single-word coverage before treating the resource as ready. Dictionary code and dictionary data retain their separate licenses.
- Reuse the existing candidate-selection and manual-entry behavior. One available sense may fill automatically; multiple senses require learner choice. Missing entries permit manual input or explicit cloud lookup. Word selection itself makes no cloud request and uncollected results are not persisted.
- Generalize explicit cloud sentence translation and contextual gloss prompts to the confirmed source language while keeping output in Chinese. Reuse the existing credential, task-specific provider settings, bounded requests, cancellation and stale-result protection. Source language is part of translation cache input together with the source sentence and neighboring context.
- English local reference translation uses the existing English-to-Chinese model directly. Preserve Korean's existing pivot path. Local reference translation remains an explicit choice after cloud failure; failed refresh or canceled work does not overwrite the latest successful translation.
- Add source-language labels and independent All/Korean/English filters to media, vocabulary and saved reading lists. Each starts with All. Filtering changes visible results only, not selected target flags or stored material. Filter-preference persistence is not a new requirement.
- Generation resolves the complete selected target set through the host and requires exactly one source language before contacting the provider. Do not silently drop filtered-out targets, clear another language's selections or split one request into two passages. Preserve the existing 1–20 target bound, optional topic and explicit generation action.
- Generate one short passage in the target language, requiring every selected contextual meaning, natural inflection and common supporting vocabulary. Validate structure, known IDs, requested-ID coverage and valid target annotations. Structural coverage is not proof of the correct English word sense or naturalness.
- Save artifact source language, text, Chinese sentence translations, target occurrences and immutable target-meaning snapshots using the existing artifact contract. Reopening Story uses stored translations and permits source-linked English collection without regeneration.
- Existing records without language metadata remain Korean. Preserve existing IDs, selected flags, contexts, saved learning state, translation data and artifact snapshots. Use the existing language-bearing storage rather than creating separate libraries or replacing the database.
- Preserve atomic retranscription replacement: remove all old transcript source contexts and masks for that material only on success; retain vocabulary entries, meanings, selection and unrelated sources. Failure/cancellation retains the previous transcript and contexts.
- Extend the existing preparation scripts to install compatible English analysis dependencies and a pinned local model. Runtime local operations load prepared resources only. Missing resources produce setup/retry guidance, with no automatic cloud substitution or runtime download. Dictionary resources accompany the application build with their notices.
- This extension targets the currently runnable source-checkout desktop application. Worker packaging and clean-machine Windows installation remain separate delivery work; English implementation must not depend on completing those milestones.

## Testing Decisions

- The owner confirmed the highest existing behavioral seam: DesktopBridge application actions backed by DesktopOperations. Prefer tests that perform an action and read the resulting material, notebook or reopened state. Assert observable outcomes and preservation, not private helper calls, SQL layouts or NLP component configuration.
- Reuse existing Node/TypeScript operations tests with real temporary SQLite and managed files. Prior art includes media restoration, vocabulary source validation and deduplication, translation caching, failed-refresh preservation, artifact target snapshots and legacy migration/restart coverage.
- Through application operations, verify confirmed language persistence, English/Korean coexistence, manual English entries, source-language identity, same-sense reuse, lookup/save behavior, same-language generation and mixed-selection rejection without selection changes or provider access.
- Verify translation language/context cache isolation, offline reuse, explicit refresh/local fallback and preservation after failure/cancellation. Exercise cloud-gloss stale selection, protected edits and explicit suggestion application through existing public behavior.
- Verify English artifacts use English targets and Chinese translations, retain target snapshots after notebook corrections, permit another collection/generation cycle and reopen without network access. Confirm filtered-out selections remain in the selected set and cannot be silently omitted from generation.
- Add focused real Python-worker coverage for English sentence and group integrity, playable timings, contextual inflections, proper-name/ordinary capitalization, complete contractions, possessives, hyphenated words and apostrophe normalization. Prefer the public worker interface and representative sentence examples over tests mirroring boundary rules.
- Verify the chosen dictionary artifact's loading, provenance notices and usable candidates for representative common and irregular words. Record coverage gaps honestly; a missing entry must still permit manual collection. Preparation success, dependency compatibility and model availability need observed evidence, not only metadata from upstream documentation.
- Use isolated native Electron acceptance with real IPC, SQLite and prepared local English analysis/dictionary resources. Exercise import-language default/confirmation, all three independent filters, full/sentence playback, whole-group masks, native word selection, protected drafts, target selection, Story collection and restart restoration.
- Deterministic provider fixtures may establish request routing, validation and failure behavior without contacting a paid service. Label them as fixtures. Separately review representative real English transcription/grouping and English generations for correct target meanings, natural inflection, common supporting vocabulary and faithful Chinese translation. Existing Korean semantic acceptance does not establish English quality.
- Run the existing Korean regression coverage, including legacy-language defaults and successful retranscription context removal. Report automated checks, actual worker/model results, live provider quality and native UI acceptance separately.
- Completion requires English media → intensive listening → collected vocabulary → English artifact → further vocabulary → another artifact → restart/reopen, while existing Korean material remains usable. Unavailable runtime, provider or quality evidence must remain explicitly unverified.
- Run checks appropriate to future implementation changes. Authoring this specification does not run the application test suite, install dependencies, download models or make provider requests.

## Out of Scope

- English interface localization; Chinese meanings and translations remain the learning support language.
- Reliable handling of frequent English/Chinese/Korean code-switching. The supported scenario is predominantly English media; incidental foreign words do not prohibit import.
- Whitespace-containing phrases, phrasal-verb entries and grammatical-construction vocabulary entries.
- Automatic contextual sense selection, inferred mastery, scoring or dictated-answer grading.
- Mixed-language generated passages, automatic selection clearing, automatic splitting into separate language requests, and an application-wide language mode.
- A workflow for editing an imported material's language, automatic language detection and a new transcript/timing editor.
- Runtime resource download UI, a new Windows installer, packaged-worker redesign or additional platform packages.
- Generated audio/TTS, difficulty/length controls, additional providers, automatic failover, accounts and synchronization.

## Further Notes

- Implementation and acceptance are tracked in [the acceptance record](acceptance.md). [Project Status](../../../docs/PROJECT_STATUS.md) records current availability; [Product Specification](../../../docs/PRODUCT_SPEC.md) records intended behavior; [Roadmap](../../../docs/ROADMAP.md) records future work; [the glossary](../../../CONTEXT.md) defines the domain vocabulary.
- [The task index](../../README.md) separates active work from archived delivery records. Historical frontend restrictions and early Korean model/provider proposals do not override the confirmed behavior above.
- Primary-source research confirms the available [spaCy linguistic features](https://spacy.io/usage/linguistic-features/) and [local pipeline installation/loading](https://spacy.io/usage/models/). Its internal contraction/hyphen tokenization requires the whole-selection mapping described above; application grouping quality still needs evaluation.
- [WikDict](https://www.wikdict.com/page/about) publishes dictionary data under CC BY-SA terms separately from its MIT code. [FreeDict release metadata](https://freedict.org/freedict-database.json) provides a possible pinned English–Chinese artifact. A specific artifact, its notices, Chinese coverage and processing compatibility are implementation validation items, not already established delivery claims.
- The original specification publication changed documentation only. Subsequent implementation and verification are recorded in [acceptance](acceptance.md).
