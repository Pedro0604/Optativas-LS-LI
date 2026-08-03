# 10 — Withdraw pending funds from an individual escrow

**What to build:** A beneficiary can see and withdraw their exact pending balance from one escrow without implying a global or batch balance.

**Blocked by:** 06 — Accept escrow through a shared transaction coordinator.

**Status:** resolved

- [x] The detail displays the connected account's exact pending amount for that escrow.
- [x] Lists may mark a loaded escrow with available funds but never calculate or display a global total.
- [x] Withdraw is shown only when the connected account has a positive pending balance.
- [x] A confirmation summarizes the source escrow and exact amount before simulation and signing.
- [x] A confirmed withdrawal refreshes the pending balance without altering lifecycle state.
- [x] Transfer rejection, no-balance races, wallet rejection, contract revert, and successful withdrawal produce distinct outcomes.
- [x] Amount formatting remains exact and copyable without changing the wei submitted to the contract.
- [x] Detail and transaction integration tests cover owner and worker beneficiaries and repeated withdrawal attempts.

## Answer

The escrow detail and participant lists expose only the connected account's per-escrow pending balance. A positive balance enables an exact, reviewed withdrawal through the shared transaction coordinator; confirmation invalidates detail and list queries without changing lifecycle state. Owner and worker flows, repeated attempts, exact wei formatting, wallet rejection, no-balance races, transfer failures, contract reverts, and success are covered by tests.

