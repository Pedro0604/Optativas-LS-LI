# 12 — Complete frontend quality gates and static build

**What to build:** The finished escrow SPA is consistent, responsive, accessible, verifiably integrated with current contracts, and deployable to any static host that supports client-route fallback.

**Blocked by:** 05 — Create and fund an escrow end to end; 07 — Cancel escrows and finalize elapsed deadlines; 08 — Submit work, approve it, or open a dispute; 09 — Resolve a dispute with exact complementary allocations; 10 — Withdraw pending funds from an individual escrow; 11 — Keep escrow views current and resilient.

**Status:** ready-for-agent

- [ ] All routes and lifecycle flows are reviewed at mobile, tablet, and desktop widths.
- [ ] Navigation, dialogs, tabs, wallet controls, sliders, forms, errors, and transaction states are keyboard accessible with appropriate focus behavior.
- [ ] Spanish labels for states, roles, actions, deadlines, and known contract errors are centralized and consistent with the domain glossary.
- [ ] Addresses and exact amounts are readable and copyable, and immutable text fields consistently show privacy warnings.
- [ ] The quality pipeline compiles contracts before checking generated bindings, then typechecks, runs contract and frontend tests, and creates the production build.
- [ ] CI fails for stale generated ABIs, type errors, failing tests, or production build errors.
- [ ] Static deployment documentation states required environment configuration and fallback rewrite behavior for deep links.
- [ ] No out-of-scope backend, indexer, WalletConnect, ENS, multichain, global balance, batch action, event history, or real-wallet E2E functionality is introduced.
