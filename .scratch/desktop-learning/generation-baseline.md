# Generation baseline

Status: authenticated four-case evaluation completed; the owner accepted the current Korean generation quality and recorded limitations.
Updated: 2026-10-01

## Accepted live evaluation

DeepSeek `deepseek-flash` returned all four prepared cases through the existing adapter on 2026-10-01. Latencies were 1,765 / 2,013 / 1,598 / 2,492 ms; usage totaled 1,833 input and 1,666 output tokens. The runner reads the owner's ignored `.env` and optional `.env.local` without copying credentials into evidence. [Unmodified samples and review](generated-samples/run-2026-10-01T03-34-27-466Z-990f1311/review.md) record limited coherence in the inflection case and awkward wording in the unrelated-target case. The owner explicitly accepted current quality with those limitations. Ticket 02 is complete; this does not claim error-free Korean.

## Provider and request

The first adapter calls DeepSeek's Responses endpoint at `https://api.deepseek.com/responses` with the `deepseek-flash` request model. It sends selected entry IDs, Korean dictionary forms, contextual Chinese meanings, optional source sentences and an optional topic. It requests JSON Schema output for a title and Korean sentences made of ordered text parts with target IDs, plus a Chinese translation per sentence. It requests no audio, uses `reasoning.effort: none`, and caps visible plus reasoning output at 4096 tokens.

The public host-facing operation is `generatePassage(input, { apiKey, signal?, fetcher? })` in `src/generation/index.ts`. The optional `fetcher` is the deterministic external HTTP seam; desktop operations can pass the owner's key and cancellation signal. The result keeps the requested model separate from the response's reported model and includes response ID and usage when supplied.

## Validation and safety

The adapter bounds selection to 20 entries, entry IDs to 128 characters, lemmas to 100, Chinese meanings to 300, source sentences to 1000, topics to 200 and serialized request context to 40,000 characters. Requests use a 90-second deadline and at most 4096 output tokens. Responses are streamed with a 1 MiB byte limit.

Only `completed` responses with readable structured text are accepted. The adapter rejects blank text or translations, unknown target IDs, missing selected IDs, duplicate input IDs and extra output fields such as audio. It does not treat a target-ID annotation as proof that the Korean text uses the intended lemma or meaning. Authentication, balance, rate-limit, service, timeout and malformed-response errors are sanitized before they reach the caller; provider response bodies and API keys are not saved.

## Prepared evaluation

`scripts/evaluate-generation.ts` prepares four fixed cases: everyday words with a topic, mixed verbs/adjectives/noun forms, ambiguous lemmas with source-specified meanings, and a larger unrelated-word selection. With `DEEPSEEK_API_KEY` configured, one run makes at most four serial calls and saves each readable Korean/Chinese sample with response metadata under `.scratch/desktop-learning/generated-samples/`. A failed case is recorded without its provider body; later cases are marked not run, and the script exits unsuccessfully. Each run gets a new directory to preserve earlier samples.

Without `DEEPSEEK_API_KEY`, the script saves only the prepared inputs and a `live_evaluation_not_run` manifest. It does not make a provider request or invent sample output. This mode is useful for checking the runner's preparation and output path, but is not provider or language-quality evidence.

Live output requires owner review for real target coverage and meaning, natural Korean, common supporting vocabulary, sentence translation and highlight alignment. Record measured response model, latency and token usage from saved runs. These checks have not been performed, so ticket 02 remains open.

## Deterministic check

```sh
node --import tsx --test src/generation/index.test.ts
```

The tests use fixture HTTP responses and do not require or call an API account.

## Official API references

- [DeepSeek Responses API](https://api-docs.deepseek.com/api/create-response/): `/responses`, structured `json_schema` format, response status and usage fields.
- [DeepSeek Responses API guide](https://api-docs.deepseek.com/guides/responses_api/): supported model and request parameters, including `deepseek-flash`, `max_output_tokens` and reasoning effort.
- [DeepSeek models and pricing](https://api-docs.deepseek.com/quick_start/pricing/): current model name, endpoint base URL, maximum output and pricing.

Docs checked 2026-09-30. The exact schema, owner access and Korean passage quality still require a bounded live evaluation.
