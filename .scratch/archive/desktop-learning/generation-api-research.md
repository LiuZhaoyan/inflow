# Text generation API research

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../README.md) for remaining work.

Research date: 2026-09-30. Scope: Korean text artifacts, Chinese translations, target-word highlighting, and continued vocabulary collection. No TTS, API calls, credentials, account changes, or code changes.

## Recommendation

Use **one DeepSeek adapter**, initially `deepseek-flash`, through its documented Responses endpoint with a small JSON schema. This is a provisional engineering choice based on low paid cost and a familiar HTTP interface, **not a claim that its Korean is superior**. Confirm the owner's account availability and run the quality gate below before committing the implementation. Mainland China is absent from Google's and OpenAI's official supported-region lists; the owner's timezone alone does not establish their location or eligibility. Do not require either service to make the first version work. [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing/), [Responses reference](https://api-docs.deepseek.com/api/create-response/), [Google regions](https://ai.google.dev/gemini-api/docs/available-regions), [OpenAI regions](https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories)

**Conditional alternative:** Gemini `gemini-3.8-flash` is attractive if the owner is eligible, has a usable Google account, and prefers its free tier. Substitute this adapter if the access or quality gate favors it; do not ship a provider registry or automatic failover. OpenAI is a useful comparison candidate, with no demonstrated product-specific advantage yet.

## Verified public facts

All rates below are USD per million tokens, ordinary interactive text requests, uncached input. Model names and tariffs must be checked again when implementation begins.

| Candidate | Current model and rate | Output contract and HTTP integration | Free use and prerequisites |
| --- | --- | --- | --- |
| DeepSeek | `deepseek-flash` resolves to V4.1 Flash; peak input $0.30/output $1.20, off-peak $0.15/$0.60. `deepseek-v4-pro` is also offered. | OpenAI-format base URL `https://api.deepseek.com`; `/responses` documents `text.format` types `json_object` and `json_schema`, with schema name and schema required for the latter. | Pricing deducts from topped-up or granted balance; no recurring free inference allowance is promised on the reviewed page. Owner needs a key and usable balance. Regional/account availability was not established by the reviewed docs. |
| Gemini Developer API | `gemini-3.8-flash`: input $0.75/output $3.75 through Dec 31, 2026, then $1.50/$7.50. Output includes thinking tokens. | Native REST Interactions endpoint uses `x-goog-api-key` and `response_format` with JSON MIME type and schema; no SDK is required. | This model has free input/output with limited access. Free-tier content is used to improve products; paid-tier content is not. Google account, age 18+, possible age verification, and a supported region are required. Mainland China is not listed. |
| OpenAI | `gpt-6-luna`: standard short-context input $0.10/output $0.50. `gpt-6.1-sol` and `gpt-6-astra` are also listed. | Responses uses `text.format` JSON schema; Chat Completions uses `response_format`. Structured Outputs enforces schema shape; JSON mode alone does not. | Reviewed pricing lists paid token rates, without an ongoing general free inference tier. Requires owner API access/key and funding; supported-region restrictions apply. Mainland China is not listed. |

Sources: [DeepSeek models/pricing](https://api-docs.deepseek.com/quick_start/pricing/), [DeepSeek Responses](https://api-docs.deepseek.com/api/create-response/), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Gemini eligibility](https://ai.google.dev/gemini-api/docs/available-regions), [OpenAI pricing](https://developers.openai.com/api/docs/pricing), [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [OpenAI eligibility](https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories).

Schema limits differ. Gemini supports a JSON Schema subset and may reject large/deep schemas. OpenAI requires an object root, all fields required, and `additionalProperties: false`; optional values can use null, with documented limits of 5,000 properties and 10 nesting levels. DeepSeek's Responses reference documents schema output but does not establish an exhaustive supported-keyword subset. Its separate Chat JSON mode warns of empty output and truncation and requires an explicit JSON instruction. Do not assume complete OpenAI parameter interoperability. [Gemini limitations](https://ai.google.dev/gemini-api/docs/structured-output), [OpenAI limits](https://developers.openai.com/api/docs/guides/structured-outputs), [DeepSeek Responses](https://api-docs.deepseek.com/api/create-response/), [DeepSeek JSON mode](https://api-docs.deepseek.com/guides/json_mode/)

As an illustrative calculation, 1,000 input plus 1,000 visible output tokens costs at most $0.0015 at DeepSeek Flash peak rates before additional reasoning output or retries. Actual Korean/Chinese token counts and request cost must come from usage metadata, not character counts. This is an estimate, not measured passage cost.

## Small first contract

Supply selected vocabulary IDs, Korean lemmas, intended Chinese meanings, source sentences, optional topic, and a fixed short-passage instruction. Require every selected meaning to appear naturally, allow Korean inflection, and request everyday vocabulary for all other content. Do not introduce a proficiency-level control.

Return a title and sentences. Each sentence contains Korean text segments marked with a selected vocabulary ID or null, plus its Chinese translation. Reconstruct Korean text from the segments; this avoids guessing highlight offsets across inflections. Validate text, known IDs, and coverage of **every** requested ID before saving a complete artifact. An ID claim is not proof of correct lemma or meaning: that remains a semantic quality check. Handle incomplete/refused/malformed results without replacing saved work; offer a clear retry rather than an unlimited correction loop.

Persist the validated article, selected-word snapshots, topic, model ID, prompt version, creation time, and usage locally. Associate newly collected words with the artifact and its sentence. Call the API from the desktop host, keep the key out of artifact exports and logs, and send only selected words and necessary source sentences. A single direct HTTP request is sufficient; no AI SDK, embeddings, RAG, agents, or second grading model is needed for this version.

## Quality gate prepared without a key

Prepare four fixed cases: five everyday words; mixed nouns/verbs/adjectives requiring inflection; ambiguous lemmas with one specified source meaning; and a larger set of unrelated words that is difficult to fit naturally. The last case measures whether the product's one-article/all-words requirement strains readability rather than silently relaxing it. Test each case three times with the same prompt and assess saved outputs blind where possible.

| Check | Acceptance evidence |
| --- | --- |
| Shape and highlighting | Every output parses; all selected IDs occur; highlighted surface forms are present in the displayed sentence; no unknown IDs. |
| Coverage and meaning | All target lemmas are genuinely used in the selected sense, including valid conjugations; no misleading word-ID annotations. |
| Readability | Coherent short passage with natural Korean grammar and no conspicuous filler added only to force coverage. |
| Other vocabulary | A competent Korean reader flags uncommon non-target lemmas; owner records newly unfamiliar words. Frequency and personal familiarity are separate observations. |
| Translation | Chinese translation preserves each sentence's meaning, especially target senses, without added facts. |
| Practical use | Record latency, actual token usage/cost, and failure/retry count when authorized calls become available. |

Hard failures in coverage, target sense, or translation block acceptance. Score readability and non-target vocabulary explicitly with the owner before selecting the final model. None of these semantic checks has been run; generic multilingual marketing and schema compliance cannot establish Korean learning quality. This investigation produced the decision criteria and evidence, not generated sample passages.

## Evidence boundary

Public docs were checked without authenticated accounts. Several DeepSeek page opens timed out; the official search index supplied the full Responses and JSON-mode reference text, crawled five days before this investigation. Pricing was retrieved directly. Endpoint compatibility, regional reachability, free-tier quotas available to this owner, Korean quality, and actual passage cost remain empirical checks.
