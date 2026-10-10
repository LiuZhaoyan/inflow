# Electron IPC boundary audit

Scope: `main.ts`, `preload.cjs`, `src/listening/desktop.ts`, host operations and renderer consumers. No UI, schema, dependencies, or product features changed.

## Interface and existing protections

The preload exposes 25 Promise-returning methods on `window.inflow`. Each invokes only its fixed `inflow:<method>` channel; it exposes no Electron objects, arbitrary channel access, callbacks, or subscriptions. `DesktopBridge` describes the same surface. Main checks the exact window, its main frame, and the frame URL before invoking any operation.

| Methods | Renderer input and host action | Validation / ownership |
| --- | --- | --- |
| `list`, `restore`, `open` | Optional media ID; read library and select active media | IDs resolve through host-owned SQLite records |
| `importMedia`, `relink` | No renderer path; relink takes a media ID | Native file picker; host checks extension, size, hash, duration and existing identity |
| `transcribe`, `translate` | Media/sentence identity, job ID, translation options | Host-owned sentence text; typed option checks, job tracking, result validation and atomic persistence |
| `modelStatus`, `setupModels`, `cancel` | Setup job ID and optional components; cancel job ID | Fixed processor modes; setup list and job checks; cancellation signals |
| `saveLearning` | Media ID and learning state | Position, duration, index, rate, flags and masks checked against saved media |
| `listVocabulary`, `lookupVocabulary`, `glossVocabulary`, `saveVocabulary`, `selectVocabulary` | Lookup/save data, source identities, job IDs or selected IDs | Text bounds, language, source ownership, selection limits and result checks in operations |
| `credentialStatus`, `configureCredential` | Optional replacement key | Only status leaves main; key length/control-character checks and Windows encryption |
| `getSettings`, `saveSettings` | Optional video mask color | Existing color validator; host persistence |
| `generateArtifact`, `listArtifacts`, `restoreArtifact`, `openArtifact` | Selected IDs, topic, job ID or artifact ID | Host vocabulary, bounds, same-language check, generated-result validation and translated generation errors |

Consumers are `LearningWorkspace`, `SettingsDialog`, `useLearningArtifacts`, `VocabularyNotebook`, and `VocabularySelection`. They use the named bridge methods; cancellation uses generated job IDs. Omitted or empty setup component lists intentionally retain the worker's existing install-all behavior.

The window uses context isolation, sandboxing and disabled Node integration. New windows and permission requests are denied; navigation is restricted. The custom protocol checks host/method, confines renderer paths, resolves media by saved ID and sets a CSP on renderer responses. IPC arguments are still untrusted despite TypeScript types; domain operations supply most validation. Worker execution uses `execFile`, not a shell.

## Fixed findings

1. **Setup components were passed unchecked to the worker.** `null` selected the install-all default; a valid component followed by an invalid one could install the first before failing. Main now validates the complete list before tracking a job or launching a worker: only the three supported names, no duplicates, no sparse entries, maximum three. Undefined and empty lists remain valid.
2. **The shared URL guard could throw.** Malformed navigation URLs escaped the event callback instead of being denied. Parsing now fails closed; URLs with userinfo are also rejected. Valid root query strings and fragments remain allowed. The same guard protects navigation and all IPC handlers.
3. **Model setup could report success after cancellation.** Unlike operation jobs, setup returned a late successful worker result without checking its signal. It now rejects cancelled results and normalizes cancelled failures, retaining `finally` cleanup and ordinary worker errors.

`ipc.test.ts` executes the actual main entry point and preload in isolated VM contexts with a mocked Electron host. It checks every sender guard, exposed/typed/registered API parity, forwarding and Promise results, navigation, setup validation before side effects, duplicate active jobs, cancellation and job-ID reuse after success/failure/cancellation. It does not launch a worker, download a model, access credentials or open a database.

## Deferred issues and remaining risks

- **Credential write ordering (unresolved):** concurrent `configureCredential` calls share `deepseek.key.tmp`. Overlapping writes/renames can cause failures or leave disk and in-memory keys inconsistent. A fix needs an explicit serialization or latest-request policy and credential-specific persistence tests; skipped here rather than defining replacement order implicitly.
- **Job namespace and resource scheduling (unresolved):** model setup and operation jobs use separate maps, so a repeated ID can identify both and cancellation reaches both. Local processing already has a global busy guard; cloud work and native dialogs have no general concurrency bound. Unified scheduling, quotas and request ordering require a broader lifecycle decision. Existing UUID consumers make collisions unlikely during normal use.
- **Shutdown during untracked work (unresolved):** quit aborts tracked jobs and closes SQLite, but imports, relinks, status checks, credential writes and native dialogs are not tracked/drained. This audit does not choose between blocking quit, cancellation or completing writes. Pending asynchronous work must not be assumed to have drained.
- **Renderer compromise (remaining trust limit):** a compromised trusted main frame can call every exposed method, including modifying learning data, replacing credentials and requesting cloud work. Sender checks do not authorize individual actions. The renderer CSP permits inline scripts; a stricter policy requires reviewing the generated Next.js output.
- **Native runtime coverage (unverified):** the regression harness verifies application guards and registration, not Electron's actual contextBridge serialization, native dialog teardown or packaged shutdown. A Windows packaged-app smoke test remains necessary for those behaviors.

No generic error wrapper was added: existing domain messages and generation-error mapping remain intact. No new generic IPC schema duplicates the domain validators. Malformed inputs rejected by those validators retain their existing errors; this audit does not claim exhaustive fuzz coverage.

## Verification

- `npm test`: **47/47 passed**, including five IPC boundary regression tests.
- `node --import tsx --test desktop/ipc.test.ts`: **5/5 passed** after the final test-harness cleanup.
- `npm run typecheck`: **passed**, including Next.js route type generation.
- `node node_modules/typescript/bin/tsc --noEmit --pretty false`: **passed** after the final test-harness cleanup.
- `node node_modules/typescript/bin/tsc -p desktop/tsconfig.json --noEmit`: **passed**.
- `npm run lint`: **passed**.
- `git diff --check`: **passed**.

The first sandbox test run hit an existing relink-test `EPERM` during rename (46/47 passed); the unsandboxed rerun passed all 47. The first sandbox Next.js type-generation attempt reported access denied while canonicalizing the worktree; the unsandboxed rerun passed. Dependencies were copied from the matching main checkout after the offline cache was incomplete and the normal lockfile installation failed. No dependency manifests or lockfiles changed.
