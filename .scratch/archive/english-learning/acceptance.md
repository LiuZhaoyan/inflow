# English Learning Acceptance

Archived: 2026-10-06. Historical delivery record; see [the task index](../../README.md) for remaining work.

Verified: 2026-10-04. Scope: the source-checkout Windows desktop application. Specification: [English Learning Support](spec.md).

## Delivered behavior

English uses the existing media, listening, vocabulary and Story operations. Imports confirm one language and remember the last confirmed choice even after import failure; cancellation does not confirm a choice. Local Whisper receives that language; Korean uses Kiwi and English uses spaCy. Vocabulary retains complete surfaces and source offsets, editable contextual lemmas, Chinese sense candidates and explicit cloud glosses. English translation has a language-bearing cache and direct local reference translation. A full selected target set must use one language before generation; filtering never clears selections. Artifacts retain language, Chinese translations, annotations and immutable target snapshots.

Media, vocabulary and saved-story history each have independent default-All language filters. Manual entries confirm a language. Legacy records still default to Korean; no separate database or library was introduced.

## Automated checks

- `npm test`: 35/35 tests passed, including English operations, two collection/generation cycles, mixed targets without provider access, translation failure/cache/restart, surface validation, Korean migrations, retranscription and provenance regressions.
- Python worker, importer and setup checks: 14/14 passed using the prepared local English pipeline and Korean Kiwi. Cases include contextual inflections, proper names, Unicode/UTF-16 offsets, quoted words, contractions versus possessives, plural possessives, hyphens, apostrophe normalization, sentence timing and complete groups. Public preparation repairs an interrupted extraction and reuses a loadable pipeline without downloading again.
- `npm run typecheck`, `npm run lint` and `npm run desktop:build`: passed.
- Initial sandbox attempts encountered Windows path resolution and temporary-file permissions. The required checks passed after scoped execution outside the sandbox or use of workspace-owned temporary paths. These were execution-environment failures, not accepted failing assertions.

## Resources and actual worker results

The workspace Python environment contains spaCy 3.8.16. The pinned `en_core_web_sm` 3.8.0 wheel is checksum-verified and extracted into `.models/english-parser`; the preparation function recognizes the installed pipeline on repeat. Runtime loading is local. The bundled FreeDict/WikDict English-Chinese snapshot contains 19,745 headwords. [Dictionary notices](../../../resources/dictionaries/NOTICE.md) and the included data license record its pinned revision, source hash and transformations. The source archive and downloaded models remain ignored and outside committed runtime resources.

Actual English local reference translation of `Good morning. The train leaves at nine.` returned `早上好 火车9点出发`. Korean `안녕하세요.` returned `哈罗。` through the retained pivot path. These outputs establish execution, not broad translation quality.

The ASR fixture was generated offline through Windows SAPI from `After school, the children met their friends. They don't want to run home.` It is synthetic speech, not a real-speaker benchmark or a product TTS feature. Real Whisper recovered both sentences, with playable times. The first groups were `After school, the children` and `met their friends.`; the second retained `don't` and attached terminal punctuation to its preceding phrase. spaCy returned `children → child`. Grouping is grammatical assistance and may produce larger or shorter phrases than a learner would choose.

## Native Electron acceptance

The repeatable harness is [verify.cjs](../../english-learning/verify.cjs); run it after `npm run desktop:build` with `node .scratch/english-learning/verify.cjs <English-speech.wav>`. The provided audio must contain the fixture sentence above. It creates an isolated profile and launches two native Electron processes; it does not use the owner's learning database.

The final run passed:

- Real Korean Kiwi/dictionary lookup on the preserved Korean material, then English native import confirmation, automatic real ASR and remembered default; cancellation creates no material, and a failed import still remembers its confirmed language.
- Actual sentence playback, full/sentence mode changes, whole-group masks and native mouse-drag English collection with real local lookup and no cloud request.
- Protected edited draft, partial-word rejection, source-linked saving and manual English entry with language confirmation.
- Default-All filters, independent English/Korean filtering of media, notebook and saved stories, including hidden selected targets preserved and mixed generation rejected before provider access.
- English media → collected `child` → English Story → collected `well-known` → second English Story. All translations, annotations and source relationships persisted.
- A second Electron process reopened English and Korean state without provider calls; filters restarted at All and the import default remained English.

The provider in this native UI run is a deterministic fixture. Its generated sentences prove routing, saving and interactions, not language quality. Final ignored evidence: [result](../../desktop-learning/generated-samples/english-native-MNHRQw/result.json), [restart](../../desktop-learning/generated-samples/english-native-MNHRQw/restart.json), [transcript](../../desktop-learning/generated-samples/english-native-MNHRQw/transcript.json) and [screenshot](../../desktop-learning/generated-samples/english-native-MNHRQw/story.png).

## Live generation quality and limits

[The separate live report](quality-report.md) records three successful English generations and one structurally rejected response through the existing provider. The reviewed passages used supplied riverbank/business senses, complete contractions and hyphens, common supporting words and mostly faithful Chinese translations. Regular `run → runs` was observed. A plural/past topic cue was ignored, so generated irregular/plural forms remain unverified. Structural validation cannot establish correct word senses or naturalness for arbitrary passages.

Broader real-speaker audio, accents, dictionary coverage, irregular generated forms and cloud translation/gloss quality still need linguistic review. Owner visual/product acceptance and packaged-worker/clean-machine installation remain separate milestones.

## Review

The two-axis review compared the implementation with owner-confirmed baseline `9c15719a37fe079ba51deb47b1af83228cc6674d`, reviewing snapshot `9070d8c` and focused corrections. It found no hard standards violations. Four spec deviations were corrected with focused regressions included in the final checks and native run:

- Copula contractions such as `mom's` in `My mom's home.` remain complete, while actual possessives suggest the underlying noun.
- Plural possessives such as `teachers'` retain the complete selected surface and original offsets across lookup, saving and Story selection.
- Import confirmation persists the last language choice before validation; failed imports retain it, while cancellation and invalid values do not replace it.
- Preparation validates actual spaCy loading, repairs incomplete pipelines and reuses ready resources without repeat downloads.

The final integration also preserves decomposed English surface text and original offsets while normalizing lemma identity. No review finding remained unresolved; ambiguous parsing still permits manual lemma corrections. Repeated two-language label expressions were retained as a low-priority observation without a current behavioral consequence.
