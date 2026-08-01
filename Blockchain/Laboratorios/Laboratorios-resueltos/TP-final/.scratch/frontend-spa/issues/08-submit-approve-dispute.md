# 08 — Submit work, approve it, or open a dispute

**What to build:** Workers and owners can complete the review path by submitting a durable reference, approving work, or opening a reasoned dispute.

**Blocked by:** 06 — Accept escrow through a shared transaction coordinator.

**Status:** ready-for-agent

- [ ] An eligible worker can submit a non-empty submission reference within its UTF-8 byte limit.
- [ ] The form warns that the reference is public and immutable and never interprets arbitrary markup.
- [ ] A valid HTTPS reference is rendered afterward as a safe external link; other references remain copyable text.
- [ ] An eligible owner can review the consequence and approve submitted work before the review deadline.
- [ ] An eligible owner can open a dispute with a non-empty, byte-limited, public and immutable reason.
- [ ] Every action is simulated, confirmed, tracked, and refreshed through the shared transaction coordinator.
- [ ] Projection and visible actions update correctly for submission, approval, dispute, deadline races, and external transitions.
- [ ] Tests cover validation boundaries, privacy copy, roles, states, deadlines, wallet rejection, contract revert, and confirmed outcomes.

