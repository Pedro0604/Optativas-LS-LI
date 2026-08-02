# 09 — Resolve a dispute with exact complementary allocations

**What to build:** An arbiter can assign an exact portion of escrow funds to the worker while clearly seeing the complementary owner allocation before resolving the dispute.

**Blocked by:** 08 — Submit work, approve it, or open a dispute.

**Status:** resolved

- [ ] One exact `workerAmountWei` value is the authoritative allocation state and owner allocation is always the exact remainder.
- [ ] Worker and owner sliders are visually inverse and remain synchronized with exact ETH fields.
- [ ] Zero, half, and full allocation shortcuts preserve exact wei behavior, including odd amounts.
- [ ] Invalid, negative, imprecise, and above-escrow allocations are rejected before simulation.
- [ ] Resolution requires a non-empty, byte-limited reason with public and immutable data warning.
- [ ] The confirmation summary displays exact worker and owner amounts and the reason before signing.
- [ ] Successful resolution refreshes lifecycle state and both beneficiaries' pending balances.
- [ ] Keyboard operation, complementary controls, rounding, validation, role/state/deadline failures, rejection, revert, and success are tested.

## Answer

Se incorporó la resolución de disputas: la asignación del worker se conserva en wei, el owner recibe el remanente exacto y los controles complementarios muestran ETH y wei. La resolución valida montos y motivo antes de simular, reutiliza el coordinador de transacciones y refresca el estado y saldos pendientes de ambos participantes tras confirmarse.
