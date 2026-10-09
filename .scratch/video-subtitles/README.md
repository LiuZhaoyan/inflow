# Video Mask: Deferred Verification

Updated: 2026-10-09

The manual video mask is implemented. Automated source-checkout checks and owner visual acceptance were recorded. These are **not active release blockers**.

## When to verify

- [ ] At a convenient development checkpoint, verify actual Electron window maximization keeps the mask aligned with the displayed video.
- [ ] **At the next packaged release**, install to an isolated test profile, check masking, maximize the window, restart, and verify mask persistence. Do not package/install solely for this check during rapid development.

Owner visual acceptance on 2026-10-09 does not establish the separate maximized-window or installed-package checks.

Subtitle-track extraction, alignment, automatic detection and OCR remain out of scope. See [manual-mask acceptance](../archive/video-subtitles/implementation-and-acceptance.md), [research](../archive/video-subtitles/research.md) and [Roadmap](../../docs/ROADMAP.md#6-deferred-product-work).
