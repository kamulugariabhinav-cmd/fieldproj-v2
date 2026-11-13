# VoiceGuard implementation plan

Use this sequence for each future change. The current application is already
implemented; these are maintenance steps, not claims of outstanding work.

1. Define the user-visible change in PRD.md and FEATURES.md.
2. Inspect the current files and preserve unrelated user edits.
3. Check DESIGN.md for branding and interaction requirements.
4. Identify affected components through ARCHITECTURE.md.
5. Review DATABASE.md, API.md, and AUTH_SECURITY.md when data is involved.
6. Implement the smallest coherent change in the active add-on.
7. Run targeted checks from TESTING.md; inspect actual failure evidence.
8. Restart only the verified local server when Python changes require it.
9. Verify the served route and report what was actually tested.
10. Update relevant documents and record remaining limitations.

## Future work that requires separate evidence

- Independent, representative model evaluation across speakers and datasets.
- Actual account-provider login checks performed by the account owner.
- Visual browser QA when the saved browser permission permits access.
- Production deployment, persistent storage, access controls, and monitoring.

Do not treat these items as completed merely because local smoke checks passed.
