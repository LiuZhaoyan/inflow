# Frontend component guide

How to add, change and remove workspace UI without creating a second visual language.
The rendered desktop interface is the acceptance surface; this guide describes the code
conventions that keep it coherent.

## Authoritative tokens

`src/workspace/tokens.css` is the single source for color, surface, corner, control-size,
spacing, type and depth decisions, declared on `.workspace-shell`. Every workspace surface
is rendered inside that shell, so the tokens are always in scope. Do not declare a local
palette, radius scale or type scale beside them, and do not add a second name for an
existing role.

| Group | Tokens | Use |
| --- | --- | --- |
| Surfaces | `--workspace-bg`, `--workspace-panel`, `--workspace-raised`, `--workspace-overlay`, `--workspace-sunken` | Page, panel, raised control, menu/popover and input-well backgrounds |
| Lines | `--workspace-line`, `--workspace-line-soft`, `--workspace-control-line` | Region dividers, list-row separators, control borders |
| Text | `--workspace-text`, `--workspace-muted`, `--workspace-faint` | Primary content, secondary information, placeholders and disabled-looking text |
| Accent | `--workspace-accent`, `--workspace-accent-hover`, `--workspace-accent-soft`, `--workspace-accent-line`, `--workspace-accent-ink` | Emphasis, selected state, selection surfaces, selected borders, text on accent fills |
| Badge | `--workspace-badge-bg`, `--workspace-badge-line`, `--workspace-badge-text` | Language badges in list rows and source labels |
| Feedback | `--workspace-danger-*`, `--workspace-success-*`, `--workspace-backdrop` | Errors, success notices, modal backdrops |
| Geometry | `--radius-*`, `--control-sm/md/lg`, `--space-*` | Corners, control heights, padding and gaps |
| Type | `--text-2xs` … `--text-3xl`, `--text-reading`, `--weight-*` | Captions, labels, body, titles, reading text, emphasis |
| Depth | `--shadow-overlay`, `--shadow-dialog`, `--focus-ring` | Menus, dialogs, focus outline |

`--text-reading` and the video-stage geometry stay fluid on purpose: reading text and the
video picture must keep their own proportions.

## Shared controls

Use these roles before writing per-surface CSS.

- `.workspace-button` with `.workspace-button--primary` (one accent-filled action per region),
  `.workspace-button--secondary` (bordered action on a raised surface), `.workspace-button--ghost`
  (inline accent action) and `.workspace-button--danger` (destructive text).
- `.workspace-field` for text inputs, selects and textareas.
- `.workspace-icon-button` for square icon-only buttons.
- `.inflow-search-field` (`SearchField.tsx`) for search.
- `.inflow-dropdown` (`Dropdown.tsx`) for selectors and menus.
- `.app-notice` (`Notice.tsx`) for errors, status and success messages.
- `.workspace-language-badge` for language labels.

States are part of the role, not the caller: hover, focus-visible, disabled, selected
(`aria-pressed` / `aria-current`), loading text and error (`.app-notice` or the
`--workspace-danger-*` tokens) are defined once on the shared class. Keep semantic HTML,
accessible names, `aria-describedby`/`aria-invalid` associations, keyboard interaction
and focus restoration when swapping a control for a shared one.

## Adding or removing a component

1. Check the table and the shared controls first. If an existing role fits, reuse it and
   pass only layout through a caller class.
2. If a new role is genuinely needed, add it once to `tokens.css` and use it in at least the
   surfaces that need it in the same change. Do not add a single-use wrapper, a universal
   component factory, or a new dependency for a few lines.
3. Give the new element the states it can actually reach, using the shared token names.
4. When a control is replaced or a component is deleted, delete its old CSS rule, its
   `!important` overrides and its exports in the same commit. Leaving both the old and the new
   treatment is how a competing palette appears.
5. Re-check the change by rendering the desktop interface at 1200 × 800, 1440 × 900 and
   900 × 650 in Simplified Chinese and English before calling it done.

## Responsive rules

- 1200 × 800 is the primary window: the workspace fits the viewport with no page scroll.
- 1440 × 900 gives the content more room; panel proportions stay as they are.
- 900 × 650 is the smallest agreed target. Below 900px wide the Content workspace stacks the
  Context panel under the player and the page scrolls vertically; regions may wrap, stack and
  scroll internally, but primary actions stay reachable and horizontal page overflow is a defect.
- Keep the native title-bar clearance (`env(titlebar-area-*)`) and the resizable dividers intact.

## Intentional exceptions

Compact utility regions and spacious learning content are deliberately different. Keep these
differences explicit and documented next to the rule, not silent:

- Reading typography: `.workspace-sentence-text` and `.artifact-korean` keep serif/reading
  treatment and `--text-reading`.
- Media geometry: the video stage, subtitle mask and thumbnails keep their own aspect-ratio
  and picture-relative rules.
- Tool areas: the Listen mask controls, the vocabulary filter group, list rows and the inline
  "Open source" action are compact by design; they consume tokens but not the full button size.
- Native operating-system dialogs keep their host appearance.

An exception is allowed when the surface has a concrete reason (reading hierarchy, media
geometry, a dense row). A new color or geometry value that repeats on two surfaces is not an
exception — it belongs in the token set.

## Verification

Rendered acceptance uses the real interface, not unit tests of styles. The
[frontend visual system specification](../.scratch/frontend-design-system/spec.md) defines
the sample review and window-size acceptance requirements. Behavior coverage for listening
rules, mask geometry, request validation and desktop persistence stays in the existing
`*.test.ts` files.
