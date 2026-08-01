# Escrow Specification

## Problem Statement

The user needs a smart-contract-based escrow system for hiring and paying a worker in ETH. The system must protect the owner from paying for work that is never submitted, protect the worker from an owner who refuses to approve completed work, and provide an independent arbitration path when the parties disagree.

The current contracts support only escrow creation and worker acceptance. They do not yet define the complete lifecycle of an agreement, the full state machine, the deadlines that govern each stage, the dispute-resolution process, the withdrawal mechanism, or the events and function names that external applications will depend on.

The user also needs the contract interfaces to be explicit and predictable enough to support automated tests, a web interface, event indexing, and future maintenance. Each state transition must have a single meaning, temporal windows must not overlap, terminal outcomes must remain distinguishable, and funds must never be transferred as an incidental side effect of a state transition.

## Solution

Build a factory-managed ETH escrow system in which each agreement is represented by an independent `Escrow` contract created through `EscrowFactory`.

Each escrow will have three immutable participants:

- An owner who creates and funds the agreement.
- A worker who may accept the agreement and submit the work.
- An arbiter who resolves disputes.

The agreement will move through an explicit state machine:

- `PendingAcceptance`
- `PendingSubmission`
- `PendingReview`
- `PendingArbitration`
- `EscrowCancelled`
- `AcceptanceExpired`
- `SubmissionExpired`
- `WorkApproved`
- `ReviewExpired`
- `DisputeResolved`
- `ArbitrationExpired`

The owner will define four configurable durations when creating the escrow:

- Acceptance duration.
- Work duration.
- Review duration.
- Arbitration duration.

Each duration will be expressed in seconds and must be greater than zero. Absolute deadlines will be calculated only when the corresponding stage begins.

The system will use a withdrawal pattern. State-changing functions will allocate ETH to `pendingWithdrawals`, while beneficiaries will later call `withdraw()` to receive their funds. Withdrawals will not modify the escrow state.

The normal successful flow will be:

- The owner creates and funds an escrow.
- The worker accepts before the acceptance deadline.
- The worker submits a submission reference before the submission deadline.
- The owner approves before the review deadline, or the review deadline expires.
- The worker withdraws the allocated ETH.

The dispute flow will be:

- The worker submits the work.
- The owner opens a dispute before the review deadline.
- The arbiter resolves the dispute before the arbitration deadline by specifying the worker's allocation in wei.
- The remaining amount is allocated to the owner.
- If the arbiter does not act before the arbitration deadline, the funds are split 50/50, with any indivisible wei assigned to the worker.
- Each beneficiary withdraws independently.

The factory will register escrows globally and by owner, worker, and arbiter. No separate boolean registry is maintained; discovery relies on the role registries, the global list, and the canonical creation event.

## User Stories

1. As an owner, I want to create an escrow with ETH, so that the payment is reserved before the worker begins.
2. As an owner, I want to select a worker when creating an escrow, so that the agreement identifies who may perform the work.
3. As an owner, I want to select an arbiter when creating an escrow, so that disputes have a predefined independent resolver.
4. As an owner, I want the worker and arbiter to be visible before acceptance, so that all participants understand the agreement.
5. As a worker, I want the arbiter to be fixed before I accept, so that the owner cannot later choose a biased arbiter.
6. As an arbiter, I want my role to be recorded in the escrow, so that my authority is unambiguous.
7. As an owner, I want to provide a title for the escrow, so that the agreement can be identified in a user interface.
8. As an owner, I want the title to be non-empty, so that every escrow has a meaningful identifier.
9. As an owner, I want excessively long titles to be rejected, so that storage and gas usage remain bounded.
10. As an owner, I want to configure an acceptance duration, so that the worker cannot leave my funds pending indefinitely.
11. As an owner, I want to configure a work duration, so that the submission obligation has a clear time limit.
12. As an owner, I want to configure a review duration, so that I have a defined period to assess the submitted work.
13. As an owner, I want to configure an arbitration duration, so that a dispute cannot remain unresolved forever.
14. As a developer, I want all durations expressed in seconds, so that contract calculations align directly with block timestamps.
15. As a developer, I want all durations to be greater than zero, so that every lifecycle stage has a usable time window.
16. As an owner, I want no arbitrary protocol-level maximum duration, so that agreements can support different real-world timelines.
17. As a worker, I want the work deadline to begin only after I accept, so that time does not elapse before I commit to the job.
18. As an owner, I want the acceptance deadline to begin when the escrow is created, so that the proposal cannot remain open indefinitely.
19. As a worker, I want to accept explicitly, so that the blockchain records my agreement to perform the work.
20. As a worker, I want acceptance to be allowed only before the acceptance deadline, so that deadline behavior is deterministic.
21. As an owner, I want to cancel before the worker accepts, so that I can recover funds from an unaccepted proposal.
22. As an owner, I want cancellation to be allowed only before the acceptance deadline, so that cancellation and expiration remain distinct outcomes.
23. As a worker, I want the owner to lose the ability to cancel once I accept, so that the agreement cannot be withdrawn while I am working.
24. As a worker, I do not want to pay gas to reject an offer, so that I am not incentivized to perform a transaction that only benefits the owner.
25. As an owner, I want an unaccepted escrow to expire after its acceptance deadline, so that I can recover the funds.
26. As any account, I want to materialize an expired acceptance period, so that the on-chain state can be updated without depending on one participant.
27. As an indexer, I want cancellation and acceptance expiration to use different terminal states, so that their causes remain distinguishable.
28. As a worker, I want the escrow to become active after acceptance, so that the state describes an ongoing agreement rather than only a past action.
29. As a worker, I want a submission deadline to be calculated when I accept, so that the work period has an absolute end time.
30. As a worker, I want to submit work explicitly, so that the contract records that submission occurred.
31. As a worker, I want to associate a submission reference with the submission, so that the submitted work can be identified.
32. As an owner, I want the submission reference to be stored on-chain, so that I can retrieve the reference during review.
33. As an arbiter, I want the submission reference to be stored on-chain, so that I can identify the disputed submission.
34. As a developer, I want the submission reference to use a flexible string format, so that it can represent a URL, content identifier, commit, or other agreed reference.
35. As an owner, I want empty submission references to be rejected, so that the worker cannot advance the state without identifying a submission.
36. As a developer, I want submission references limited to 256 bytes, so that storage costs remain bounded.
37. As an owner, I want the submission reference to be immutable after submission, so that the reviewed content cannot be replaced.
38. As a worker, I want submission to be allowed only before the submission deadline, so that the submission rules are precise.
39. As an owner, I want a missed submission deadline to produce a distinct terminal outcome, so that non-submission is distinguishable from other failures.
40. As any account, I want to materialize a missed submission deadline, so that the state does not depend on the owner acting.
41. As an owner, I want the full escrow amount allocated back to me when submission expires, so that I recover funds after non-performance.
42. As an owner, I want submitted work to enter a pending-review state, so that the contract clearly represents my next required action.
43. As an owner, I want a review deadline to be calculated when work is submitted, so that the worker is not blocked indefinitely.
44. As an owner, I want to approve submitted work explicitly, so that payment is released only after my affirmative decision.
45. As a worker, I want approved work to allocate the full escrow amount to me, so that I can claim the agreed payment.
46. As a worker, I want review expiration to allocate the full escrow amount to me, so that owner inaction cannot block payment.
47. As any account, I want to materialize review expiration, so that payment does not depend exclusively on the worker submitting a transaction.
48. As an indexer, I want explicit approval and review expiration to use different terminal states, so that active approval and owner inaction remain distinguishable.
49. As an owner, I want to open a dispute before the review deadline, so that I can contest work that does not satisfy the agreement.
50. As a worker, I want disputes to be unavailable after the review deadline, so that my payment entitlement cannot be challenged late.
51. As an owner, I want a dispute reason to be mandatory, so that the arbiter receives a concrete basis for the dispute.
52. As an arbiter, I want the dispute reason stored on-chain, so that I can retrieve the owner's explanation.
53. As a developer, I want dispute reasons limited to 256 bytes, so that gas and storage usage remain bounded.
54. As a worker, I want the dispute reason to be immutable, so that the grounds for arbitration cannot be changed after opening.
55. As an arbiter, I want an arbitration deadline to be calculated when a dispute opens, so that I know how long I have to decide.
56. As an arbiter, I want to resolve a dispute by assigning an exact worker amount in wei, so that the distribution can be precise.
57. As an owner, I want the owner's amount calculated as the escrow amount minus the worker amount, so that all funds are allocated exactly once.
58. As an arbiter, I want to assign zero to the worker when the owner should receive everything, so that fully owner-favorable outcomes are supported.
59. As an arbiter, I want to assign the full amount to the worker, so that fully worker-favorable outcomes are supported.
60. As an arbiter, I want to assign an intermediate amount to the worker, so that partial performance can be compensated.
61. As an owner, I want worker allocations greater than the escrow amount to be rejected, so that the contract cannot over-allocate funds.
62. As an arbiter, I want to provide a mandatory resolution reason, so that my decision has a recorded justification.
63. As an owner, I want the resolution reason stored on-chain, so that I can inspect the arbiter's justification.
64. As a worker, I want the resolution reason stored on-chain, so that I can inspect the arbiter's justification.
65. As a developer, I want resolution reasons limited to 256 bytes, so that storage remains bounded.
66. As an indexer, I want all arbiter-decided outcomes to use one `DisputeResolved` state, so that the state model does not attempt to encode every possible split.
67. As an owner, I want the actual owner and worker allocations emitted when a dispute is resolved, so that the decision can be indexed without guessing.
68. As a worker, I want the arbiter to lose resolution authority after the arbitration deadline, so that a late decision cannot override the fallback rule.
69. As any account, I want to materialize arbitration expiration, so that a missing arbiter cannot lock funds indefinitely.
70. As an owner, I want arbitration expiration to allocate half the amount to me, so that the fallback is neutral.
71. As a worker, I want arbitration expiration to allocate half the amount to me, so that the fallback is neutral.
72. As a worker, I want any indivisible wei in the 50/50 fallback assigned to me, so that rounding is deterministic.
73. As an indexer, I want arbiter resolution and arbitration expiration to use different terminal states, so that arbiter action and timeout are distinguishable.
74. As a beneficiary, I want funds allocated to a pending balance instead of transferred during a state transition, so that a failed transfer cannot block lifecycle progress.
75. As an owner, I want to withdraw my allocated amount independently, so that I do not depend on the worker's ability to receive ETH.
76. As a worker, I want to withdraw my allocated amount independently, so that I do not depend on the owner's ability to receive ETH.
77. As a beneficiary, I want `withdraw()` to transfer my entire pending balance, so that the withdrawal interface remains simple.
78. As a beneficiary, I want `withdraw()` to reject calls with no pending balance, so that accidental no-op transactions are clearly invalid.
79. As a security reviewer, I want the pending balance cleared before the external ETH call, so that the withdrawal follows checks-effects-interactions.
80. As a beneficiary, I want a failed ETH transfer to revert the withdrawal, so that my pending balance is restored automatically.
81. As an indexer, I want each withdrawal event to identify the account and amount, so that actual transfers can be tracked.
82. As an owner, I want withdrawing funds not to change the escrow state, so that the terminal outcome remains visible.
83. As a worker, I want withdrawing funds not to change the escrow state, so that the terminal outcome remains visible.
84. As an indexer, I want terminal states to remain irreversible, so that historical outcomes cannot be overwritten.
85. As a developer, I want state-changing functions to require one exact source state, so that invalid transitions revert.
86. As a developer, I want late actions to revert rather than implicitly process expiration, so that every function has one responsibility.
87. As a developer, I want separate expiration functions for acceptance, submission, review, and arbitration, so that each transition is explicit and testable.
88. As a user, I want expiration functions callable by any account, so that objective state updates do not depend on privileged actors.
89. As a developer, I want deadline windows to use strict complementary conditions, so that action and expiration are never valid simultaneously.
90. As a developer, I want actions valid only when the timestamp is strictly before the deadline, so that the deadline instant counts as expired.
91. As a developer, I want expiration valid from the deadline timestamp onward, so that no time gap exists between action and expiration windows.
92. As an indexer, I want events to describe completed actions, so that logs read as historical facts.
93. As a developer, I want canonical and consistent event names, so that external clients can depend on a stable ABI.
94. As an indexer, I want deadlines emitted when a new timed stage begins, so that I can schedule UI updates without extra reads.
95. As an indexer, I want submission, dispute, and resolution strings omitted from events, so that dynamic text is not duplicated in logs.
96. As an application, I want to read submission, dispute, and resolution strings directly from the contract, so that stored values remain the authoritative source.
97. As an indexer, I want actor addresses omitted from transitions where the actor is fixed by role, so that events do not duplicate contract data.
98. As an indexer, I want the withdrawal account indexed, so that withdrawals can be filtered by beneficiary.
99. As an indexer, I do not want deadline or amount fields indexed when exact-value filtering is not useful, so that event topics are reserved for meaningful filters.
100. As an application, I want the factory creation event to identify the owner, worker, and arbiter as indexed fields, so that escrows can be discovered by role.
101. As an application, I want the created escrow address in the factory event, so that I can interact with the new contract.
102. As an application, I want the escrow amount in the factory event, so that I can display the funded value immediately.
103. As an application, I want the acceptance duration in the factory event, so that I can display the configured agreement term immediately.
104. As an application, I want the work, review, and arbitration durations in the factory event, so that I can display the agreement terms before those stages begin.
105. As an application, I want the title stored in the escrow rather than duplicated in the creation event, so that dynamic text is read from one source.
106. As an owner, I want the factory to list all escrows I created, so that I can find my agreements.
107. As a worker, I want the factory to list all escrows assigned to me, so that I can find my jobs.
108. As an arbiter, I want the factory to list all escrows assigned to me, so that I can find disputes I may need to resolve.
109. As an application, I want a global escrow list, so that I can enumerate agreements without processing historical logs.
110. As an application, I want the total escrow count derived from the global list, so that no duplicate counter must be maintained.
111. As an application, I want escrow discovery to use the factory lists and canonical creation event, so that the factory does not maintain a duplicate boolean registry.
112. As a developer, I want one escrow contract per agreement, so that funds and state remain isolated.
113. As a developer, I want the factory to create and register escrows atomically, so that failed creation cannot leave partial registry entries.
114. As a developer, I want the factory not to retain escrow funds, so that ETH is isolated in the created agreement.
115. As a worker, I want the owner, worker, and arbiter to be three different non-zero addresses, so that no participant controls conflicting roles.
116. As an owner, I want the funded amount to be greater than zero, so that empty escrows cannot be created.
117. As a developer, I want the escrow constructor to validate its core invariants, so that the contract remains valid even if creation paths change.
118. As a developer, I want only the factory to emit the system-level creation event, so that escrow discovery has one canonical source.
119. As a developer, I do not want the escrow constructor to emit a duplicate creation event, so that indexers do not process two representations of the same creation.
120. As a tester, I want every valid transition tested from its exact source state, so that the state machine matches the specification.
121. As a tester, I want every transition to be tested from an incompatible state, so that the shared exact-state validation is verified without duplicating the same assertion for every enum value.
122. As a tester, I want deadline boundary tests at one second before, exactly at, and after each deadline, so that temporal semantics are verified.
123. As a tester, I want cancellation and acceptance expiration tested independently, so that their terminal causes remain distinct.
124. As a tester, I want submission expiration to allocate the complete amount to the owner, so that non-submission accounting is verified.
125. As a tester, I want explicit approval and review expiration tested independently, so that both worker-favorable outcomes are verified.
126. As a tester, I want dispute resolution tested with zero, full, and partial worker allocations, so that the complete distribution range is covered.
127. As a tester, I want arbitration expiration tested with even and odd amounts, so that 50/50 rounding is verified.
128. As a tester, I want failed withdrawals tested with a recipient that rejects ETH, so that pending balances remain recoverable.
129. As a tester, I want repeated withdrawals rejected after the first successful withdrawal, so that funds cannot be paid twice.
130. As a tester, I want multiple escrows created by the same and different participants, so that all factory registries remain consistent.
131. As a tester, I want failed escrow creation to leave all factory arrays, mappings, counts, existing entries, and balances unchanged, so that creation is atomic.
132. As a front-end user, I want each state to have one clear meaning, so that the interface can explain what action is currently available.
133. As a front-end developer, I want each state transition to have a named event, so that the UI can react to lifecycle changes.
134. As a front-end developer, I want deadlines emitted only when they become known, so that displayed timers use authoritative absolute timestamps.
135. As a front-end developer, I want unstarted deadlines to remain zero, so that I can distinguish inactive stages from active deadlines.
136. As a front-end developer, I want all textual evidence fields immutable after their transition, so that the UI never displays mutable historical evidence.
137. As a security reviewer, I want no state transition after a terminal state, so that allocations cannot be overwritten.
138. As a security reviewer, I want the sum of pending allocations to equal the escrow amount at finalization, so that no ETH is lost or created.
139. As a security reviewer, I want each terminal transition to allocate funds only once, so that double-crediting is impossible.
140. As a maintainer, I want function names, event names, and state names to follow consistent semantics, so that the contract remains understandable.

## Implementation Decisions

### Contract modules

- The system consists of an `EscrowFactory` module and one independently deployed `Escrow` instance per agreement.
- The factory is the intended entry point for creating escrows.
- The factory does not hold escrow funds after a successful creation.
- The escrow constructor continues to validate its own invariants even though the factory is the intended deployment path.
- The escrow does not emit its own creation event; the factory event is the canonical discovery mechanism.

### Roles

- Every escrow has an immutable owner, worker, and arbiter.
- All three role addresses must be non-zero.
- All three role addresses must be different.
- The owner is the account that calls the factory creation function.
- The worker is the only account authorized to accept and submit work.
- The owner is the only account authorized to cancel before acceptance, approve work, and open a dispute.
- The arbiter is the only account authorized to resolve a dispute before the arbitration deadline.
- Expiration functions are permissionless because they apply deterministic results.

### State machine

The state enum is ordered with operational states first and terminal states afterward:

1. `PendingAcceptance`
2. `PendingSubmission`
3. `PendingReview`
4. `PendingArbitration`
5. `EscrowCancelled`
6. `AcceptanceExpired`
7. `SubmissionExpired`
8. `WorkApproved`
9. `ReviewExpired`
10. `DisputeResolved`
11. `ArbitrationExpired`

The valid transitions are:

- `PendingAcceptance` to `PendingSubmission` through `acceptEscrow()`.
- `PendingAcceptance` to `EscrowCancelled` through `cancelEscrow()`.
- `PendingAcceptance` to `AcceptanceExpired` through `expireAcceptance()`.
- `PendingSubmission` to `PendingReview` through `submitWork()`.
- `PendingSubmission` to `SubmissionExpired` through `expireSubmission()`.
- `PendingReview` to `WorkApproved` through `approveWork()`.
- `PendingReview` to `PendingArbitration` through `openDispute()`.
- `PendingReview` to `ReviewExpired` through `expireReview()`.
- `PendingArbitration` to `DisputeResolved` through `resolveDispute()`.
- `PendingArbitration` to `ArbitrationExpired` through `expireArbitration()`.

All terminal states are irreversible. No lifecycle transition is permitted after reaching a terminal state. `withdraw()` remains available independently when the caller has a pending balance.

### Time model

- All configured durations are expressed in seconds.
- Acceptance, work, review, and arbitration durations must each be greater than zero.
- No maximum duration is enforced by the contracts.
- The acceptance deadline is calculated during construction.
- The submission deadline is calculated when the worker accepts.
- The review deadline is calculated when the worker submits work.
- The arbitration deadline is calculated when the owner opens a dispute.
- Deadlines for stages that have not begun remain zero.
- An action is allowed only when the current timestamp is strictly less than its deadline.
- An expiration is allowed when the current timestamp is greater than or equal to its deadline.
- Late actions revert and do not implicitly materialize expiration.
- Each expiration is processed through a dedicated function.

The escrow also exposes read-only helpers for each timed stage:

- `acceptanceExpired()`.
- `submissionExpired()`.
- `reviewExpired()`.
- `arbitrationExpired()`.

Each helper returns `false` while its deadline is zero and otherwise reports whether the current timestamp is greater than or equal to that deadline.

### Creation interface

The factory creation interface receives:

- Worker address.
- Arbiter address.
- Acceptance duration.
- Work duration.
- Review duration.
- Arbitration duration.
- Title.
- ETH through the payable call.

The function returns the newly created escrow address.

The title:

- Must contain at least one byte.
- Must not exceed 64 bytes.
- Is measured by UTF-8 byte length.
- Is stored in the escrow.
- Is not emitted in the creation event.

The amount:

- Must be greater than zero.
- Is stored as the immutable escrow amount.
- Is transferred to the new escrow during creation.

### Submission interface

The work-submission function is named `submitWork`.

It:

- Can be called only by the worker.
- Can be called only from `PendingSubmission`.
- Can be called only before the submission deadline.
- Receives a submission-reference string.
- Requires the submission reference to contain between 1 and 256 bytes.
- Stores the submission reference permanently.
- Does not permit later modification.
- Calculates the review deadline.
- Moves the escrow to `PendingReview`.

### Approval interface

The approval function is named `approveWork`.

It:

- Can be called only by the owner.
- Can be called only from `PendingReview`.
- Can be called only before the review deadline.
- Allocates the full escrow amount to the worker.
- Moves the escrow to `WorkApproved`.

### Dispute interface

The dispute-opening function is named `openDispute`.

It:

- Can be called only by the owner.
- Can be called only from `PendingReview`.
- Can be called only before the review deadline.
- Receives a non-empty dispute reason.
- Limits the dispute reason to 256 bytes.
- Stores the dispute reason permanently.
- Does not emit the dispute reason.
- Calculates the arbitration deadline.
- Moves the escrow to `PendingArbitration`.

The dispute-resolution function is named `resolveDispute`.

It:

- Can be called only by the arbiter.
- Can be called only from `PendingArbitration`.
- Can be called only before the arbitration deadline.
- Receives the worker allocation in wei.
- Accepts any worker allocation from zero through the full escrow amount, inclusive.
- Calculates the owner allocation as the escrow amount minus the worker allocation.
- Receives a non-empty resolution reason.
- Limits the resolution reason to 256 bytes.
- Stores the resolution reason permanently.
- Does not emit the resolution reason.
- Allocates the resulting balances.
- Moves the escrow to `DisputeResolved`.

### Expiration behavior

`expireAcceptance`:

- Is permissionless.
- Requires `PendingAcceptance`.
- Requires the acceptance deadline to have been reached.
- Allocates the full amount to the owner.
- Moves the escrow to `AcceptanceExpired`.

`expireSubmission`:

- Is permissionless.
- Requires `PendingSubmission`.
- Requires the submission deadline to have been reached.
- Allocates the full amount to the owner.
- Moves the escrow to `SubmissionExpired`.

`expireReview`:

- Is permissionless.
- Requires `PendingReview`.
- Requires the review deadline to have been reached.
- Allocates the full amount to the worker.
- Moves the escrow to `ReviewExpired`.

`expireArbitration`:

- Is permissionless.
- Requires `PendingArbitration`.
- Requires the arbitration deadline to have been reached.
- Divides the escrow amount 50/50.
- Calculates the owner amount through integer division by two.
- Assigns the remaining amount, including any odd wei, to the worker.
- Moves the escrow to `ArbitrationExpired`.

### Cancellation behavior

The cancellation function is named `cancelEscrow`.

It:

- Can be called only by the owner.
- Can be called only from `PendingAcceptance`.
- Can be called only before the acceptance deadline.
- Allocates the full escrow amount to the owner.
- Moves the escrow to `EscrowCancelled`.

There is no worker rejection function.

There is no unilateral or mutual cancellation after the worker accepts.

### Withdrawal accounting

- Withdrawable balances are stored in a public mapping keyed by beneficiary address.
- Lifecycle transitions allocate funds but do not perform ETH transfers.
- The withdrawal function is named `withdraw`.
- `withdraw()` receives no amount or recipient parameter.
- It withdraws the caller's entire pending balance.
- It reverts when the caller has no pending balance.
- It clears the pending balance before making the external call.
- It uses a low-level ETH call.
- A failed transfer reverts the transaction and restores the pending balance.
- A successful withdrawal emits the account and amount.
- Withdrawals do not modify the state machine.
- There are no `Paid`, `Withdrawn`, or partially withdrawn states.

### Events

Escrow lifecycle events use the canonical names listed below. `EscrowAccepted` and `EscrowCancelled` retain the `Escrow` prefix; the remaining lifecycle events do not add it.

The lifecycle events are:

- `EscrowAccepted`, carrying the calculated submission deadline.
- `EscrowCancelled`, carrying no parameters.
- `AcceptanceExpired`, carrying no parameters.
- `WorkSubmitted`, carrying the calculated review deadline.
- `SubmissionExpired`, carrying no parameters.
- `WorkApproved`, carrying no parameters.
- `ReviewExpired`, carrying no parameters.
- `DisputeOpened`, carrying the calculated arbitration deadline.
- `DisputeResolved`, carrying owner and worker allocations.
- `ArbitrationExpired`, carrying no parameters.
- `FundsWithdrawn`, carrying an indexed account and the withdrawn amount.

Additional event rules:

- Events describe completed actions.
- Role addresses are omitted when the actor is unambiguously determined by the function authorization.
- Deadline parameters are not indexed.
- Dispute-resolution amount parameters are not indexed.
- Dynamic strings are stored but not emitted.
- Deterministic allocations are not duplicated in events.
- The withdrawal account is indexed because both owner and worker may withdraw.

The factory creation event carries:

- Indexed owner.
- Indexed worker.
- Indexed arbiter.
- Non-indexed escrow address.
- Amount.
- Acceptance duration.
- Work duration.
- Review duration.
- Arbitration duration.

The factory event does not include the title.

### Factory registries

The factory maintains:

- A list of escrow addresses by owner.
- A list of escrow addresses by worker.
- A list of escrow addresses by arbiter.
- A global list of all escrow addresses.

No boolean escrow registry is maintained.

The factory exposes count queries for:

- Owner escrows.
- Worker escrows.
- Arbiter escrows.
- All escrows.

The total count is derived from the global list length. No independent count variable is maintained.

### Validation and errors

The implementation must validate:

- Non-zero ETH amount.
- Non-zero participant addresses.
- Three distinct participant addresses.
- Four non-zero durations.
- Non-empty title.
- Title length of at most 64 bytes.
- Non-empty submission reference.
- Submission-reference length of at most 256 bytes.
- Non-empty dispute reason.
- Dispute-reason length of at most 256 bytes.
- Non-empty resolution reason.
- Resolution-reason length of at most 256 bytes.
- Worker allocation not exceeding the escrow amount.
- Exact source state for every transition.
- Correct caller role for every restricted action.
- Correct temporal window for every action and expiration.
- Non-zero pending balance for withdrawal.
- Successful ETH transfer during withdrawal.

Exact names for new custom errors remain an implementation-level naming decision, but errors should remain specific enough for tests and external clients to distinguish failure causes.

### Atomicity and consistency

- Escrow deployment, registry updates, and creation-event emission occur in one transaction.
- If escrow construction fails, no registry entries or events persist.
- If registry logic or event emission reverts, the deployment and value transfer also revert.
- A failed creation must leave existing arrays, mappings, balances, counts, and escrow entries unchanged.
- Every finalization path must allocate exactly the original escrow amount.
- No finalization path may allocate funds more than once.

## Further Notes

- The factory is the intended deployment path, but direct deployment of `Escrow` is not currently enforced at the bytecode level.
- The constructor should retain full validation because factory-only deployment is a design convention rather than an enforced invariant.
- The factory's global and per-role arrays are appropriate for the current academic-project scope. A production system with large volumes may rely more heavily on event indexing or pagination-oriented query functions.
- Strings are measured in UTF-8 bytes, not user-perceived characters. Accented characters, emoji, and other Unicode characters may consume multiple bytes.
- Absolute timestamps depend on block timestamps and should not be treated as sub-second precise wall-clock time.
- The withdrawal pattern prevents a recipient that rejects ETH from blocking the escrow's state transition or another beneficiary's withdrawal.
- A separate reentrancy guard was not explicitly required because the withdrawal logic clears state before the external call, but adding a guard may still be considered as defense in depth.
- The UI should derive available actions from the current state, caller role, and current timestamp.
- The UI should display inactive deadlines as not started when their stored value is zero.
- The UI should convert user-friendly time units into seconds before calling the factory.
- The UI should retrieve title, submission reference, dispute reason, and resolution reason through contract reads rather than event data.
- Tests should treat the exact deadline timestamp as expired.
- Tests should verify all transition events, state updates, pending balances, immutable data, time boundaries, access controls, invalid states, failed transfers, and factory registry consistency.
