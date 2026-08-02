# 07 — Cancel escrows and finalize elapsed deadlines

**What to build:** An owner can cancel before acceptance, and any connected account can finalize each elapsed lifecycle deadline with clear consequences.

**Blocked by:** 06 — Accept escrow through a shared transaction coordinator.

**Status:** resolved

- [x] Eligible owners see cancellation only before acceptance and before its deadline.
- [x] Cancellation requires a consequence summary before simulation and signing.
- [x] Each operational state exposes its matching permissionless expiration only after the exact deadline boundary.
- [x] Visitors see unfinalized expiration distinctly even before connecting a wallet.
- [x] Invoking expiration while disconnected resumes the intended action after connection.
- [x] Confirmation explains the deterministic allocation resulting from cancellation or the selected expiration.
- [x] Successful receipts refresh state, timeline, available actions, and pending withdrawal data.
- [x] Tests cover all four expirations, exact time boundaries, every source state, permissionless callers, rejection, revert, and success.

## Answer

- Reused the lifecycle projection and shared transaction coordinator for owner cancellation and the four permissionless expirations.
- Added confirmation summaries, simulation/signing, receipt invalidation, and deferred expiration resumption after wallet connection.
- Covered exact deadline boundaries and each expiration ABI action; web suite passes (100 tests). Hardhat could not start locally because Node reports `uv_os_get_passwd: ENOMEM`.
