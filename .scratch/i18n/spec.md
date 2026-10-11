# Interface internationalization

Date: 2026-10-11
Status: resolved
Delivery: Implemented and source-checkout verified on `codex/i18n`; see [acceptance](acceptance.md).

## Problem Statement

Inflow currently combines English interface labels, Chinese application errors and native dialogs, and a Chinese document language. Learners cannot select a consistent interface language. This makes navigation, accessibility labels and failure recovery inconsistent even though Korean and English learning content already has a defined source language.

Interface language must be independent of source language and the Chinese used for contextual meanings and sentence translations. Changing the interface must preserve the learner's existing material and learning state.

## Solution

Provide Simplified Chinese and English interfaces throughout Listen, Vocab, Story, the material libraries, Settings and native desktop dialogs. Localize application-owned labels, help, placeholders, tooltips, accessible names, confirmations, status messages and errors. Format interface dates and quantity wording in the selected language.

When there is no saved preference, use Simplified Chinese for a Chinese system language and English otherwise. A saved choice takes precedence on subsequent launches. Settings gains an interface-language choice: Save persists it and immediately applies it without a restart; Cancel discards the draft. Desktop preferences use the existing SQLite settings store; browser development preferences use browser-local storage independently.

Source media, learning transcripts and generated passages remain in their confirmed Korean or English source language. Contextual meanings and sentence translations, including translations saved with learning artifacts, remain Chinese. Interface switching neither regenerates nor rewrites learning content.

## User Stories

1. As a learner, I want Simplified Chinese navigation, so that I can use the application in Chinese.
2. As a learner, I want English navigation, so that I can use the application in English.
3. As a first-time learner on a Chinese system, I want a Simplified Chinese default, so that setup is understandable.
4. As a first-time learner on another system, I want an English default, so that the application starts with a supported language.
5. As a returning learner, I want my saved language to override the system default, so that my preference remains stable.
6. As a learner, I want to choose an interface language in Settings, so that I can change it from the existing settings workflow.
7. As a learner, I want Save to apply the language immediately, so that I can continue without restarting.
8. As a learner, I want Cancel to discard an unsaved language choice, so that exploring Settings does not change my preference.
9. As a learner, I want a failed preference save to retain my draft and explain the failure, so that I can retry.
10. As a desktop learner, I want the language to survive application restart, so that I do not repeat setup.
11. As a browser user, I want my language to survive a reload in the same browser, so that development-mode use remains consistent.
12. As a learner, I want import and relink dialogs in my selected interface language, so that I can choose source media confidently.
13. As a learner, I want source-language choices labeled in my interface language, so that I can distinguish Korean and English without changing their identity.
14. As a learner, I want Listen controls and help in my interface language, so that I can use playback and meaning-group masks.
15. As a learner, I want subtitle-region mask settings and instructions in my interface language, so that I can cover video subtitles.
16. As a learner, I want vocabulary selection, editing, notes and deletion prompts in my interface language, so that I can manage the vocabulary notebook.
17. As a learner, I want pronunciation availability and failure feedback in my interface language, so that I understand what to do next.
18. As a learner, I want Story generation, target vocabulary selection and mixed-source-language guidance in my interface language, so that I can generate a learning artifact.
19. As a learner, I want library filters, empty states, dates and counts in my interface language, so that saved material is easy to find.
20. As a learner, I want credential and processing-model settings in my interface language, so that I can configure the application and recover from setup failures.
21. As a screen-reader user, I want accessible names and the document language to match the interface, so that controls are announced correctly.
22. As a learner, I want application-owned errors in my interface language, so that recovery guidance is understandable.
23. As a learner, I want external failure details retained alongside localized guidance, so that diagnostic information is available.
24. As a learner, I want Korean and English source text to remain unchanged when I switch the interface, so that the material I study remains accurate.
25. As a learner, I want Chinese contextual meanings and sentence translations to remain unchanged, so that interface switching does not alter learning assistance.
26. As a learner, I want switching to preserve playback position, masks, notebook entries, notes and selected target vocabulary, so that I can continue learning.
27. As a learner with existing data, I want language preferences added without losing older settings or material, so that upgrading is safe.
28. As a maintainer, I want missing translations detected and readable fallback text, so that incomplete translations do not produce blank or broken controls.

## Implementation Decisions

- Support exactly two interface locales: Simplified Chinese (`zh-CN`) and English (`en`). Keep this type distinct from the Korean/English source-language type.
- Use TypeScript bilingual message dictionaries and React Context for the shared renderer language. Use native `Intl` for interface formatting. Add no dependency, locale route, or URL-language prefix.
- Both dictionaries share message identifiers and compatible interpolation parameters. Variable counts, names and other values remain parameters rather than separately hardcoded sentence fragments. Missing translations fall back to English and are detected by a completeness check.
- When there is no saved locale, resolve the desktop default from the system language and the browser default from the browser language. Chinese language variants resolve to Simplified Chinese; all other languages resolve to English. A valid saved locale takes precedence.
- Extend the existing application settings contract and SQLite key/value persistence with interface language. This needs no learning-data schema migration. Existing callers saving only subtitle-region mask appearance must preserve the saved language; language-only saves must preserve the color.
- Validate submitted locale values at persistence and IPC trust boundaries. Reject unsupported saves without overwriting valid preferences. Existing profiles with no locale resolve a supported default.
- Keep browser language preferences in browser-local storage; they do not synchronize with desktop preferences. Browser language saving must work even when the desktop bridge is unavailable. Desktop-only settings retain their existing host requirements.
- Add interface language to the existing Settings category layout and shared Save/Cancel workflow. Changing the selector edits a draft, with no interface-language preview. Apply the locale after a successful save, without reloading the workspace.
- Preserve the existing partial-save behavior across Settings categories: retain successful changes, identify failed categories, keep failed drafts for retry, and navigate to a failing category. Keep credential replacement, draft protection and playback pause behavior intact.
- Consume the shared locale throughout navigation, Listen, Vocab, Story, library surfaces, Settings and supporting hooks. Cover visible text and application-owned accessibility labels, document language and descriptive metadata. Preserve source-language annotations on learning text.
- Use the saved or resolved desktop locale for application-owned native dialog text, titles, buttons and file-filter labels. Native operating-system controls and external messages remain under their respective owners' language settings.
- Application-owned renderer, host and browser API errors receive bilingual messages. Preserve external system/provider/model error text as data and display localized failure guidance alongside it; do not automatically translate external diagnostics or model output.
- Update interface date formatting and singular/plural quantity wording with the locale. Keep playback timecodes and learning values semantically unchanged.
- Include shared locale resources in the existing renderer and desktop build staging. Adjust affected tests and fixtures for the extended settings contract. Verification drivers that depend on English labels must explicitly select English or use existing stable selectors.
- Switching locale preserves material identities, learning transcript content, sentence translations, Chinese contextual meanings, vocabulary notes and sources, generated passage content, historical target snapshots and selected target vocabulary. It must not reset playback state, masks, filters or protected drafts.

## Testing Decisions

The owner confirmed these test seams during specification publication: the existing desktop operations interface for persistence and compatibility; native desktop and browser interface acceptance for the learner-visible flow; and a small shared-message check for completeness.

- Test observable behavior and persisted outcomes, rather than React Context internals, dictionary file layout or component implementation details. Reuse existing seams instead of adding test-only production interfaces.
- Extend the existing desktop settings tests that use a temporary library, reopen desktop operations and assert retained learning state. Cover absent preferences, both saved languages, restart, rejected unsupported locales, and color-only/language-only updates preserving the other preference.
- Cover locale resolution through a small deterministic shared test: Chinese language variants, non-Chinese languages and saved preference precedence. Check dictionary identifier coverage, interpolation compatibility and English fallback behavior.
- Use the existing isolated native acceptance approach with deterministic processing and provider fixtures. Verify both languages across Listen, Vocab, Story, libraries and Settings, including representative status, validation, confirmation and failure paths. Pin fixture locale deliberately instead of relying on the test machine's system language.
- Verify Settings draft selection, Cancel, successful Save, failed save/retry and partial category saves. Confirm switching without restart and restoring the saved choice in a second desktop process.
- Verify native import/relink dialog text in both locales without changing the separate confirmed source language or last-used import-language preference.
- Verify browser language saving and reload without a desktop bridge, independently of desktop preferences.
- Check document language, accessible names, date/count formatting and usable layout in both locales. Compare learning content and retained state before and after switching, including Chinese assistance for both source languages.
- Verify application errors are localized and external diagnostics remain readable with localized guidance. Preserve security and validation behavior while changing error presentation.
- Run the relevant unit suite, TypeScript checks and desktop renderer/host build. Ensure new locale resources are staged and existing settings consumers and verification fixtures remain compatible. Record actual checks and limits when implementation is delivered; this specification is not acceptance evidence.

## Out of Scope

- A Korean interface, Traditional Chinese catalog, or other interface languages.
- Changing Chinese contextual meanings or sentence translations to match the interface language.
- Retranscription, regeneration, translation backfills or rewriting existing learning records during switching.
- Automatic translation of external error details, model output, source text or learner-authored content.
- Accounts, cross-device or cross-runtime preference synchronization.
- Language-prefixed routes, translation services, catalog management tools, or a new i18n dependency.
- Live language preview in Settings, a restart requirement, or unrelated Settings redesign.
- Changes to transcription, dictionary, generation or pronunciation providers and resource installation.
- Fixing the separately recorded artifact request-ordering risk or unrelated product work.
- Installed-package release acceptance, installer publication or deployment in this implementation effort.

## Further Notes

- Scope, locale defaults, saving semantics, browser behavior, implementation approach and external-error handling were confirmed in the i18n interview. This specification records intended behavior; [acceptance](acceptance.md) records the delivered checks and limits.
- Settings compatibility, untranslated host failures and build staging are the main integration risks. A label-only renderer change does not satisfy this specification.
- Use the repository glossary for learning-domain terms. Interface language is an application preference, separate from source language and the Chinese used for contextual meanings.
- Current runtime behavior is recorded in the project status; implementation tickets and final acceptance are resolved for this source-checkout delivery.
