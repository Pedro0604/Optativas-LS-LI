# 11 — Keep escrow views current and resilient

**What to build:** Visitors and participants see external on-chain changes, deadline progress, wallet changes, and long-running transactions reflected without excessive RPC traffic or manual reloads.

**Blocked by:** 02 — Canonical escrow detail and lifecycle timeline; 03 — Injected wallet connection and Sepolia writes; 04 — My Escrows by participant role; 06 — Accept escrow through a shared transaction coordinator.

**Status:** ready-for-agent

- [ ] HTTP block polling refreshes the open detail each observed block and lists at a lower configured frequency.
- [ ] Polling pauses while the document is hidden and resumes with a refresh when visible.
- [ ] Countdowns advance from the latest known block time and trigger an authoritative refresh at zero without mutating state locally.
- [ ] External lifecycle transitions, withdrawals, and creations become visible without a full page reload.
- [ ] Account and network changes cancel obsolete work, invalidate affected queries, and rederive visible roles/actions.
- [ ] Submitted transaction metadata survives route changes and can recover receipt tracking after reload where provider data permits.
- [ ] Replaced, prolonged, reverted, and confirmed transactions remain distinguishable with a usable explorer link.
- [ ] Controlled-time and controlled-RPC tests verify polling cadence, visibility pause, deadline refresh, external changes, stale-response prevention, and recovery.

