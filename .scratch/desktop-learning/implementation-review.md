# Feasibility Preparation Review

Date: 2026-09-30.
Status: preparation code reviewed and verified; live acceptance gates remain open.
Comparison: staged changes against implementation-start commit `46984ad058e193d8b6bf8d0fa4e3be81905ddd49`.

## Delivered scope

Ticket 01 preparation adds platform-aware interpreter selection, explicit model directories, UTF-8 worker communication and an isolated Windows setup entrypoint. Ticket 02 preparation adds one DeepSeek Responses adapter, strict text/target validation, cancellation and response limits, and a four-case evaluation runner. The approved specification and seven local issues are included in the same delivery record.

The obsolete preloaded-dictation specification and mobile-browser task document were removed after the owner's cleanup request. Their references now point to the current specification or the retained real-media evidence. Existing media, models, legacy data and the owner's unrelated STT research document were preserved.

## Standards

A separate Luna review found duplicated acceptance criteria in the planning index and individual issue files. This is resolved: the index now contains links and sequencing, and each issue owns its acceptance criteria. No remaining standard finding was identified in the reviewed preparation scope.

The main agent also replaced helper-only path tests with behavior tests through the public processing interface. Tests exercise real child-process configuration and configured-model failure behavior rather than inspecting private path helpers.

## Spec

The specification review agent could not finish because of an agent usage limit. The main agent completed the specification audit directly.

Two acceptance gaps remain tracked in the issues:

1. Ticket 01 requires a "recorded native Windows media session." Windows Python 3.12 and processing dependencies are not installed; the Conda dry-run failed to lock its WSL UNC cache. The setup entrypoint was checked for UNC rejection, but a Windows-local setup, real-video processing and complete player interaction remain unverified. Continue from [the Windows instructions](../../README.md#windows-feasibility-setup).
2. Ticket 02 says it "cannot be closed without the live account/access and Korean-quality evidence." The owner selected DeepSeek but has not configured a usable local key. Prepared-input mode and deterministic responses validate the runner and contract; they provide no measured Korean-quality or authenticated API evidence. Continue with [the generation baseline](generation-baseline.md).

Tickets 03–07 remain unstarted behind the approved dependencies. No Electron host, durable vocabulary/artifact storage or Windows installer is claimed by this delivery.

## Main-agent corrections

- Cancellation after response headers now prevents a completed-looking result. Responses have a bounded streamed body, and an oversized declared body is canceled before rejection.
- The worker explicitly receives UTF-8 pipe encoding for Korean input and Chinese/Korean JSON output. A regression test starts from an incompatible inherited encoding and checks the public worker result. [Python's encoding reference](https://docs.python.org/3.12/using/cmdline.html#envvar-PYTHONIOENCODING) describes the override for redirected streams.
- Requested and reported model metadata stay separate. No-key evaluation clearly records that no live generation was run, and each sample run preserves earlier outputs.

## Verification

- Full TypeScript suite: 16 passed, 0 failed, run once after the final source changes.
- Python processing suite: 3 passed.
- Final typecheck passed; changed TypeScript source and the evaluation runner passed ESLint.
- Focused failing tests reproduced response-stream cleanup and encoding configuration before their fixes; corresponding checks then passed.
- Prepared-input runner, model-setup help and the Windows UNC setup guard passed their focused checks.
- Local documentation links, triage status, blocking edges and whitespace were checked.

Node test isolation and child-process execution require the approved execution context because the default sandbox returns EPERM. This is an execution permission boundary rather than application behavior. No live API call, native Windows transcription, desktop build or installer acceptance was performed.

Review outcome: Standards — one resolved finding, none open. Spec — two open evidence gates; the later five tickets remain blocked.
