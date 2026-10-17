# Frontend visual system and component consistency

Date: 2026-10-16
Status: ready-for-agent

## Problem Statement

The owner wants a more polished and visually consistent Inflow desktop interface. The priority is visual quality and a coherent style across the product, together with frontend code that makes future component additions, changes and removals easier to integrate consistently.

The current workspace already has a dark palette, purple accents and several shared controls. However, surface-specific styles still define their own colors and control treatments. Updating one screen or adding a component can therefore introduce inconsistent typography, spacing, states or visual hierarchy. Existing shared controls should be the starting point for improvement.

This is an owner-requested visual and maintenance improvement. Code inspection alone does not establish that the current interface has usability defects or that a proposed appearance has passed visual acceptance.

## Solution

Refine the existing dark, purple-accented desktop interface into one coherent visual system. Establish shared visual variables, reusable foundational controls and a short component contribution guide. Apply those conventions consistently while preserving existing feature entry points and learning flows.

Use compact tool areas and more spacious learning content. Improve typography hierarchy, spacing, surface differentiation, corners and interaction states as a coordinated whole. Adjust panel proportions, toolbar arrangement and component placement where necessary within the existing navigation and behavior.

Deliver in two stages:

1. Build representative, working visual samples in Listen, the vocabulary list and Settings, supported by the shared visual foundation. Present actual rendered evidence for owner review.
2. After the owner approves those samples, apply the accepted system to the remaining Library, Story, dialog, popover and notice surfaces. Complete consistency and behavior regression acceptance.

The primary window size is 1200 × 800, with additional acceptance at 1440 × 900 and 900 × 650. Smaller supported layouts may wrap, stack and scroll within regions so primary actions remain reachable. These targets do not introduce a new enforced minimum window size.

## User Stories

1. As a learner, I want the same dark visual language throughout Inflow, so that moving between learning areas feels coherent.
2. As a learner, I want purple accents to have a consistent role, so that emphasis and selected states are recognizable.
3. As a learner, I want clear typography hierarchy, so that titles, source text, translations, labels and secondary information are easy to distinguish.
4. As a learner, I want comfortable spacing around learning content, so that source text and generated passages remain readable.
5. As a learner, I want compact, consistently arranged tool areas, so that common controls remain accessible without crowding the content.
6. As a learner, I want panels, overlays and raised controls to have coherent visual depth, so that their relationships are clear.
7. As a learner, I want buttons with equivalent roles to look and behave consistently, so that familiar actions remain predictable.
8. As a learner, I want inputs, search fields and dropdowns to share visual conventions, so that entering and selecting information feels consistent.
9. As a learner, I want hover, focus, selected, disabled and loading states to be distinguishable, so that I can understand each control's availability and current state.
10. As a keyboard user, I want visible focus and preserved keyboard behavior, so that I can operate the redesigned interface without a pointer.
11. As a learner using Simplified Chinese or English, I want both interface languages to fit the same layouts, so that language selection does not reduce usability.
12. As a learner studying Korean or English, I want source-language text and Chinese assistance to remain readable, so that visual refinement preserves the learning material.
13. As a learner, I want Listen's media, transcript and playback tools to form a polished whole, so that the central learning workspace feels intentional.
14. As a learner, I want the vocabulary list and entry details to share the workspace conventions, so that browsing and editing entries feels integrated.
15. As a learner, I want Settings categories, fields and Save/Cancel actions to follow the same system, so that preferences feel like part of the application.
16. As a learner, I want the Library's search, filters, item rows and import action to be visually consistent, so that choosing learning material feels familiar.
17. As a learner, I want Story's reading content, vocabulary and Context areas to follow the system while retaining their reading hierarchy, so that generated passages remain comfortable to study.
18. As a learner, I want dialogs, collection popovers and menus to use coherent visual and focus conventions, so that temporary interactions feel integrated.
19. As a learner, I want notices, inline errors and full error details to remain clear and actionable, so that visual changes do not hide failure recovery.
20. As a learner with no material or a pending operation, I want empty, loading and failure states to match the rest of the interface, so that those states feel intentional.
21. As a learner using the default desktop window, I want the interface to fit 1200 × 800, so that the first-use layout is complete and usable.
22. As a learner using a larger window, I want the interface to remain balanced at 1440 × 900, so that additional space supports the content.
23. As a learner using a smaller window, I want primary actions to remain reachable at 900 × 650, so that reduced space does not block learning.
24. As a learner, I want my existing navigation and learning operations preserved, so that a visual update does not require relearning the application.
25. As a learner, I want source-text selection and meaning-group masks to retain their behavior, so that collecting words and intensive listening continue to work.
26. As a learner, I want subtitle-region masks to remain aligned with the actual video picture during resizing, so that layout changes do not expose the subtitles I chose to cover.
27. As a learner, I want resizing and collapsing Context to retain their behavior, so that layout refinement preserves my workspace controls.
28. As a learner, I want unsaved vocabulary, notes and Settings edits to retain their protections, so that navigating or closing overlays does not silently lose work.
29. As a learner, I want saved material, playback state, vocabulary and historical target vocabulary snapshots preserved, so that a visual update does not change my learning records.
30. As an application owner, I want to review Listen, the vocabulary list and Settings before wider migration, so that the visual direction can be corrected before it spreads.
31. As a frontend maintainer, I want one authoritative set of semantic visual variables, so that changing a shared visual decision updates its consumers consistently.
32. As a frontend maintainer, I want recurring controls to reuse shared implementations and states, so that new screens do not recreate incompatible versions.
33. As a frontend maintainer, I want a concise guide for adding, changing and removing components, so that future work follows the established visual and code conventions.
34. As a frontend maintainer, I want intentional component-specific exceptions to be explicit, so that reading typography and media geometry can differ without accidental style drift.
35. As a frontend maintainer, I want regression checks based on visible behavior, so that reorganizing internal markup or styles does not require rewriting tests that still describe correct behavior.

## Implementation Decisions

- **Preserve product behavior.** Keep Library, Content, Vocab and Settings entry points and existing Listen/Story navigation. Layout refinement may adjust proportions, spacing and control arrangement; navigation redesign and changes to learning operations require separate scope.
- **Extend the current frontend.** Retain React, Next.js, TypeScript, native browser capabilities and established repository conventions. Reuse the existing dropdown, search, notice, dialog and Context patterns. This effort does not require adopting a new UI framework, styling framework or component dependency.
- **Define one visual foundation.** Centralize semantic colors, surface levels, typography roles, spacing, control sizes, corners, borders, shadows and focus/interaction treatments. Reuse or consolidate existing variables rather than introducing a competing theme. Keep the dark palette and purple accent family; exact values and geometry are resolved through the working samples.
- **Preserve intentional differences.** Shared conventions do not require every region to have the same density or font. Compact utility regions and spacious learning content are deliberate. Preserve readable Korean, English and Chinese fallback behavior and the distinct hierarchy of source text, translations and generated passages.
- **Share recurring controls.** Consolidate repeated buttons, form fields, search, menus and modal framing where their visual role and behavior are genuinely shared. Keep domain-specific composition and state with the existing owners. Avoid single-use wrappers, a universal component factory or unrelated business-state refactoring.
- **Cover complete states.** Establish coherent normal, hover, focus, selected, disabled, loading and error treatments wherever each state applies. Preserve semantic HTML, accessible names, validation associations, keyboard interactions, focus restoration and existing reduced-motion behavior.
- **Migrate the full active surface area.** Include navigation, listening media and transcript areas, playback tools, both mask control types, Context, vocabulary list/detail/edit/notes, Library, Story, Settings, source-language confirmation, target selection, passage generation, word collection, menus and notices. Include empty/loading/failure states and both interface languages. Native operating-system dialogs retain their host-owned appearance and behavior.
- **Protect desktop integration.** Keep native title-bar drag regions, window-control clearance and the retained Inflow identity. Window targets are native window dimensions; record actual renderer viewport dimensions when collecting evidence.
- **Protect learning geometry.** Subtitle-region masks remain relative to the actual video picture, including letterboxing and window resize. Meaning-group masks preserve text layout. Native word selection, occurrence offsets, selection popover placement and resizable Context behavior remain intact.
- **Protect state ownership and persistence.** Do not change desktop bridge contracts, persistence schemas, processing or provider behavior. Preserve draft guards, navigation ordering, saved translations, mask preferences, vocabulary identity and historical target vocabulary snapshots. The change requires no learning-data migration.
- **Use the agreed delivery gate.** The initial executable milestone is the shared foundation and the three working samples. Wider migration follows owner visual approval. Foundation work needed for samples may affect shared consumers, but the initial stage must identify that impact and must not claim unreviewed surfaces as visually accepted.
- **Document component integration.** Provide a short English guide identifying the authoritative variables, shared controls, supported visual roles and states, responsive rules and exception policy. Explain how to add or remove a component without leaving duplicate styles, unused exports or orphaned shared code. Review new components against the same rendered acceptance criteria.

## Testing Decisions

- **Confirmed testing boundary.** On 2026-10-16 the owner approved using the actual desktop interface as the primary acceptance seam and reusing existing behavior tests. Do not add isolated tests that merely assert color values, CSS class names or component internals.
- **Prefer one high-level seam.** Exercise the rendered Electron application through visible controls, keyboard interaction and existing public bridge/persistence boundaries. Reuse deterministic fixture data and isolated profiles from existing native acceptance patterns; do not create private component-state access just for this work.
- **Judge external outcomes.** Good checks establish that content is readable, relevant controls are reachable, focus is visible, overlays are operable, drafts survive protected actions and stored learning state is preserved. Internal markup, stylesheet location and component names are implementation choices.
- **Sample acceptance.** Capture and inspect Listen, the vocabulary list and Settings at 1200 × 800, 1440 × 900 and 900 × 650 in Simplified Chinese and English. Include representative Korean/English source text and Chinese assistance, long labels and text, and populated and relevant empty/loading/error states. Evidence can be a focused set of screenshots plus interaction results; an exhaustive pixel snapshot for every state is unnecessary.
- **Layout outcomes.** Check that primary actions remain reachable, content does not overlap or get clipped, menus and dialogs remain accessible, and the application does not develop unintended horizontal page overflow. Verify wrapping, stacking and regional scrolling at the smaller target. Preserve title-bar control clearance and usable resize handles.
- **Whole-product acceptance after sample approval.** Inspect the remaining Library, Story, vocabulary detail, collection, generation and notice surfaces for adoption of the same roles and states. Record intentional exceptions and verify that no active surface retains an accidental competing palette or control treatment.
- **Interaction regression.** Exercise playback/segment navigation, translation visibility, meaning-group masking, native word collection and popover positioning, subtitle-region mask adjustment after resize, Context resize/collapse, vocabulary editing and notes, target selection and Story navigation, Settings Save/Cancel/partial failure, and bilingual notice/details behavior. Use existing behavior coverage where it already establishes these outcomes; add focused checks only for new behavior or a demonstrated regression.
- **Prior art.** Existing task-level native acceptance drivers use the real renderer, public bridge, isolated SQLite profiles, deterministic external results, keyboard actions and restart checks. Relevant records include [Settings](../archive/settings/acceptance.md), [vocabulary completion](../vocab-ui/acceptance.md), [interface internationalization](../i18n/acceptance.md), [navigation and notices](../story-navigation-notices/acceptance.md), and [frontend visual acceptance](../archive/frontend-workspace/visual-acceptance.md). Existing unit tests cover listening rules, mask geometry, request validation and desktop persistence; preserve those seams instead of duplicating them in component tests.
- **Review old drivers before reuse.** Historical frontend layout assertions include Context expectations that predate its current collapse behavior. Reuse their useful acceptance patterns after reconciling expectations with current contracts. Archived commands are historical evidence, not maintained executable entry points.
- **Code verification during implementation.** Run the existing tests, lint, typecheck and desktop renderer/host build appropriate to the completed change. These are future implementation checks; publishing this specification does not establish that they passed.
- **Honest visual evidence.** Native screenshot capture has previously failed with `UnknownVizError`. If capture remains unavailable, preserve reproducible failure evidence and record which geometry/keyboard checks passed. Computed geometry alone cannot establish visual approval; owner inspection or usable rendered captures are still needed before the visual gate is complete.
- **Maintenance acceptance.** Review the migrated consumers and the component guide together: recurring controls and semantic visual choices must resolve to the shared foundation, and exceptions must have a concrete reason. This establishes a maintainable default, not a guarantee that arbitrary future changes cannot break the interface.

## Out of Scope

- New learning features, removed learning capabilities, reorganized top-level navigation or redesigned learning workflows.
- Light mode, additional themes, a new logo, a new brand identity or a user-facing theme editor.
- A general component library product, component playground, new visual-test platform or speculative abstraction layer.
- Unrelated frontend business-state rewrites, backend changes, desktop bridge/API changes or database migrations.
- Mobile/PWA support, additional platforms, accounts or synchronization.
- Replacing native file-selection or deletion-confirmation dialogs solely to restyle them.
- Live provider/model quality evaluation, media codec qualification and audible speech-quality assessment.
- Installer/package release qualification and closure of existing maximized-window or screen-reader release checks. Existing accessibility behavior must still be preserved, and newly discovered regressions remain in scope.
- Changing the app's behavior below the agreed acceptance sizes or imposing a minimum window size. Existing narrower layouts should retain their behavior where touched; a broader small-window support commitment requires separate scope.
- Cleanup of unrelated legacy files, data, uploads or pre-existing dead code.

## Further Notes

- This specification synthesizes the owner's confirmed Q1–Q7 decisions and the subsequent explicit testing-boundary confirmation. No additional interview or implementation approval is required to start the initial sample milestone. Owner approval of actual visual samples remains required before broader migration.
- The current default desktop window is 1200 × 800. Existing styles include narrower-window layouts, but no host minimum window size was found; the three acceptance targets are the agreed design scope rather than a previously documented support guarantee.
- The source checkout contains uncommitted frontend and Context-sidebar changes made before this specification. Treat the current checkout as the implementation baseline and preserve unrelated edits. Do not roll those changes back or assume the earlier committed layout is authoritative.
- Status `ready-for-agent` means the initial sample milestone is specified and executable. It does not mean samples are visually approved, full migration is complete, or any runtime check has passed.
- Implementation update, 2026-10-17: the initial semantic tokens, shared CSS control roles and consumer migration are implemented, with a component maintenance guide. Owner visual approval and exact-window-size acceptance remain pending. Review found that samples labeled 1200 × 800, 1440 × 900 and 900 × 650 were actually 1230 × 895, 1470 × 995 and 930 × 745, respectively; the capture script supplied those larger window dimensions. At the owner's request, the temporary screenshots, fixture bridge and capture script were removed. Future visual evidence must record native window and renderer viewport dimensions rather than relying on filenames.
- Verification, 2026-10-17: all 83 tests and the desktop renderer/host build passed under WSL Node.js 24.18.0; Windows typecheck and the staged whitespace check passed. Windows tests could not load the installed Linux-only esbuild binary, so the successful test run used the matching WSL environment without changing dependencies. Full lint on both Windows and WSL reports two existing errors: `react-hooks/refs` in VideoStage and `react-hooks/set-state-in-effect` in useVocabulary. Both source files, lint configuration and dependency manifests are unchanged from HEAD. These lint errors remain unresolved; native interaction, exact-window-size visual and installed-package acceptance were not rerun.
- Keep acceptance evidence and sample feedback with this effort. On completion, record resulting behavior in the canonical project status; do not rewrite current behavior as though the proposed visual system were already implemented.
- Related product boundaries are defined in [Product Specification](../../docs/PRODUCT_SPEC.md), current implementation in [Project Status](../../docs/PROJECT_STATUS.md), and domain vocabulary in [Context](../../CONTEXT.md).
