# Translation and Vocabulary Meaning Acceptance

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../README.md) for remaining work.

Verified on 2026-10-02 against the confirmed behavior in [notes.md](notes.md).

## Delivered behavior

Listen requests sentence translation explicitly, supplies neighboring context, and stores one latest successful result for offline reuse and restart. Refresh failure and cancellation preserve prior results. Local reference translation is an explicit fallback after cloud failure. Story retains its stored translations without regeneration.

Word selection uses real Kiwi analysis and the bundled KRDict Chinese text snapshot (42,908 headwords). Multiple senses remain selectable; manual correction and explicit contextual cloud lookup remain available. Returned glosses cannot overwrite intervening edits, and uncollected glosses are not persisted. Exact saved occurrences can reuse their collected meanings while other contexts contribute candidates. The existing credential is shared with independent sentence and word task settings.

## Runnable checks

- `npm test`: 28 tests passed, including provider response bounds, credential errors, host cache/restart/cancellation, occurrence reuse and persistence compatibility.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `.venv-win/python.exe -m unittest discover -s scripts -p 'test_*.py'`: 8 tests passed, including dictionary import and real Kiwi lookup.
- `npm run desktop:build`: passed.
- `node .scratch/translation-lookup/verify.cjs`: native Electron acceptance passed with the production static renderer, real host IPC/SQLite, real Kiwi and bundled dictionary. Checks cover explicit cloud actions, neighboring context, cached revisits, failed refresh preservation, explicit local fallback, dictionary candidates, protected edits and Apply suggestion, discarded glosses, saving retry, navigation guards, repeated words, UTF-16 offsets, Listen/Story provenance and notebook refresh.

Native acceptance writes screenshots, its isolated application profile and `result.json` beneath the ignored `.scratch/desktop-learning/generated-samples/translation-acceptance-*` directory. It injects deterministic cloud HTTP and local translation worker results; it neither uses an owner's secret nor makes paid provider requests.

Final native run: `.scratch/desktop-learning/generated-samples/translation-acceptance-VfCsHL`. The added regression verifies that a sole meaning saved in another context stays a candidate, cancellation and a newer selection reject late cloud results, and an explicit cloud request may replace a meaning edited before that request. Focused host tests, typechecking, lint and the desktop build passed again after this correction.

## Review

Parallel Standards and Spec reviews compared implementation `59e893e` and its focused correction against `f001640aae0defcffec8cd24013b84af64023664`. No unresolved findings remain. The implementation check caught and corrected the unrelated-context single-candidate autofill boundary, with host and native regressions. An explicit cloud request may replace a meaning edited before that request; edits made while the request is pending remain protected.

## Limits

Live cloud output quality and service latency were not assessed. The dictionary is a fixed, incomplete text snapshot with separate CC BY-SA 2.0 KR attribution; missing entries remain manually editable. Settings UI and opt-in cloud Jev automatic sense selection remain in the roadmap. Installed-application packaging remains separate work.

The pre-existing `scripts/media_processor.py` VAD edit belongs to the user and is excluded from this change.
