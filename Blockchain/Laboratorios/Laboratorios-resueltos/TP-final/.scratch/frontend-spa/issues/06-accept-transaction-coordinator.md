# 06 — Accept escrow through a shared transaction coordinator

**What to build:** An eligible worker can accept an escrow through a consistent transaction experience that later lifecycle actions can reuse.

**Blocked by:** 02 — Canonical escrow detail and lifecycle timeline; 03 — Injected wallet connection and Sepolia writes.

**Status:** ready-for-agent

- [ ] Detail actions are derived from snapshot, connected account, block time, and wallet network rather than duplicated page conditionals.
- [ ] An eligible worker can review and simulate acceptance before the wallet prompt.
- [ ] The transaction coordinator exposes waiting-for-wallet, submitted, confirmed, rejected, reverted, and unknown-failure states.
- [ ] Submitted transactions expose their hash and Sepolia explorer link.
- [ ] Confirmed acceptance invalidates affected snapshots and lists without applying an optimistic state transition.
- [ ] A pending action blocks duplicate writes only for the same escrow and permits activity on other escrows.
- [ ] Known custom errors map to actionable Spanish messages; unknown errors retain copyable technical detail.
- [ ] Integration tests cover eligibility, wrong role, wrong state, wrong network, deadline race, rejection, revert, success, and per-escrow concurrency.

