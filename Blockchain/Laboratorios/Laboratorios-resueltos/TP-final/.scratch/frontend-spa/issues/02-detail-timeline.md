# 02 — Canonical escrow detail and lifecycle timeline

**What to build:** A visitor can open a canonical escrow address and understand its complete current snapshot, participants, funds, evidence, lifecycle, known deadlines, and available actions without connecting a wallet.

**Blocked by:** 01 — Base SPA and public escrow discovery.

**Status:** resolved

- [x] Address parameters are validated, normalized to checksum form, and redirected to one canonical URL.
- [x] Factory membership is verified with `isEscrow`; malformed addresses and non-factory escrows receive distinct results.
- [x] Essential reads form one coherent snapshot and expose a recoverable retry state on RPC failure.
- [x] A pure projection derives role-independent visible state, active deadline, terminal outcome, and available actions from snapshot and block time.
- [x] The timeline distinguishes completed stages, current state, known deadlines, future stages, terminal outcomes, and unfinalized expiration.
- [x] Zero deadlines appear as not started, and the exact deadline boundary is treated as elapsed.
- [x] Evidence is rendered as inert text; only valid HTTPS submission references become safe external links.
- [x] Projection and route behavior are covered through their public seams for every operational and terminal state.

## Answer

Implementado el detalle canónico con URL checksum, verificación `isEscrow`, snapshot al mismo bloque, retry de RPC, proyección pura y timeline completa. La evidencia permanece inerte salvo referencias HTTPS válidas. Verificado con 124 tests Hardhat, 36 tests web, TypeScript, formato y build de producción.
