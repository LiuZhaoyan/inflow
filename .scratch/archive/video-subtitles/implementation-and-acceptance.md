# Manual video subtitle mask: implementation and acceptance (historical)

Implemented and verified 2026-10-05, with native screenshot preview on 2026-10-06. Current behavior: [Project Status](../../../docs/PROJECT_STATUS.md). Future subtitle extraction research remains separate in [feasibility research](research.md).

## Delivered scope

The learner explicitly activates a single opaque rectangular covering over the displayed video picture, moves it with the pointer, resizes it with eight handles and adjusts it with arrow keys (Shift increases the step). Coordinates are constrained to the actual displayed picture, including letterboxing and window-size changes. Entering adjustment pauses once without seeking; live movement/resizing does not repeatedly pause or toggle playback. Finishing hides handles and retains the current playback state.

Settings persist per material as optional learning JSON, compatible with older records without a database migration. The host validates coordinates and preserves settings when older callers omit them. Retranscription retains video-mask settings while clearing sentence-dependent state. Audio is not eligible for video masking.

## Acceptance and limits

Focused geometry/host tests covered aspect ratios, letterboxing, resizing and invalid settings, independent materials, restart, and failure/cancellation/reprocessing preservation. The original full host suite (39 tests), typecheck and lint passed. Native screenshot evidence and acceptance were scoped to the manual covering; maximized-window and installed-app visual verification remained follow-up work. Historical screenshot paths under ignored generated samples may not exist in every checkout.

Subtitle extraction, track selection, audio alignment, OCR and automatic subtitle-location detection were explicitly deferred. Do not interpret the manual mask as extraction or recognition. See [research](research.md) for text/bitmap/burned-in subtitle distinctions and future integration constraints.
