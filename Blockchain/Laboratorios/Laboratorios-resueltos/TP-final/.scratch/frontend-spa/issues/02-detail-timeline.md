# 02 — Canonical escrow detail and lifecycle timeline

**What to build:** A visitor can open a canonical escrow address and understand its complete current snapshot, participants, funds, evidence, lifecycle, known deadlines, and available actions without connecting a wallet.

**Blocked by:** 01 — Base SPA and public escrow discovery.

**Status:** ready-for-agent

- [ ] Address parameters are validated, normalized to checksum form, and redirected to one canonical URL.
- [ ] Factory membership is verified with `isEscrow`; malformed addresses and non-factory escrows receive distinct results.
- [ ] Essential reads form one coherent snapshot and expose a recoverable retry state on RPC failure.
- [ ] A pure projection derives role-independent visible state, active deadline, terminal outcome, and available actions from snapshot and block time.
- [ ] The timeline distinguishes completed stages, current state, known deadlines, future stages, terminal outcomes, and unfinalized expiration.
- [ ] Zero deadlines appear as not started, and the exact deadline boundary is treated as elapsed.
- [ ] Evidence is rendered as inert text; only valid HTTPS submission references become safe external links.
- [ ] Projection and route behavior are covered through their public seams for every operational and terminal state.

