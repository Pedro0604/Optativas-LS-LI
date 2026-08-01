# 10 — Withdraw pending funds from an individual escrow

**What to build:** A beneficiary can see and withdraw their exact pending balance from one escrow without implying a global or batch balance.

**Blocked by:** 06 — Accept escrow through a shared transaction coordinator.

**Status:** ready-for-agent

- [ ] The detail displays the connected account's exact pending amount for that escrow.
- [ ] Lists may mark a loaded escrow with available funds but never calculate or display a global total.
- [ ] Withdraw is shown only when the connected account has a positive pending balance.
- [ ] A confirmation summarizes the source escrow and exact amount before simulation and signing.
- [ ] A confirmed withdrawal refreshes the pending balance without altering lifecycle state.
- [ ] Transfer rejection, no-balance races, wallet rejection, contract revert, and successful withdrawal produce distinct outcomes.
- [ ] Amount formatting remains exact and copyable without changing the wei submitted to the contract.
- [ ] Detail and transaction integration tests cover owner and worker beneficiaries and repeated withdrawal attempts.

