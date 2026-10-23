# Accountant Dashboard editing preferences

- Prefer editing existing files. Before adding a file, explain why an existing file cannot reasonably serve the purpose.
- Keep small screen-specific JSX and interaction logic in that screen's primary file in `pages/`. Do not combine unrelated screens into a large implementation file.
- Keep substantial, reusable, or independently maintained components separate when doing so improves readability.
- Reuse existing stylesheets; keep all Accountant-specific selectors scoped. Preserve appearance and responsive behavior.
- Use `services/accountantService.js` for Accountant service functions where appropriate. Preserve shared API module ownership, endpoints, payloads, response handling, interceptors, and authorization.
- Add tests to `tests/accountantDashboard.test.js` under the appropriate feature suite. Preserve existing cases and assertions; do not create a test file for each small feature.
- Preserve existing functionality, calculations, validation, routes, and integrations. Limit changes outside this dashboard to necessary import corrections.
- Inspect Git status and dependencies before reorganizing files. Preserve ongoing work, verify replacements and references before removing superseded files, and avoid unrelated cleanup.
- Run relevant tests, scoped ESLint, production build, import/dependency checks, and Git diff checks. Distinguish pre-existing failures from regressions and report unverified live behavior accurately.
