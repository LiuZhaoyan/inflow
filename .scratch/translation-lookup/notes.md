# Translation and Vocabulary Meanings

Baseline: `f001640aae0defcffec8cd24013b84af64023664` on `main`.

## Confirmed behavior

- Listen requests cloud translation only on explicit user action. Supply the previous and next sentence as context but translate only the current sentence.
- Persist one latest successful translation per source sentence and actual input context. Ordinary repeated viewing and restart reuse it offline. Source or context changes invalidate reuse. Explicit refresh replaces it only on success; failure and cancellation retain the prior result.
- Cloud failure offers retry or an explicitly selected local reference translation. Never silently fall back.
- Story continues using its stored translations without regeneration controls.
- Single-word collection uses Kiwi and a bundled offline Korean-Chinese dictionary. Show multiple candidates for user selection; only one available sense may fill automatically. Missing entries permit manual input or explicit cloud lookup.
- Cloud word lookup returns a concise contextual Chinese gloss, with dictionary candidates as references rather than mandatory options. It changes the meaning, not the lemma.
- Never call a cloud service merely on word selection. Do not persist uncollected glosses; closing or discarding a draft abandons the result.
- Reuse a saved meaning for the same source sentence and selected occurrence. Other contexts supply candidates only. Preserve existing VocabularyContext provenance and vocabulary sense identity.
- Pending results cannot overwrite edits made during a request or a newer selection. Changed meanings receive an explicit Apply suggestion action. Save and discard protection remains.
- Share the host-owned encrypted DeepSeek key; sentence and gloss tasks have independent model/prompt/output-limit/timeout code settings. Model configuration UI and optional opt-in cloud Jev selection remain deferred in the roadmap. No local JevEmbed deployment or evaluation.

## Agreed verification seams

Host sentence translation/cache/cancellation; host lookup/gloss/save and source validation; bounded cloud request/response; native renderer selection, editing and navigation. Check these through public interfaces and isolated native acceptance.

## Data decision

KRDict official export requires email delivery. Use the publicly downloadable KRDict ZH text conversion, preserving NIKL attribution, CC BY-SA 2.0 KR and its fixed revision. The importer excludes phrases and untranslated entries and keeps sense labels; no media is bundled. Source and archive hash are recorded under resources/dictionaries.
