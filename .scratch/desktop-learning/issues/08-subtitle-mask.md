# 08: Add a subtitle-region Mask for blind listening

Status: needs-triage
Requested: 2026-10-01
Schedule: follow-up work after the current frontend workspace phase.

## What to build

Provide an optional visual Mask over subtitles embedded in the video picture, so the learner can hide them during blind listening.

## Context and boundaries

- The owner confirmed that the current frontend phase plays the original video as supplied, including embedded subtitles. Mask is deferred and does not block that phase.
- Mask belongs to the video presentation layer. Preserve the original media, processing results, vocabulary and learning artifacts.
- SentenceArea Reveal only controls application-rendered source text; it cannot hide subtitles embedded in the media picture.
- This request does not include subtitle detection, OCR, subtitle removal, cropping or video re-encoding.

## Proposed direction and decisions to confirm

The proposed first iteration is a user-controlled overlay, disabled by default, with a manually adjustable region. These interaction details are proposals, not confirmed requirements.

Before implementation, confirm the control placement, region adjustment, fullscreen behavior and whether settings persist per material.

## Acceptance criteria

- [ ] Confirm the interaction and persistence rules before implementation.
- [ ] The learner can enable and disable the Mask without changing playback position or mode.
- [ ] The Mask covers the chosen region while the original media and saved learning data remain unchanged.
- [ ] Verify the agreed resizing and fullscreen behavior with real video, and provide keyboard-accessible controls.

## Comments

2026-10-01: The owner accepted original-video playback for the current phase and explicitly requested Mask in the follow-up plan. No Mask implementation or verification has been performed.
