# Video Mask Follow-up

Updated: 2026-10-06

On-demand manual subtitle masking is implemented and automated source-checkout acceptance passed. Native screenshots were recorded on 2026-10-06. Current behavior belongs in [Project Status](../../docs/PROJECT_STATUS.md).

## Remaining acceptance

- [ ] Record owner visual acceptance in the native normal/maximized window.
- [ ] Verify the maximized native window; browser viewport resizing and native screenshot preview do not establish this check.
- [ ] Verify masking in the installed application after [Windows packaging](../desktop-learning/README.md).

Broader workspace visual acceptance remains in [Frontend Workspace](../frontend-workspace/spec.md).

## Deferred work and historical evidence

Subtitle-track extraction and audio alignment were removed from this iteration. Automatic region detection and bitmap subtitle OCR also remain deferred in [Roadmap](../../docs/ROADMAP.md#6-deferred-product-work). The retained designs do not authorize implementing those features now.

- [Confirmed manual-mask contract and deferred subtitle design](../archive/video-subtitles/spec.md).
- [Automated acceptance, native screenshots and verification limits](../archive/video-subtitles/acceptance.md).
- [Dated extraction/alignment feasibility research](../archive/video-subtitles/research.md).

Verification scripts, fixtures and generated evidence remain at their original paths. Archiving records does not claim owner approval or installed-package acceptance.
