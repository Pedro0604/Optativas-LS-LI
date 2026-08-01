# 07 — Cancel escrows and finalize elapsed deadlines

**What to build:** An owner can cancel before acceptance, and any connected account can finalize each elapsed lifecycle deadline with clear consequences.

**Blocked by:** 06 — Accept escrow through a shared transaction coordinator.

**Status:** ready-for-agent

- [ ] Eligible owners see cancellation only before acceptance and before its deadline.
- [ ] Cancellation requires a consequence summary before simulation and signing.
- [ ] Each operational state exposes its matching permissionless expiration only after the exact deadline boundary.
- [ ] Visitors see unfinalized expiration distinctly even before connecting a wallet.
- [ ] Invoking expiration while disconnected resumes the intended action after connection.
- [ ] Confirmation explains the deterministic allocation resulting from cancellation or the selected expiration.
- [ ] Successful receipts refresh state, timeline, available actions, and pending withdrawal data.
- [ ] Tests cover all four expirations, exact time boundaries, every source state, permissionless callers, rejection, revert, and success.

