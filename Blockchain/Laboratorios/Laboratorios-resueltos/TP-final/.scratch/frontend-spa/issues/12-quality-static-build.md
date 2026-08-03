# 12 — Finalize frontend content and static deployment documentation

**What to build:** The escrow SPA uses consistent Spanish terminology, warns participants about immutable public text, documents static deployment requirements, handles unknown routes, and remains within the agreed scope.

**Status:** resolved

- [x] Spanish labels for escrow states, roles, available actions, deadlines, and known contract errors are centralized and consistent with the domain glossary.
- [x] Every immutable on-chain text input displays a privacy warning against publishing personal data, credentials, or secrets.
- [x] Static deployment documentation covers required environment variables and SPA fallback rewrites for direct navigation and reloads.
- [x] An unknown route renders a Spanish 404 page with a link to the home page, covered by a router test.
- [x] No functionality outside the agreed scope is introduced.

## Answer

The SPA now shares Spanish role, action, deadline, contract-error, and immutable-text labels from
central catalogs. Creation, submission, dispute, and resolution inputs reuse one privacy warning.
Static deployment requirements and route fallback behavior are documented, and unknown routes show
a tested Spanish 404 page with a home link. No functionality outside the agreed scope was added.
