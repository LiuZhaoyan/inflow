# Story and Vocabulary Interface

> Historical record archived on 2026-10-03. Statements and status fields below describe the original delivery stage. Use [Product Specification](../../../docs/PRODUCT_SPEC.md) and [Project Status](../../../docs/PROJECT_STATUS.md) for current behavior; see [active tasks](../../README.md) for remaining work.

Date: 2026-10-02
Status: implemented and locally verified; owner visual acceptance pending.
Reference: the two owner-supplied Story and Vocabulary design screenshots.

## Scope

- Match the dark palette, purple accents, compact 48px navigation, reading layout and vocabulary master/detail layout.
- Reuse the Electron bridge, host-owned SQLite, vocabulary review and source provenance, saved artifacts, credentials and generation pipeline.
- Require explicit selection of 1–20 vocabulary entries before generation. Selection and generation remain separate learner actions.
- Keep media, Story and Vocabulary subtrees mounted so tab changes preserve playback position and unsaved vocabulary drafts.
- Open media sources at their saved sentence position, paused. Open Story sources at their saved sentence index.
- Show saved Story target snapshots and translations without regenerating them.
- Render pronunciation, Add context, Dictionary and Notes as unavailable interface controls. Their business behavior and persistence are deferred by the owner.
- Preserve existing Chinese contextual meanings. No English meaning fields or invented translations are added.
- Use existing sentence identities; the interface does not manufacture paragraph groups.

## Visual assets

The shared decorative Story cover is `public/workspace/story-rain.png`, generated with the built-in imagegen tool in generation mode without reference images. It is packaged with the static desktop renderer. The interface itself is rendered by React and CSS.

Prompt:

> Use case: photorealistic-natural. Asset type: a wide cinematic hero background image for a dark Korean reading application. Create an atmospheric empty street on a rainy evening, old European stone buildings, a small warmly lit cafe on the right, amber light through glass windows, a single old street lamp, wet cobblestones reflecting warm light, deep navy blue shadows, gentle rain mist. Wide landscape composition, roughly 16:9, cafe and detail mainly in the right half, left half darker and quieter for a code-rendered heading. Moody realistic film photography, subdued, elegant, low brightness, fine real textures. It must contain only the street scene: no words, no titles, no readable signs, no logos, no watermark, no user interface, no people in foreground. This is only a background asset, not a complete interface mockup.

Video thumbnails use paused native video frames from managed media when available. Missing media, audio and Story sources use source-type icons. No drama frames are bundled or used as fabricated provenance.

## Verification

Passed checks:

- `npm run typecheck`
- `npm run lint`
- `npm run desktop:build` (includes host and static renderer TypeScript checks)
- `node .scratch/frontend-workspace/verify-reading.cjs`
- `git diff --check`

The native harness also accepts an eight-second MP4 fixture as its first argument. It creates a new profile under the ignored generated-samples directory. The owner's library and credentials are not changed. Electron loads the built renderer through `inflow://app/`; no development server is used. SQLite, the preload bridge, IPC handlers and media decoding are real. Transcription and the generation provider response are deterministic fixtures; this run does not validate live model quality or contact the provider.

Verified behavior:

- Real search results and All/Media/Stories/Manual counts (24/16/6/2 in the fixture).
- Vocabulary edit drafts survive tab changes. Cancel leaves storage unchanged; Save persists the edited meaning.
- Media source navigation seeks to the saved sentence start at 2 seconds, paused. Switching tabs retains that position.
- Story sources, Context, Previous/Next, saved-story history and the Library drawer open the expected artifact and sentence.
- Selecting Story text opens a collection draft carrying artifact provenance. Cancel leaves vocabulary unchanged.
- A closed target chooser makes no selection changes. Zero targets cannot continue, and selecting 20 disables additional unchecked words.
- Continuing persists the exact selected IDs. Explicit generation saves one new artifact with those target snapshots and makes one stubbed provider request.
- Stored Story translation makes no additional provider requests.
- Reading, context and target vocabulary scroll independently. Vocabulary rows and details have their own scroll regions.
- At 1536×1024 and 1100×800, document and body width match the viewport without horizontal overflow. The navigation is 48px high. The wide vocabulary panels measure approximately 874px/602px with a 20px gap; the Story panels measure 1071px/409px with a 16px gap.
- No renderer console errors were captured. The final native screenshots were visually inspected.

Evidence directory: `.scratch/desktop-learning/generated-samples/reading-acceptance-kbveqD/`.

- `evidence.json`
- `vocabulary-1536.png` and `vocabulary-1100.png`
- `story-1536.png` and `story-1100.png`

The screenshots contain synthetic test material. Production content, counts, meanings, source frames and context lengths come from the existing library. English display meanings in the fixture are literal test data stored through the existing meaning field, not a new translation feature. Story navigation uses sentences because the current artifact contract has no paragraph grouping. The rainy cover is a shared decorative asset, not generated separately for each story.

The desktop build now clears only its generated `build/renderer-source` staging directory before copying current sources. This prevents deleted prototype components from breaking the renderer build. The cover is copied into the static renderer along with the workspace UI.

## Integrated desktop header

The separate native title bar is hidden. Electron's Window Controls Overlay places themed native minimize, maximize/restore and close buttons inside the 48px App Header, reduced from 62px at the owner's request. Content, Story and Vocabulary viewport offsets match the reduced height. The header background is draggable; the navigation remains clickable. CSS title-bar environment variables reserve the native controls' space. No window-control IPC or dependency was added. The implementation follows the [Electron custom title bar documentation](https://www.electronjs.org/docs/latest/tutorial/custom-title-bar).

`npm run desktop:build` and the native acceptance harness passed after reducing the header height; lint passed for the preceding integrated-header change. The harness verified an active overlay, header top 0 and height 48, drag/no-drag regions, navigation ending at x=358 within the safe area ending at x=1399, and native maximize, unmaximize, minimize and restore operations. These operations use Electron APIs; physical dragging and double-clicking were not automated. The integrated header and native controls were visually inspected in `custom-header-native.png`.

Header evidence directory: `.scratch/desktop-learning/generated-samples/reading-acceptance-kbveqD/`. It also contains the rerun Story/Vocabulary screenshots and `evidence.json`, with no renderer console errors.
