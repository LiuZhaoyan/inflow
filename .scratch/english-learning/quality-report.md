# English Generation Semantic Quality Check

## Method

On 2026-10-04, three live requests through `generatePassage` using the existing DeepSeek credential and the `deepseek-flash` model returned completed passages and passed the adapter's structural validation. A fourth, inflection-focused response was rejected by the adapter as malformed. No credential was written to the script, report, or saved evidence. The first attempt from the restricted network sandbox received no provider response; the usable responses came from the scoped network requests.

The original nonsecret inputs and results are in [english-quality-2026-10-04T10-26-11-246Z.json](../desktop-learning/generated-samples/english-quality-2026-10-04T10-26-11-246Z.json). The malformed follow-up is in [english-quality-2026-10-04T10-30-57-601Z.json](../desktop-learning/generated-samples/english-quality-2026-10-04T10-30-57-601Z.json), and the final bounded retry is in [english-quality-2026-10-04T10-32-38-257Z.json](../desktop-learning/generated-samples/english-quality-2026-10-04T10-32-38-257Z.json). These files are ignored evidence. The repeatable request script is [quality-check.ts](quality-check.ts); pass `--inflection-follow-up` to run only the inflection case. These are live provider attempts, not fixtures.

## Observations

The contextual polysemy case used `bank` with the supplied river-edge sense and `run` with the supplied business-management sense. The passage used “the bank of the river” and “runs a small bakery”; it included both targets twice and translated them as `河岸` and `经营`. The examples match the supplied source contexts. Supporting language was ordinary and the four-sentence passage stayed on its bakery-by-a-river topic.

The English reads clearly overall. The first passage uses `run → runs` naturally for operating a bakery, so it provides evidence for that regular inflection. “My aunt runs it with love” is grammatical, though slightly promotional. Its translation, `我阿姨用爱经营它`, follows the English but sounds literal in Chinese; `我阿姨用心经营这家店` would be more natural. The other Chinese sentence translations preserve the main information, including the river location and fresh bread.

The library case included all five requested targets: `child`, `meet`, `friend`, `well-known`, and `don't`. The model preserved `don't` as a complete contraction and used the other forms correctly in context. The five short sentences form a coherent library scene. Their Chinese translations preserve the meanings: the child reads, the friend waits so they can meet, they do not make noise, and a famous writer enters.

The usable library response did not exercise irregular or inflected forms: the model chose singular `child`, singular `friend`, and base-form `meet`. Therefore it does not establish quality for `child → children`, `meet → met`, or plural `friends`. The exact forms, hyphenated adjective, and contraction were handled correctly.

The first inflection-focused follow-up used a past park scene and targeted `child`, `meet`, `friend`, and exercise-sense `run`. The provider response failed adapter validation with `invalid_response` (`DeepSeek returned malformed passage text.`); it exposed no passage that could be reviewed.

The final retry's topic explicitly said, “Yesterday, several children met their friends and ran home after school.” The generated passage instead used “A child is playing in the park. I meet my friend at the park. We run home after school.” It used all target IDs and kept `run` in the exercise sense, but did not follow the topic's number or past tense. The Chinese translations accurately reflect those generated present-tense sentences. The probe therefore still provides no evidence for `child → children`, `meet → met`, `friend → friends`, or `run → ran`; it also shows weak adherence to the supplied past-event topic. The only observed `run` inflection is the regular `runs` in the bakery passage.

## Limits

These probes are narrow evidence, not broad evidence of English generation quality. Three live responses were structurally valid and semantically reviewed; one additional live response failed structural validation and provides no semantic evidence. The probes do not verify English transcription, local analysis, native desktop behavior, saved artifacts, collection and regeneration, offline reopen, or Korean regression behavior. The first sandbox attempt failed at network access and produced no semantic evidence.
