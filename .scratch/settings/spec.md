# Application Settings

Status: Implemented on main; automated acceptance passed; owner visual acceptance pending.
Updated: 2026-10-08

## Requested outcome

Add a Settings entry and interface for the shared DeepSeek credential and subtitle-region mask appearance. No additional preferences are included in this iteration.

## Verified starting point before implementation

- The top navigation exposes Library, Content, and Vocab (`src/workspace/TopNav.tsx`).
- The Story generation dialog already exposes credential configuration (`src/listening/ArtifactLibrary.tsx`). The host encrypts the shared DeepSeek credential using Windows-backed Electron safeStorage (`desktop/credentials.ts`).
- Sentence translation, contextual vocabulary glosses, and passage generation use that shared credential (`desktop/main.ts`). Task-specific model configuration is currently in code.
- A subtitle-region mask covers part of the video picture; a meaning-group mask hides a complete group in the learning transcript. These are separate concepts already defined in `CONTEXT.md`.
- The video mask is currently black. The transcript mask currently renders a solid placeholder (`src/workspace/workspace.css`).
- Playback rate, looping, playback mode, mask choices, and video-mask geometry are saved per material. The last confirmed import language is remembered.

## Confirmed scope

- Configure subtitle-region masks over the video picture only. Meaning-group masks are outside this change.
- Retain DeepSeek and its single shared credential. Provider, endpoint, and task model controls are excluded.
- Add a Settings entry on the right of the top navigation that opens a modal dialog.
- Organize settings into `LLM` and `Subtitle mask` categories with a left sidebar and a content panel. Follow the supplied reference's layout while retaining the workspace colors.
- Exclude reading size, playback defaults, import-language defaults, and all other suggested preferences.
- Provide solid-color subtitle-region masks only, with editable color. Blur and opacity controls are excluded.
- Use one global mask color for existing and newly imported videos. Region, size, and enabled state remain per video.
- Replace the Story generation dialog's key form with a Settings shortcut. Settings supports saving and replacing the credential, shows configured/unconfigured status, and does not reveal the saved key. Credential deletion and connection testing are excluded.
- Use one Save action and one Cancel action for the dialog. Closing discards unsaved edits.
- Opening Settings pauses playback without seeking. Closing Settings leaves playback paused for the learner to resume manually.
- Preserve successful field saves if another field fails. Identify saved and failed fields explicitly, keep the dialog open, and allow retry of unsaved changes.
- Provide an inline subtitle-region mask preview inside Settings. Color edits update the preview immediately before saving.
- Match the current workspace's frontend styling. Use its existing dark surfaces, lavender accent, typography, dialog shape, controls, and focus treatment.

## Interaction contract

The owner authorized implementation in a new worktree on 2026-10-08.

- Offer a native color picker with black (`#000000`) as the default. Masks remain opaque at every chosen color.
- Show a self-contained sample video picture with a subtitle-region mask inside Settings, rather than a color swatch alone. Render the mask using the chosen draft color and update it immediately when that color changes. The preview is available without imported media or network access. It previews appearance only; geometry editing remains on the real video.
- Unsaved changes affect only the preview and do not alter the active video's mask.
- Keep the key input empty on opening, with password input behavior. An empty input means retain the existing key, including when saving only a color change. A supplied replacement must pass the existing host validation.
- Saving a credential stores it locally; it does not automatically request translation, glosses, passage generation, or a provider connectivity check.
- On complete save success, close the dialog, clear the key draft, refresh credential availability in Story, and apply the saved color to the active mask. Learners initiate cloud actions themselves.
- On partial save success, retain and apply successful field changes immediately, refresh credential status if the key succeeded, clear a successfully saved key draft, and retain failed drafts. Show which field saved and which failed; never display complete success. Retry submits only unsaved changes.
- On complete save failure, preserve saved values and retain drafts with actionable errors. Do not silently roll back successfully persisted fields after a partial save. Cancel after a partial save discards only unsaved drafts.
- Escape and the close button behave as Cancel. Disable duplicate Save actions and closing while a save is pending. Return focus to the invoking control on close and keep the dialog keyboard accessible.
- Respect existing edited vocabulary drafts when opening Settings; do not silently discard them. Opening from Story retains the selected target vocabulary and optional topic.
- Switching categories preserves both drafts. Save attempts changed fields across categories. A failed save opens the first failing category, and sidebar status text identifies each saved or failed category.

## Visual design

The implemented visual direction retains the existing Story generation and target-selection dialog styles. The owner's reference supplies the sidebar/content layout only, not its colors. Owner visual acceptance remains separate.

### Layout

- Place the Settings text button at the right of the existing top navigation. Match the existing navigation button size, muted label, raised hover surface, and lavender expanded state. Keep it clear of the native window controls and outside the draggable title-bar region.
- Center one dialog, up to 920px wide and 660px tall, with at least 16px clearance on each side of a narrow window. Follow the current Story dialog's 18px outer radius, thin border, restrained shadow, and dark backdrop. Limit height to 88dvh; only the content panel scrolls, leaving the header, navigation and footer visible.
- Use a header with `Settings` on the left and the existing close-button treatment on the right.
- Render the header, navigation, content and footer on one continuous dialog surface. Do not use internal divider lines or a separate sidebar background; distinguish controls with spacing and the selected-category treatment. Retain the dialog outline and form-control borders.
- Place a 200px sidebar on the left with `LLM` and `Subtitle mask` navigation buttons, matching the existing lavender active treatment. Show one category in the right panel with approximately 28px padding. Put the credential status and password field in LLM; put the color control and inline preview in Subtitle mask. At widths of 640px or less, arrange the category buttons horizontally above the content and use 20px content padding.
- Show a 16:9 sample picture up to 480px wide inside the mask section, using the current media-stage visual treatment and a bottom subtitle-region rectangle in the draft color. Use the same normalized initial mask region as the video player. Keep the preview readable on narrow windows and identify it as `Preview`.
- Align the shared `Cancel` and `Save` at the bottom right in a fixed footer row, following the existing Story controls. Show field-specific feedback in the relevant panel and Saved/Error status in the sidebar so feedback remains discoverable across categories.

### Colors, typography, and controls

| Element | Existing style to follow |
| --- | --- |
| Surrounding workspace | `--workspace-bg` (`#101216`) |
| Dialog surface | `--workspace-panel` (`#171a20`) |
| Primary text | `--workspace-text` (`#edf0f5`) |
| Descriptions and status | `--workspace-muted` (`#a5adba`) |
| Preview outline | `--workspace-line` (`#30353f`) |
| Control borders | `--workspace-control-line` (`#535b6b`) |
| Save button and focus | `--workspace-accent` (`#bca4f8`) with `--workspace-accent-ink` text |
| Active navigation surface | `--workspace-accent-soft` (`#282337`) |

- Inherit the workspace system font stack. Use a 24px dialog title, 22px category heading, 14px navigation labels and descriptions, and approximately 13px labels and helper text.
- Match current Story inputs: dark inset surface, thin border, modest 5px radius, full available width, and approximately 40px minimum height. Present the native color control in the same form treatment.
- Reuse the primary-button and icon-button styles. Follow existing muted secondary buttons, disabled states, and lavender visible focus ring.
- Keep interface labels in English, consistent with Settings, Library, Content, and Vocab. Use plain text for configured, saved, and failed states so color is not the only indicator.

Style references: `src/workspace/workspace.css` (workspace tokens, navigation, controls, and target dialog), `src/workspace/story.css` (generation dialog and forms), and `src/workspace/StoryTargetsDialog.tsx` (modal structure and keyboard behavior).

## Integration constraints

- Reuse the host-owned encrypted credential mechanism; never return a saved key to the renderer.
- Story currently reads credential status on mount. Changes through Settings must refresh its status so a newly configured key enables generation without restarting.
- Existing subtitle-region geometry and enabled state are saved per video. Appearance configuration must not accidentally replace those learning records.
- Reuse the existing host SQLite settings table for the mask color and existing encrypted file for the credential. Validate color at the host boundary and retain black when no color has been saved. Existing learning data and saved keys require no destructive migration.

## Design completion

All scope questions are resolved and implementation is authorized. Results and verification boundaries are recorded in [Settings acceptance](acceptance.md).

## Acceptance criteria

1. Settings is accessible from Content and Vocab without requiring an imported material or selected vocabulary. Opening pauses current media without changing the playback position; closing does not resume it.
2. Existing profiles show their current credential status and black mask color. No stored key is returned to or displayed by the renderer.
3. Saving only a color retains the existing credential. Saving a valid replacement makes it available to all three cloud tasks and refreshes Story readiness without restart or automatic provider requests.
4. A saved color applies to enabled subtitle-region masks on current and other videos and survives restart. Disabled masks stay disabled. Region geometry, learning position, meaning-group masks, and retranscription behavior are preserved.
5. Changing color immediately updates a mask over a sample picture within Settings, including with an empty media library. Before saving, the actual video retains its saved color. Cancel, Escape, and the close button discard unsaved drafts; reopening displays saved state.
6. The former Story key form is replaced by a Settings shortcut without losing selected targets or topic. Existing draft protection and keyboard/focus behavior remain functional.
7. Exercise key-success/color-failure and color-success/key-failure. Each exposes accurate field status, applies the successful change, preserves the failed field's saved value, retains its draft for retry, and remains open. Cancelling after a partial save preserves successful changes. Invalid key or color data never replaces that field's saved value.
8. Visually compare Settings with the current Story and target-selection dialogs at normal desktop, narrow and short-window sizes. Confirm consistent colors, typography, borders, button states, and focus rings; accessible native title-bar controls; a visible inline preview; and no horizontal overflow. Verify left sidebar/right content on desktop, horizontal categories on narrow windows, preserved drafts and keyboard category switching, and visible Save/Cancel while content scrolls.

Verification reuses the host unit suite and a focused native Electron runner for modal behavior, real encrypted credentials and SQLite persistence, key-status refresh, cancellation, mask rendering, both partial-save failure directions, and process restart. See [Settings acceptance](acceptance.md) for commands, evidence, and limitations.

## References

- [Product specification](../../docs/PRODUCT_SPEC.md)
- [Project status](../../docs/PROJECT_STATUS.md)
- [Domain vocabulary](../../CONTEXT.md)
