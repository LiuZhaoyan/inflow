# Video Subtitle Support

Status: complete
Requested: 2026-10-04
Updated: 2026-10-05
Stage: manual mask implemented with automated acceptance; subtitle extraction is deferred. See [acceptance](acceptance.md) for evidence and remaining validation limits.

## Requested outcomes

1. Provide an on-demand manually adjustable covering over video subtitles during learning. Automatic subtitle-location detection is deferred from the first version, as confirmed on 2026-10-05.
2. Investigate reuse of extractable subtitle tracks. The owner deferred implementing subtitle extraction from this iteration on 2026-10-05.

The first outcome is this iteration's implementation scope, as recorded in [desktop ticket 08](../desktop-learning/issues/08-subtitle-mask.md). The second is deferred product work. [Feasibility research](research.md) records established facts and limits.

## Established facts

- Burned-in subtitles, embedded text tracks and embedded bitmap tracks require different treatment.
- Inflow currently requires source text, non-overlapping playback ranges and meaning groups; it does not persist word timestamps.
- Text-track cues provide text and display timing but do not guarantee complete sentences or speech boundaries. Meaning groups still need local analysis.
- A video can contain both a subtitle track and burned-in subtitles. Track extraction does not establish that picture masking is unnecessary.
- The current media limits and supported containers remain the baseline until any changes are decided.

## Design tree

### Round 1: confirmed picture-masking decisions

The owner accepted all three recommendations on 2026-10-04. The current decisions below incorporate the later opt-in-display clarification and accepted manual-only first-version scope.

| Question | Accepted decision |
| --- | --- |
| Q1: Typical video subtitles | The first version covers fixed bottom subtitles, including one-line and bilingual layouts. Moving/animated and scattered multi-location subtitles are outside this first-version scope. |
| Q2: Region setup and correction | Allow the learner to create, move and resize one subtitle covering. The accepted Q5a revision defers automatic region detection from the first version; an initial adjustable rectangle is offered only after explicit learner activation. |
| Q3: Activation | Use a switch independent of meaning-group mask mode. On 2026-10-05 the owner clarified that new imports must show no default covering because some videos have no subtitles. Masking starts only on the learner's explicit action; retain each video's configured region and enabled/disabled state across reopening and restart. This replaces any automatic activation on first region initialization. |

### Round 2: confirmed presentation and playback decisions

The owner accepted Q4 and Q5 on 2026-10-05, then accepted Q4a and the manual-only scope revision Q5a. The current decisions below supersede the earlier automatic detection and import-time covering proposals.

| Question | Accepted decision |
| --- | --- |
| Q4: Region presentation and controls | Use one opaque black rectangle covering the bottom subtitle area, including both bilingual lines. Provide a subtitle-mask switch and an adjustment entry beside the video. Movement and edge/corner resizing are available in adjustment mode, with handles hidden during ordinary learning. Position and size follow the actual video picture, including letterboxing, on window resizing/maximization. Do not add a new player fullscreen flow in this version. |
| Q5/Q5a: On-demand initialization | Do not detect subtitle regions or show an initial covering on import. Only when the learner requests subtitle masking, enter region adjustment with an initial rectangle that can be moved/resized. Apply Q4a during adjustment and save the resulting region and switch state. Reopen using the saved settings. Automatic subtitle-location detection is deferred. |
| Q4a: Playback during region adjustment | Pause once on entry into adjustment mode without changing position. Keep the play control available so the learner can explicitly resume playback and move/resize the covering with immediate visual updates. Dragging must not implicitly toggle or repeatedly pause playback. Leaving adjustment mode retains the current playing/paused state, without automatic resumption. |

### Deferred subtitle-source design

The owner accepted Q6 on 2026-10-05 and requested image-based subtitle OCR as a possible future experiment in [the roadmap](../../docs/ROADMAP.md), outside the first version.

| Question | Accepted decision |
| --- | --- |
| Q6: Subtitle source selection and fallback | Offer a preview of extractable source-language text tracks, preselect a suitable track when unambiguous, and allow speech transcription instead. Multiple or ambiguous tracks need learner selection. Use the existing transcription route when there is no usable source-language text track. Keep Chinese translation on its existing path; bitmap text recognition and new container formats are outside this version. |

### Deferred subtitle playback and replacement design

The owner accepted Q7 and Q8 on 2026-10-05. These choices are retained for future subtitle reuse. The owner subsequently deferred subtitle extraction, superseding the former combined-effort Q9 confirmation.

| Question | Accepted decision |
| --- | --- |
| Q7: Playback boundaries | Preserve complete-sentence playback when using subtitle text, with audio alignment rather than treating every cue as a sentence. Subtitle sources vary, so investigate normalization and alignment with representative inputs instead of promising universal compatibility. Cue display times alone do not establish speech boundaries. |
| Q8: Existing material and replacement | Keep existing transcripts until the learner explicitly reprocesses material. Successful replacement follows the current atomic transcript-replacement contract: clear old meaning-group masks, cached translations and this media's vocabulary source occurrences, including retained older occurrences. Retain vocabulary entries, meanings and selection, other source contexts, and generated artifacts. Retain video-region settings because the source picture is unchanged. Failure/cancellation preserves prior data. |

### Current iteration: manual masking only

On 2026-10-05 the owner removed subtitle extraction from this iteration. This scope decision closes the current interview: Q1-Q5/Q4a/Q5a define the accepted manual-mask contract and can proceed to implementation. The former combined-effort Q9 proposal is superseded, not accepted. Q6-Q8 remain design history for a possible later subtitle-reuse effort; they do not authorize subtitle extraction in this iteration.

Subtitle-track discovery, preview/selection, text preparation and audio alignment are deferred. Existing research is retained for that future effort. Manual masking has no extraction/alignment dependency. Automatic subtitle-location detection remains deferred, and bitmap subtitle OCR remains a future roadmap experiment.

## Current implementation plan

1. Persist an optional rectangle and enabled/disabled state in each video's existing learning JSON. Validate it in the host. Older material without settings remains uncovered. Verify restart, material independence and preservation through existing reprocessing.
2. Add explicit activation and adjustment beside the video. Display a single opaque black rectangle relative to the actual picture, including letterboxing. Support dragging, edge/corner resizing and keyboard adjustment. Pause once when entering adjustment, permit manual playback/live changes, prevent dragging from toggling playback and retain playback state when finishing.
3. Run focused geometry/persistence tests and browser checks for opt-in behavior, aspect ratios/window resize, manual and live adjustment, reopening, audio-only material and independent meaning-group masking. Record actual validation and limitations; no processing/source-selection changes are needed.

## Acceptance scenarios

- A new video has no visible mask; audio-only material has no subtitle-mask controls.
- Explicit first activation creates the initial bottom rectangle and enters adjustment, pausing once without seeking.
- One opaque rectangle can cover one-line or bilingual fixed bottom subtitles. Movement and all edge/corner resizing stay within the picture; keyboard users can adjust the region.
- A saved rectangle follows the contained video picture across aspect ratios and window resize/maximization; no player fullscreen feature is added.
- The learner can manually resume playback and move/resize live. Dragging neither toggles nor repeatedly pauses playback; finishing adjustment retains the current playback state and hides handles.
- The switch operates independently of meaning-group masks. Region and enabled/disabled state survive reopen/restart and remain independent per material.
- Existing speech transcription, vocabulary, translations and generated artifacts retain their behavior. Reprocessing preserves video mask settings while following the existing transcript-dependent cleanup.

## Comments

2026-10-04: The owner requested automatic subtitle-region masking and investigation of embedded subtitle reuse through the grill-with-docs workflow. Repository/documentation research and small existing-runtime probes are recorded separately from feature implementation and acceptance. At that point Round 1 remained unanswered; a later "continue" resumed investigation without settling those choices.

2026-10-04: The owner requested a separate worktree, then accepted Q1-Q3 in full. This effort now continues in the `codex/video-subtitles` worktree; Round 1 decisions above are confirmed and Round 2 remains open.

2026-10-05: The owner accepted Q4 and Q5 and asked whether region adjustment should force playback to pause or support live changes. The Q4a recommendation separates an initial automatic pause from a playback lock: manual playback remains available, and changes render immediately. Q4a and subtitle-reuse decisions Q6-Q8 remain open.

2026-10-05: Q4a was accepted: entering region adjustment pauses once, optional manual playback permits live changes, and leaving adjustment preserves the current playback state. The owner then asked whether automatic initialization through subtitle detection is still necessary. Q5a proposes a default bottom rectangle and deferring automatic region detection; this scope change remains unconfirmed.

2026-10-05: The owner rejected displaying a default covering immediately after import because some videos do not contain subtitles. New imports must keep masking disabled until explicit learner action; reopening previously configured material still restores its saved switch state. This supersedes the prior import-time visible covering. The revised Q5a recommends manual setup on request and deferring detection, but removal of automatic detection is not yet confirmed.

2026-10-05: The owner accepted Q5a: first deliver on-demand manual subtitle masking, with no automatic subtitle-region detection and no covering on video import. An initial adjustable rectangle is offered only after explicit activation. This supersedes the automatic-detection portions of Q2/Q5 and the rejected import-time default-covering proposals. Subtitle-reuse decisions Q6-Q8 remain open.

2026-10-05: The owner accepted Q6 and requested image-based subtitle OCR as a future path to try in ROADMAP. The first version still reuses extractable source-language text tracks, offers preview/selection, and falls back to speech transcription when no usable track exists. Chinese translation remains on its existing path. Image-based subtitle OCR is an exploratory follow-up, not current implementation scope; Q7 and Q8 remain open.

2026-10-05: The owner accepted Q7: preserve complete-sentence playback and investigate subtitle normalization/audio alignment because different sources have different subtitle text and timing. The owner then accepted Q8: explicit reprocessing, atomic replacement on success with the existing transcript-dependent cleanup, preservation of vocabulary entries/generated artifacts/video-region settings, and no data replacement on failure or cancellation. All numbered behavior choices Q1-Q8 are settled; technical feasibility and combined-effort sign-off remain pending.

2026-10-05: Existing PyAV successfully decoded a controlled in-memory MP4 with H.264 video, AAC audio and an English mov_text subtitle track. The existing Whisper model aligned supplied matching English text into two sentence segments; wrong and partial text also received timings, exposing a quality boundary. Q9 now requests final shared-understanding confirmation of the concrete plan and explained whole-material ASR fallback for tracks that cannot be safely adapted/aligned. No implementation, real-file compatibility acceptance or universal-confidence claim has been made.

2026-10-05: The owner decided not to include subtitle extraction in this iteration. Implementation is limited to the already agreed on-demand manual video mask. Source discovery/preview/selection, subtitle normalization and audio alignment are deferred; the former combined-effort Q9 proposal is superseded. No further confirmation of those removed features is required to implement the accepted mask contract.

2026-10-05: Implemented the manual-mask-only scope in codex/video-subtitles. Optional host-validated learning settings persist the rectangle and switch; the video UI supports pointer/keyboard move/resize, contained-picture coordinates, one pause on adjustment entry and optional live adjustment. All 39 unit tests, TypeScript checks, ESLint, browser interaction cases and the Electron host/static-renderer build passed. Subtitle extraction remains deferred; acceptance.md records the verification boundary.
