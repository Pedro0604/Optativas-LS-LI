# 05 — Create and fund an escrow end to end

**What to build:** An owner can prepare, review, simulate, sign, and confirm creation of a funded escrow, then arrive at its verified canonical detail.

**Blocked by:** 01 — Base SPA and public escrow discovery; 03 — Injected wallet connection and Sepolia writes.

**Status:** ready-for-agent

- [ ] The form can be completed while disconnected and requests connection only when advancing to transaction review.
- [ ] Amount is entered in ETH, durations use friendly units, participant inputs are explicit addresses, and title length is measured in UTF-8 bytes.
- [ ] Client validation matches contract invariants for amount, durations, zero addresses, distinct roles, and title length.
- [ ] Connecting or changing the owner account revalidates worker and arbiter addresses without silently losing the draft.
- [ ] A review step shows exact wei-equivalent funding, duration seconds, roles, title, and immutable-data privacy warning.
- [ ] The call is simulated before prompting the wallet and exposes translated contract failures.
- [ ] Receipt handling decodes `EscrowCreated`, verifies `isEscrow`, refreshes relevant lists, and navigates to the canonical detail.
- [ ] A confirmed receipt without a decodable creation event retains the transaction hash and fails safely without inventing an address.
- [ ] Validation, connection cancellation, simulation failure, wallet rejection, success, and event-decoding failure are tested through the form flow.

