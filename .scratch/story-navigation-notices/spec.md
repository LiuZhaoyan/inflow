# Learning artifact navigation consistency and unified notices

Date: 2026-10-11
Status: implemented
Scope: Desktop Story navigation, learning artifact persistence, and application-owned feedback UI
Decision state: Q1–Q14 implemented and passed source-checkout acceptance on 2026-10-12. See [acceptance](acceptance.md) for evidence and release limitations.

## Problem Statement

As a learner, I can request a different saved learning artifact from Library, Story history, or a vocabulary source. Those requests may complete out of order, and the host currently records an opened artifact before the reading view decides whether to accept the result. Consequently, under controlled delayed replies the visible Story and the learning artifact restored from SQLite can disagree. A navigation started before an edit may also persist even though newly unsaved vocabulary edits subsequently block the visible switch. This is a demonstrated timing risk in historical controlled verification, not a confirmed routine-use defect.

Across Listen, Story, Vocabulary notebook, Library and Settings, application-owned errors currently use different treatments and placements. Some messages are long, difficult to scan, or force large blocks of text onto a compact desktop layout.

## Solution

The learner's **latest valid navigation intent** controls which learning artifact becomes active. Loading preserves the current Story. The app treats a switch as accepted only after its eligibility is rechecked and the host has successfully committed its selection; a failed, superseded or canceled request must not change the accepted view or saved selection. A genuinely unsaved edit arising while an artifact request is pending **permanently cancels that request**, without sacrificing the draft. Leaving Story also cancels pending Story navigation. A newly generated passage is always retained if generation succeeds, but the automatic jump to it is independently subject to the same draft and navigation rules.

Provide one reusable error/notice UI module throughout the desktop app: a compact, single-line, soft pink-on-dark-purple notification, available in contextual inline and non-blocking floating presentations. Long text is ellipsized within a maximum width and is fully accessible on activation. Transient feedback disappears after about five seconds; actionable errors persist until resolved or dismissed. Interface language continues to control application-owned messaging while original source-language content and Chinese contextual meaning remain unchanged.

## User Stories

1. As a learner reading Story A, I want Story A to stay visible while Story B loads, so that loading never blanks my reading view.
2. As a learner, I want lightweight loading feedback while opening another Story, so that I know the switch is pending.
3. As a learner, I want a successful Story switch to display the correct saved passage, so that I can continue reading confidently.
4. As a learner, I want the most recent valid Story choice to win when I select A, B and C quickly, so that an earlier slow result cannot unexpectedly replace C.
5. As a learner, I want a superseded Story response to have no visible effect, so that the reader follows my latest intention.
6. As a learner, I want a superseded Story response to have no later persistence effect, so that reopening the app restores the intended Story.
7. As a learner, I want switching from Library and switching from Story history to obey identical ordering rules, so that the entry point does not affect correctness.
8. As a learner, I want opening a Story from a vocabulary source to follow the same navigation rules, so that the correct original sentence opens without stale navigation.
9. As a learner, I want an ordinary view-only edit action not to cancel a pending Story switch, so that opening an editor without changing content has no unintended effect.
10. As a learner, I want an actual modification that produces an unsaved vocabulary draft to cancel a pending switch, so that my changes remain protected.
11. As a learner, I want my unsaved vocabulary draft preserved after that cancellation, so that I can finish or discard it deliberately.
12. As a learner, I want the original Story to remain visible after a draft-triggered cancellation, so that the app does not move me unexpectedly.
13. As a learner, I want the previously accepted Story to remain the saved current Story after cancellation, so that a restart does not silently switch content.
14. As a learner, I want a canceled switch to remain canceled even if I immediately save or discard the draft, so that a stale request never unexpectedly resumes.
15. As a learner, I want a short non-blocking explanation when an unsaved edit cancels navigation, so that I understand why the Story did not change.
16. As a learner, I want the navigation cancellation notice to require no confirmation, so that my editing is uninterrupted.
17. As a learner, I want leaving Story for Vocabulary or another view to cancel a pending Story switch, so that a late result cannot send me back to Story.
18. As a learner, I want the last accepted Story to remain restorable after I leave Story while another Story is loading, so that I return to a stable selection.
19. As a learner, I want failed Story reading to keep the original Story visible and saved, so that loading errors do not destroy my reading position.
20. As a learner, I want an error from a failed Story read without an automatic repeat attempt, so that I control when to retry.
21. As a learner, I want a Story selection save failure to leave both the visible and persisted selection unchanged, so that the app never reports an uncommitted switch as successful.
22. As a learner, I want a restart after an interrupted switch to restore the last successfully committed Story, so that an unfinished request is not replayed.
23. As a learner, I want a crash after Story B was durably committed to restore B, so that the persisted result determines recovery even if the screen had not yet updated.
24. As a learner, I want a crash before B's commit to restore A, so that an uncommitted intent is not treated as accepted.
25. As a learner, I want newly generated passages to remain saved when generation succeeds, so that I do not lose work because navigation was canceled.
26. As a learner editing vocabulary during generation, I want automatic navigation to the newly generated passage canceled while keeping the generated passage in Library, so that my draft remains visible.
27. As a learner without conflicting edits, I want successful generation to continue opening and remembering the generated passage, so that the usual learning loop still works.
28. As a learner, I want previous learning artifacts, target vocabulary snapshots, collected source contexts and translations untouched by canceled navigation, so that historical learning data is preserved.
29. As a learner, I want error messages across Listen, Story, Vocabulary notebook, Library and Settings to share a consistent visual identity, so that failures are recognizable.
30. As a learner, I want the error surface to match Inflow's purple theme with a subdued pink background, border and text, so that notices fit the interface without dominating it.
31. As a learner, I want notices to show one line only, with an icon, concise text and close affordance, so that they use minimal space.
32. As a learner, I want compact notices sized to their contents up to an approximate 370px limit and 44px height, so that long text does not widen or wrap the interface.
33. As a learner, I want long notices to truncate with an ellipsis, so that layout remains stable.
34. As a learner, I want to activate a truncated notice and read the entire safely presented diagnostic, so that important troubleshooting content is not lost.
35. As a learner, I want the full diagnostic view to be usable by keyboard and assistive technology, so that truncation does not reduce accessibility.
36. As a learner, I want short-lived feedback (including a draft-triggered navigation cancellation) to disappear after about five seconds, so that it does not obstruct later actions.
37. As a learner, I want to dismiss transient notices manually, so that I control visual clutter.
38. As a learner, I want errors that still require action, such as save failures or missing models, to remain visible until resolved or explicitly dismissed, so that I do not miss necessary remediation.
39. As a learner, I want an error tied to a form field or Settings category displayed inline beside its relevant action, so that I know what needs correction.
40. As a learner, I want general non-blocking operation failures and cancellations displayed as floating notices in the upper-right area, so that I can continue using the app.
41. As a learner, I want both inline and floating notices to share the same appearance and accessibility rules, so that message location does not create inconsistent semantics.
42. As a learner, I want the same notice module to support positive outcomes with distinct semantic styling when needed, so that future success feedback can remain consistent without being mistaken for an error.
43. As a learner using the Simplified Chinese or English interface, I want application-owned error and notice text to follow my interface language, so that switching locale changes its presentation without affecting content.
44. As a learner, I want external failure details preserved where safe alongside localized guidance, so that useful diagnostics are still available without leaking credentials or secrets.
45. As a learner, I want existing field-level validation links, Retry actions and unsaved-note protection to keep working after adopting unified notices, so that visual consistency does not remove remedies.
46. As a learner, I want source media, playback segments, Chinese meanings and generated-passage text unaffected by these changes, so that my learning workflow remains intact.

## Implementation Decisions

- **Navigation module:** Deepen the existing learning artifact ownership module rather than add a parallel generic navigation framework. Keep artifact restoration, list ownership, generation lifecycle and cancellation behind the established module seam; preserve reader-local sentence, translation visibility, filtering, scrolling and topic state.
- **One navigation rule:** Library selection, history selection, vocabulary-source navigation and automatic navigation after generation use one latest-valid-intent acceptance policy. Each incoming valid intent supersedes pending older ones; even if the newer request fails, the older request cannot become current later.
- **No speculative switch:** Preserve the last accepted learning artifact during loading. Do not clear the reader or set the saved current artifact solely because a read was requested.
- **Dirty draft gate:** Opening an editor is not a dirty state. A real content change creating unsaved work while navigation is pending cancels it irreversibly, even if the draft is saved immediately afterwards. Preserve draft and prior reader selection.
- **View-change gate:** Leaving Story invalidates pending Story navigation. Late results must not take focus, reopen Story or persist a new selection.
- **Read vs acceptance:** Do not couple candidate artifact lookup to immediately changing the saved current artifact. A successful commit to the existing current-artifact setting belongs to acceptance of the latest eligible intent, not to an abandoned read.
- **Persistence semantics:** If reading or committing fails, preserve the previously accepted visible and persisted Story; report an actionable error and do not auto-retry. Once a selection commits successfully, it becomes the durable recovery source. An unavoidable crash between database commit and UI paint may restore the new Story on restart.
- **Race discipline:** A new intent, newly dirty draft or view departure must not permit an obsolete host-side write to win later. Keep navigation and saved-current-artifact ordering consistent through the existing host/renderer seam; do not treat suppressing a stale renderer result as sufficient.
- **Generation:** Keep successful passage creation, target snapshots, annotations and historical semantics atomic as before. Separate saved passage creation from acceptance of the newly generated passage as the current Story. Canceled automatic navigation must never discard a successfully generated artifact.
- **Schema:** Keep existing SQLite learning artifact and current-selection data unless an implementation proves an additive change indispensable. No schema migration or new distributed infrastructure is intended.
- **Notice module:** Introduce one reusable, application-owned error/notice UI module, with inline and floating placement variants instead of separate styling implementations for each area. Existing callers retain domain-specific message ownership and actionable controls.
- **Notice look:** Dark dusty-purple/pink background approximately `#392832`, subdued pink border `#98627F`, pale pink foreground, coherent with Inflow's violet palette. The visual should be compact, not a multi-row card: single line, status icon + text + dismiss affordance, no separate title.
- **Notice size:** Content-sized width with roughly a 370px maximum, ~44px height, no text wrapping. Clip overflow with an ellipsis without discarding underlying content. Preserve a usable minimum tap/click and keyboard target.
- **Expanded diagnostics:** Activating the shortened message reveals the full localized, sanitized error in a non-obstructive accessible detail view; the one-line notice itself never expands into wrapped text. Do not expose secrets or raw unfiltered provider payloads.
- **Notice lifetime:** Transient messages auto-dismiss after approximately five seconds and can be dismissed manually. Errors requiring action persist until resolution or explicit dismissal. Non-blocking canceled-navigation feedback uses the floating variant; field-specific errors remain inline and keep their Retry/help relationships.
- **Success variant:** Reuse the visual module for ordinary positive outcomes if needed with a distinct semantic palette, but do not recolor success as an error or expand this into a redesign of all status indicators.
- **Localization:** Reuse existing bilingual message and owned-error interpretation behavior; source-language material and Chinese contextual assistance do not change. Do not regress external-diagnostic retention or credential redaction.
- **No new adapter without need:** Prefer existing desktop host and browser adapters. Do not introduce speculative interfaces just to make isolated tests possible.
- **Status and persistence:** Do not modify or commit source code as part of authoring this spec. The actual implementation and acceptance are follow-up work.

## Testing Decisions

- **Test principle:** Exercise observable learner behavior through the highest practical seam: a real renderer-driven Electron desktop flow backed by isolated SQLite, with controllable host response ordering and failure injection. The interface is the test surface. Tests must not assert incidental hook state, timer implementation, or internal request-map shapes.
- **Primary navigation seam:** Exercise actual Library/history/vocabulary-source and generated-passage navigation through the existing renderer ↔ Electron host workflow. Observe both displayed passage and the passage restored after reload and fresh-process restart.
- **Persistence seam:** Use the existing SQLite-owning learning artifact operations via the same public desktop bridge to verify commits, rejected writes and retained selected artifact. Keep transactional learning data and provenance coverage.
- **Notice seam:** Render notices in the real workspace with the existing bilingual interface, then verify inline versus floating position, semantics, dismissal, accessible full diagnostic, clipping and timer behavior from the user perspective.
- **Ordering tests:** Gate A and B read/reply/commit completions independently, check A→B, A→B→C, mixed Library/history/source requests, and that newer failure never resurrects stale A.
- **Draft tests:** Cover no-edit opening, actual unsaved Vocabulary entry or note edits while a request is pending, save/discard after cancellation, draft retention and absence of a persisted navigation.
- **Departure tests:** Leave Story for Vocabulary or another page while a request is pending; late completions must neither switch the view nor save the abandoned selection.
- **Failure tests:** Failed read, injected SQLite selection commit failure and safe retry by explicit new selection; the old Story and saved current artifact remain unchanged.
- **Recovery tests:** Reload and restart after stale replies, canceled navigations, successful commit and an interrupted commit timeline. Persisted selection is the recovery authority; do not require pre-crash paint after the commit.
- **Generation tests:** Preserve successful generated passage even if auto-navigation is blocked by a dirty draft; verify Library inclusion, current Story not changed, retained target vocabulary snapshots and normal automatic navigation when no conflict exists.
- **Notice tests:** Check a transient canceled-navigation notice does not block input, vanishes after ~5s, and has a functional close affordance; persistent error remains until resolved/dismissed; clicking or keyboard-activating truncated content opens full sanitized details.
- **Layout tests:** Validate maximum width around 370px, approximately 44px height, no wrapping, icon and close affordance, compact/narrow desktop layouts, and the dark pink-violet palette in inline and floating variants.
- **Accessibility and localization tests:** Check alert/status semantics as appropriate, focus/keyboard operation, full-error access, inline form field associations, English/Simplified Chinese notices, locale changes and no lost external diagnostics.
- **Regression coverage:** Keep vocabulary context navigation, note draft protection, sentence playback, source media and translation state, artifact generation snapshots, IPC trust checks and existing host error ownership coverage intact.
- **Prior art:** The project's existing learning artifact host tests, Electron IPC guard tests, isolated native Electron/SQLite Story acceptance, archived controlled request-ordering investigation, Vocabulary completion acceptance, and bilingual interface acceptance. Verify historical scripts still exist before attempting to reuse them.
- **Verification run:** Targeted tests first, then lint, typecheck, desktop build and native acceptance in an isolated profile. Distinguish controlled timing verification from any claim of frequency in ordinary real-world use.

## Out of Scope

- Overhauling generated passage quality, translation providers, local transcription, dictionary disambiguation, model downloads or source-language support.
- Changes to learning artifact target snapshots, vocabulary identity/provenance, transcript or source media storage beyond what is essential to preserving navigation correctness.
- A new global navigation framework, generic task scheduler, global state library, networked backend, or database architecture replacement.
- Automatic retry of a failed Story navigation or restoring a canceled navigation after the edit is saved.
- A blocking confirmation modal when edits cancel Story navigation.
- An overhaul of every normal informational/success/loading display; only application-owned error/notice surfaces require unification, with optional reuse for success.
- Redesign of native OS file picker dialogs or technical errors owned by the operating system.
- New permanent notification inbox, logging/telemetry provider or synchronization across devices.

## Further Notes

- **Owner-approved decisions:** Q1 actual edits cancel; Q2 latest valid intent wins; Q3 non-blocking cancellation notice; Q4 keep current Story during load; Q5 failed load retains current state without auto-retry; Q6 leaving Story cancels; Q7 canceled navigation never resumes automatically; Q8 commit failure rejects switch; Q9 last committed Story defines crash recovery; Q10 passage creation survives blocked automatic navigation; Q11 shared app-wide notice appearance; Q12 inline + floating variants; Q13 transient ~5 seconds versus persistent actionable errors; Q14 no wrapping and click to view full content.
- **Domain:** "Learning artifact", "generated passage", "vocabulary notebook", "vocabulary entry", "target vocabulary" and "source media" follow the project's domain document. Story is the user-visible reading view, not a different stored entity.
- **Known risk and evidence:** Historical delayed-reply verification reproduced divergence in Story reader versus SQLite current selection; it did not establish a frequent ordinary-runtime bug. Initial requests and generation are already partially coordinated by the existing artifact owner, so deepen rather than replace it.
- **Seam proposal for agent review:** Concentrate navigation acceptance at the existing learning artifact owner/desktop bridge seam, with the desktop host as durable commit authority. Avoid exposing multiple low-level test seams; verify the observable end-to-end behavior first.
- **Visual baseline:** Approximate colors and dimensions are implementation targets, not demands to recreate one particular screenshot pixel for pixel. Maintain contrast and readability on dark backgrounds.
- **Release hygiene:** Document current behavior and verification in the proper project docs after implementation. Do not mark this spec implemented before passing source-checkout and native acceptance.
