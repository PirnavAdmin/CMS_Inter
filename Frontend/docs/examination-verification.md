# Examination Center verification — 2026-09-23

Status: FRONTEND COMPLETE WITH BACKEND CONTRACT BLOCKER.

This continuation audits the existing Examination Center; it does not restart the redesign. Backend files were read only. Promotion files match their continuation-start SHA256 hashes. Existing environment, Vite, and Promotion changes remain outside this work.

## Feature audit

| Capability | Current result |
|---|---|
| List, search, academic/status filters, pagination, refresh | Preserved; active board/year scope enforced |
| Create | Four steps: information, scope, subjects/patterns, review. Single-scope Regular basic draft supported; backend-generated code only. Creation locks after acceptance even when verification fails. |
| Multi-scope / Objective create | Explicitly blocked before POST because required configuration cannot persist |
| View / review | Backend examination and schedule responses; missing fields remain visibly unknown |
| Edit examination | Supported metadata PUT followed by GET comparison; scope/configuration changes blocked |
| Scheduling / rescheduling | Saved rows visible. Existing Regular single-hall/single-invigilator update supported with fresh status, roster, availability and GET verification. New scheduling and finalization blocked by missing persisted configuration. Objective rescheduling blocked. |
| Remove schedule, cancel, delete examination | Confirmation, synchronous duplicate guard and refreshed verification; current status checked |
| Print | Review/schedule print layout and browser print action retained |
| Excel export | Actual backend Excel endpoints and Blob download; no invented local export data; JSON/text error documents rejected |
| Completion | Backend automatic completion worker unchanged; frontend reads server status on refresh. No fabricated frontend completion. Finalization cannot safely be certified with this contract. |
| Completed / Cancelled | Read-only editing/scheduling. Cancelled deletion permitted by backend. |

## Backend contract audit

Current source inspected: ExaminationController, ExaminationService, ExaminationRepository, Examination model, create/update request DTOs, ExaminationResponse and ExamScheduleResponse. Live ngrok Swagger was inaccessible; no live mutation tests were performed.

| Endpoint | Contract gap | Consequence |
|---|---|---|
| POST `/api/v1/examinations`, PUT `/{id}`, GET `/{id}` | Requests accept academicLevelIds/groupIds/programIds but persistence retains only the first scalar IDs. Responses lack those arrays, examCategory, scheduleMode, selectedSubjectIds, groupProgramSelections, groupSubjectSelections and selectedGroupPatterns. Per-group maps are absent from request DTOs too. | Exact configuration cannot survive a refresh. Single-scope Regular draft creation reports this after refetch; Objective/multi-scope creation and subsequent new scheduling/finalization are blocked. |
| POST `/{id}/schedules`, GET `/{id}/schedules` | Create DTO accepts groupId, patternName, includedSubjectIds and hallAssignments, but the service/model does not persist the combined configuration; first included subject can become the single subjectId. Response lacks groupId, academicLevelId, patternName, includedSubjectIds, candidateCount, hallAssignments and all invigilator IDs. | Cannot represent/verify one atomic combined Objective sitting or full multi-hall allocation. |
| PUT `/{id}/schedules/{scheduleId}` | Update DTO supports one roomId and one invigilatorId, with date/time/subject/marks; lacks per-hall candidate counts, assignments, group and pattern configuration. | Only existing Regular single-room/single-invigilator edits can be verified. Multi-hall/two-invigilator allocation remains an explicitly unsaved preview. |
| POST `/{id}/schedules/batch` | Sequential per-subject writes, no atomic combined session contract | Not a safe substitute for Objective/multi-hall persistence. |
| POST `/{id}/finalize-schedule` | Server can accept incomplete coverage and generate placeholder resources when schedules are absent | Frontend never treats this as proof of readiness and blocks unsafe finalization. |

Schedule responses DO return scheduleMode, roomId and one invigilatorId. Examination responses DO return a scalar examPattern. Those fields are not incorrectly classified as absent.

## Availability and candidate rules

- Halls: GET `/api/v1/examinations/available-halls` with `date`, `startTime`, `endTime`, `examinationId`, and `excludeScheduleId` when editing. Times include seconds. Full cohort `requiredCapacity` is deliberately omitted so smaller halls remain eligible for a multi-hall preview. Backend accepts but does not enforce sectionIds; it does not implement section/academic-level room restrictions. Frontend does not invent these rules.
- Invigilators: GET `/api/v1/examinations/available-invigilators` with the same interval/exclusion and repeated `subjectIds` query keys. Backend StaffSubjectAllocations excludes own-subject faculty. Results intersect the authoritative `/api/v1/staff/dropdown?staffType=Teaching` roster because availability labels staff as Teaching without filtering that type.
- Repository availability checks exclude only the current schedule ID. Update service conflict checks also pass the current schedule ID. Another overlapping schedule remains a conflict. Mutation conflict checks currently compare resource names, while availability also compares IDs; backend race/identity validation remains server responsibility.
- Availability results are guarded by effect cleanup and a scope key; late results cannot replace the current interval. Identical in-flight calls share a Promise; explicit retry/invalidation starts a fresh lookup. No successful-response persistence cache.
- Students: `/api/v1/students/search` server scopes board/year/group and optional level. Frontend requires active=true, valid student ID, exact group, selected academic level(s), and explicitly selected program IDs, then deduplicates student IDs. No missing-identity inclusion and no room-capacity fallback. Legacy single-scope edits derive an unsaved roster count from returned scalar scope and label it as such, never as a persisted schedule count.
- Local draft overlap rules consider the entire interval and date, remove other sessions' halls/faculty, and retain only the current session's own assignment. Objective readiness requires identical date/start/end across groups. These pure rules are fixture-tested; the current server prevents exercising a persisted multi-group Objective workflow.
- Allocation must cover the full count or fail. Existing policy requires one invigilator through 60 candidates and two above 60 per hall. Multiple assignments cannot be sent through the scalar PUT contract.

## Verification scope and commands

Run from `Frontend`, using Node 24 and installed dependencies:

```powershell
node --test tests/examination.test.mjs
npx.cmd eslint src/components/pages/ExaminationPage.jsx src/features/examination src/routes/AppRoutes.jsx tests/examination.test.mjs tests/examination.browser.mjs
npm.cmd run lint
npm.cmd run build
```

Browser harness: start Vite on 127.0.0.1:5174 and an isolated Chrome profile with remote debugging on 9223, then run `node tests/examination.browser.mjs`. Every `/api/*` request is intercepted and fulfilled locally. Never attach this harness to an ordinary personal browser profile: its fixture initialization clears browser storage in that isolated origin. Generated screenshots/network traces are temporary verification artifacts.

Unit/service fixtures cover canonical categories, scoped candidates/subjects/requirements, Objective timing, local conflicts, complete allocation, malformed responses, exclusion parameters, request deduplication, teaching roster intersection, accepted-write/failed-verification behavior, unsupported PUT rejection, changed server status and supported field round-trip mismatches.

Browser fixtures cover real rendered navigation, Regular selected-program/subject preservation, two Objective groups with distinct subjects/patterns, accepted basic draft then failed configuration verification, duplicate create/update/edit/delete, self-exclusion, another schedule conflict, delayed stale responses for both resources, availability failure/retry, hall and invigilator 409, multi-hall preview-only controls, Completed/Cancelled behavior, cancellation, print invocation, export download wiring, direct /add route, search/empty state and responsive layout. Export fixture verifies download handling, not Excel workbook contents. Objective persistence is tested as blocked, not as successful end-to-end scheduling.

Light and dark screenshots reviewed for list, wizard/review, schedule editor, resource controls and notices; 650px layout checked for horizontal overflow. Browser native print/PDF output and a real server-generated workbook were not validated.

No Examination localStorage/sessionStorage fallback or frontend exam-code generator remains. Global authentication/theme storage is unchanged.

Focused Examination lint is clean. Shared apiEndpoints.js retains the pre-existing `attendanceTimingConfig` duplicate key. CSS is not covered by this project's ESLint configuration. Full project lint retains its baseline 49 errors and 27 warnings. Build retains global XLSX mixed-import and large-chunk warnings.

Ready to commit: YES — FRONTEND READY, WITH DOCUMENTED BACKEND CONTRACT BLOCKER. This is not an end-to-end production-ready Objective scheduling claim.

## Final results

- Unit/service suite: 24/24 passed.
- Browser suite: 21 scenarios passed; 121 intercepted requests, 1 create POST, 3 schedule PUTs (1 successful unchanged/self-exclusion update and 2 deliberate 409 failures). Metadata double-submit: 1 PUT. Delete double-click: 1 DELETE. Zero browser exceptions.
- Focused ESLint command above: exit 0, no errors or warnings.
- Full lint: 49 errors, 27 warnings, matching pre-work baseline. Shared endpoint lint separately reports only the existing attendanceTimingConfig duplicate.
- Final `npm.cmd run build`, after all source/test edits: exit 0, Vite 8.2.1, 2,738 modules, 2.89 seconds. Existing XLSX mixed-import and >1,000 kB chunk warnings remain.
- `git diff --check`: passed. `git diff --numstat -- Backend`: empty.
- Owned temporary Chrome profile, screenshots/network traces and review diff dumps removed after inspection.
