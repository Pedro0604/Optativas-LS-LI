# 04 — My Escrows by participant role

**What to build:** A connected participant can browse their owner, worker, and arbiter escrows through independent, shareable, paginated views.

**Blocked by:** 01 — Base SPA and public escrow discovery; 03 — Injected wallet connection and Sepolia writes.

**Status:** ready-for-agent

- [ ] The My Escrows route remains accessible while disconnected and presents an in-place connection call to action.
- [ ] Owner, worker, and arbiter are separate tabs backed by their corresponding factory registries.
- [ ] The selected role and page are validated search parameters that survive reload and sharing.
- [ ] Each role list is independently paginated newest-first without downloading all role registries.
- [ ] Sepolia records remain visible when the connected wallet is on another network.
- [ ] Changing accounts cancels obsolete reads and presents only the new account's results.
- [ ] Loading, empty, partial failure, retry, pagination, account-change, and disconnected behavior have integration coverage.

