# SPA para operar escrows

Status: ready-for-agent

## Problem Statement

Los participantes no tienen una interfaz web para descubrir, consultar y operar los escrows desplegados. Hoy deben conocer las direcciones, interpretar directamente el estado on-chain y construir llamadas manualmente. Esto dificulta entender roles, plazos y fondos, y aumenta el riesgo de ejecutar una acción incorrecta o desde una cuenta o red equivocada.

## Solution

Construir una SPA responsive en React para Sepolia. Cualquier visitor podrá explorar escrows canónicos sin conectar una wallet. Una connected account podrá consultar sus escrows por rol y ejecutar las available actions que correspondan. La aplicación derivará una vista coherente desde el snapshot on-chain, simulará cada escritura antes de solicitar la firma y mantendrá al contrato como autoridad final.

La navegación tendrá un listado global, listados paginados por rol, creación y detalle. El detalle reunirá participantes, fondos, evidencia, acciones y una timeline visual que distinga el escrow state, los deadlines y una unfinalized expiration.

## User Stories

1. As a visitor, I want to explore all canonical escrows without connecting a wallet, so that public blockchain data remains publicly accessible.
2. As a visitor, I want the global escrow list at the root route, so that the application opens on useful content.
3. As a visitor, I want paginated results, so that the application does not fetch the complete factory registry.
4. As a visitor, I want newest escrows first, so that recent activity is easy to find.
5. As a visitor, I want each list entry to show its title, amount, state, participants, and relevant deadline, so that I can assess it before opening the detail.
6. As a visitor, I want a failed card read not to hide the rest of the page, so that one malformed response does not make the list unusable.
7. As a visitor, I want filters encoded in URL search parameters, so that I can share and restore a view.
8. As a visitor, I want to open an escrow through a stable address-based URL, so that details are directly linkable.
9. As a visitor, I want hexadecimal addresses validated before an RPC call, so that malformed URLs fail quickly.
10. As a visitor, I want valid addresses normalized to checksum form, so that each escrow has one canonical URL.
11. As a visitor, I want the application to verify factory membership through `isEscrow`, so that compatible but non-canonical deployments are not presented as system escrows.
12. As a visitor, I want an explicit not-found result for an address outside the factory, so that invalid and missing escrows are understandable.
13. As a visitor, I want contract read failures to offer retry, so that transient RPC errors are recoverable.
14. As a visitor, I want to see all escrow details without a wallet, so that connection is required only for writes.
15. As a visitor, I want future stages labeled as not started, so that zero deadlines are not displayed as real dates.
16. As a participant, I want to connect an injected EIP-1193 wallet, so that I can transact with MetaMask, Rabby, or a compatible provider.
17. As a participant, I want a selector when multiple injected wallets are available, so that I control which provider is used.
18. As a participant, I want connection requested only when needed, so that browsing does not trigger wallet prompts.
19. As a participant, I want my interrupted action resumed after connecting, so that connection does not lose my intent.
20. As a participant, I want the last authorized wallet silently reconnected after reload, so that returning is convenient.
21. As a participant, I do not want an automatic authorization prompt on page load, so that the application does not surprise me.
22. As a participant, I want disconnect to clear the local reconnection preference, so that I control wallet persistence.
23. As a participant, I want the SPA to remain readable after disconnecting, so that wallet state does not gate public data.
24. As a participant, I want a wrong-network warning with an option to switch to Sepolia, so that I can correct the network before writing.
25. As a participant, I want to keep viewing Sepolia data while my wallet is on another network, so that read access remains useful.
26. As a participant, I want writes blocked until the wallet uses Sepolia, so that I do not submit an action to the wrong chain.
27. As a participant, I want changed account or network state to refresh all dependent data, so that stale roles and actions disappear.
28. As a participant, I want modified forms protected before an account change discards them, so that I do not lose work silently.
29. As a participant, I want pending action state reset after changing accounts, so that a transaction is never attributed to the wrong account.
30. As a participant, I want a dedicated My Escrows route, so that relevant agreements are separated from global discovery.
31. As a participant, I want My Escrows to remain at its route while disconnected, so that connecting reveals results without a redirect.
32. As a participant, I want independent owner, worker, and arbiter tabs, so that each factory registry can be paginated directly.
33. As a participant, I want role tabs encoded in search parameters, so that my current view survives navigation and reload.
34. As an owner, I want to prepare a new escrow before connecting, so that wallet connection is deferred until review.
35. As an owner, I want to enter the funded amount in ETH, so that I do not need to calculate wei manually.
36. As an owner, I want worker and arbiter entered as explicit addresses, so that name resolution cannot silently select an unintended account.
37. As an owner, I want zero and duplicate participant addresses rejected before simulation, so that obvious invalid creations are caught early.
38. As an owner, I want durations entered using friendly units, so that I do not calculate seconds manually.
39. As an owner, I want all durations converted to exact seconds in a review summary, so that I can verify the contract arguments.
40. As an owner, I want title length measured in UTF-8 bytes, so that client validation matches Solidity.
41. As an owner, I want the funding amount, roles, title, and durations summarized before signing, so that an irreversible creation is deliberate.
42. As an owner, I want successful creation to navigate to the emitted escrow address, so that I can immediately inspect it.
43. As an owner, I want the emitted address verified through the factory registry, so that navigation targets a canonical escrow.
44. As a worker, I want to accept an eligible escrow, so that the work stage begins.
45. As a worker, I want to submit an immutable submission reference, so that the owner can locate the work.
46. As a worker, I want a valid HTTPS submission reference rendered as a safe external link, so that the delivery is convenient to inspect.
47. As a participant, I want submission references rendered as plain text by default, so that arbitrary content is not executed or interpreted as HTML.
48. As an owner, I want to approve submitted work, so that the worker receives the complete allocation.
49. As an owner, I want to open a dispute with an immutable reason, so that the arbiter has durable context.
50. As an arbiter, I want to resolve a dispute by assigning an exact amount to the worker, so that the remainder goes deterministically to the owner.
51. As an arbiter, I want linked worker and owner allocation sliders, so that changing either visibly changes the other.
52. As an arbiter, I want exact ETH input fields alongside sliders, so that allocations are not limited by slider precision.
53. As an arbiter, I want 0%, 50%, and 100% shortcuts, so that common allocations are quick to select.
54. As an arbiter, I want exact worker and owner amounts summarized before signing, so that rounding is visible.
55. As a participant, I want a privacy warning beside immutable text fields, so that I do not publish personal data, secrets, or credentials.
56. As a participant, I want no edit or delete affordance for on-chain text, so that the UI does not imply impossible behavior.
57. As any connected account, I want to finalize an elapsed deadline, so that permissionless expiration functions are accessible.
58. As a visitor, I want an elapsed deadline distinguished from a finalized expiration, so that time passage is not confused with an on-chain state transition.
59. As a participant, I want the countdown based on the latest block timestamp, so that it reflects contract time rather than only my device clock.
60. As a participant, I want the escrow refreshed when a countdown reaches zero, so that available actions are recalculated from authoritative data.
61. As a visitor, I want a visual lifecycle timeline, so that completed, current, and future stages are easy to understand.
62. As a visitor, I want known deadlines shown on the timeline, so that timing commitments are visible.
63. As a visitor, I want elapsed deadlines visibly marked, so that overdue stages stand out.
64. As a visitor, I want the current escrow state highlighted independently of deadlines, so that an unfinalized expiration is clear.
65. As a beneficiary, I want my pending withdrawal shown on each escrow, so that I know where funds can be claimed.
66. As a beneficiary, I want to withdraw from one escrow at a time, so that each transaction has a clear source and outcome.
67. As a participant, I do not want a misleading global pending balance, so that incomplete pagination is never presented as an exact total.
68. As a participant, I want every write simulated before the wallet prompt, so that predictable reverts are caught early.
69. As a participant, I want to see when the application is waiting for wallet confirmation, so that I know action is required.
70. As a participant, I want a submitted transaction hash linked to Sepolia Etherscan, so that I can independently inspect it.
71. As a participant, I want confirmed and failed transaction states distinguished, so that broadcast is not confused with execution.
72. As a participant, I want rejected wallet requests explained without changing escrow data, so that cancellation is safe.
73. As a participant, I want no optimistic escrow transitions, so that the UI never displays an unconfirmed state as final.
74. As a participant, I want affected queries refreshed after confirmation, so that the receipt is reflected in the application.
75. As a participant, I want duplicate actions on the same escrow disabled while pending, so that I cannot accidentally submit twice.
76. As a participant, I want to continue operating a different escrow while one transaction is pending, so that unrelated work is not blocked.
77. As a participant, I want Solidity custom errors translated into actionable Spanish, so that failures are understandable.
78. As a participant, I want unknown technical error details available to copy, so that debugging remains possible without overwhelming the primary message.
79. As a participant, I want irreversible actions to show a review confirmation, so that value-moving decisions are deliberate.
80. As a participant, I want the wallet itself to remain the final cryptographic confirmation, so that the SPA never claims authority it does not have.
81. As a visitor, I want active detail data refreshed on new blocks, so that external transactions become visible without reload.
82. As a visitor, I want list refreshes less frequent than detail refreshes, so that RPC traffic remains controlled.
83. As a visitor, I want polling paused while the tab is hidden, so that background traffic is avoided.
84. As a mobile participant, I want responsive navigation and forms, so that an injected wallet browser can operate the SPA.
85. As a keyboard user, I want all dialogs, tabs, wallet controls, and allocation inputs operable without a pointer, so that core flows are accessible.
86. As a participant, I want amounts and addresses displayed in a copyable form, so that I can verify exact on-chain values.
87. As a maintainer, I want the application to fail clearly when deployment configuration is missing or invalid, so that it never silently targets the wrong contract.
88. As a maintainer, I want generated ABI changes visible in version control, so that contract interface drift is reviewable.
89. As a maintainer, I want CI to detect stale generated ABIs, so that frontend bindings match compiled contracts.
90. As a maintainer, I want Spanish state, role, action, and error labels centralized, so that terminology remains consistent.

## Implementation Decisions

- The frontend is an independent React package inside the existing pnpm workspace. It is built with Vite and strict TypeScript.
- TanStack Router uses file-based, lazy-loaded routes. The root route lists every canonical escrow; My Escrows, creation, and address-based detail are separate routes.
- TanStack Router owns navigation and validated search parameters. Route loaders validate parameters and prefetch with `ensureQueryData`; TanStack Query remains the single owner of remote data.
- TanStack Query owns on-chain cache, invalidation, polling, and loading/error states. No Redux, Zustand, or equivalent global store is introduced.
- TanStack Form owns contractual forms and client-side validation. TanStack Table and TanStack Virtual are deferred until demonstrated volume requires them.
- wagmi owns injected-wallet lifecycle and viem owns typed reads, multicalls, simulation, writes, receipts, and event decoding. Ethers remains in the Hardhat test environment.
- Only injected EIP-1193 wallets are supported initially. WalletConnect and ENS are excluded.
- Wallet connection identifies the connected account but creates no off-chain authenticated session. Contracts authorize every write through `msg.sender`.
- Public reads always use the configured Sepolia RPC. The wallet network affects writes, not the chain from which application data is read.
- Sepolia is the only supported deployed network. The expected chain ID is `11155111`; there is no chain selector.
- Runtime configuration supplies the public RPC URL, factory address, expected chain ID, and explorer base URL. Configuration is validated at startup and contains no secrets.
- Contract ABIs and chain metadata are generated as TypeScript constants in a shared package and committed. The factory address is not embedded in generated bindings.
- Hardhat compilation precedes ABI generation and TypeScript checking. CI detects generated-file drift.
- The application is organized into deep modules for wallet lifecycle, escrow listing, escrow detail/lifecycle, escrow creation, and transaction coordination, plus shared generated contracts and UI primitives.
- Modules own their query definitions, mutations, validation, and domain-to-view translation. Generic pass-through wrappers around individual Solidity functions are avoided.
- A central pure projection receives an on-chain escrow snapshot, connected account, and latest block time. It returns the visible state, role, active deadline, and available actions.
- UI-derived available actions are guidance only. Every write is simulated and the contract is the final authority.
- The transaction module coordinates simulation, wallet request, receipt tracking, explorer links, error classification, and post-confirmation invalidation. Feature modules provide the specific call and affected query keys.
- Transaction UI distinguishes waiting for wallet, submitted, confirmed, and failed/rejected. Escrow state is not optimistically mutated.
- Concurrent writes are blocked per escrow rather than globally.
- Global and per-role lists use count queries plus reverse index calculation to paginate newest-first. Page size defaults to 20.
- My Escrows uses independent owner, worker, and arbiter tabs. It does not merge all role registries before pagination.
- List details are fetched in same-block multicalls with partial-failure tolerance. Essential detail reads fail as a recoverable route error.
- Address routes normalize valid addresses to checksum form and verify canonical membership through the factory `isEscrow` mapping.
- Contract state is refreshed by HTTP block polling. Detail refreshes each observed block, lists refresh less frequently and after owned writes, and polling pauses in hidden tabs.
- Countdowns start from the latest known block timestamp plus locally elapsed time. Reaching zero triggers a refresh but never mutates state locally.
- The lifecycle timeline shows completed stages, current state, known deadlines, unstarted future stages, terminal outcomes, and unfinalized expiration. Exact historical event chronology is deferred.
- Escrow creation accepts ETH, explicit worker/arbiter addresses, friendly duration units, and a UTF-8-byte-limited title. A review step displays exact converted arguments before simulation.
- Creation success decodes `EscrowCreated` from the confirmed receipt, verifies membership, and navigates to the canonical detail URL.
- Submission references are free text. Only syntactically valid HTTPS URLs become safe external links; arbitrary text is never interpreted as markup.
- Dispute resolution stores one authoritative `workerAmountWei`. Linked worker/owner sliders, exact ETH fields, and allocation shortcuts update that value; owner allocation is always the exact remainder.
- Pending withdrawals are displayed and executed per escrow. No aggregate balance is calculated.
- Account or chain changes preserve the route, reset account-sensitive transaction state, invalidate dependent queries, and rederive roles/actions. Modified forms require confirmation before discard.
- The creation form may be prepared while disconnected and is revalidated against the owner account after connection.
- Custom Solidity errors map to centralized Spanish messages. Unknown errors provide a safe summary plus optional copyable technical detail.
- Irreversible actions receive an application review step; the wallet prompt remains the final confirmation.
- The visual system uses Tailwind CSS with accessible Radix UI primitives, incorporated through shadcn where useful. Shared visual primitives remain project-owned.
- The SPA is responsive for mobile, tablet, and desktop. Mobile wallet use assumes an in-app browser that injects EIP-1193.
- The first release is Spanish-only. Domain labels are centralized without adding an internationalization framework.
- The production output is a static build. Hosting is undecided but must rewrite client-side routes to the SPA entry document.

## Testing Decisions

- Tests assert externally observable behavior through the highest practical seam. They do not assert hook composition, internal query keys, folder structure, or private helper calls.
- The primary pure seam is escrow projection: snapshots, accounts, roles, block times, and allocations produce visible state, active deadline, and available actions.
- Projection tests cover every operational and terminal escrow state, each participant role, disconnected mode, wrong-network write blocking, exact deadline boundaries, zero/unstarted deadlines, and unfinalized expiration.
- Validation tests cover wei/ETH conversion, duration conversion, zero/distinct addresses, UTF-8 byte limits, submission references, dispute/resolution reasons, and exact complementary allocations including odd wei.
- Module integration tests use Vitest and Testing Library with controlled wallet and RPC clients. They cover route rendering, query states, forms, confirmations, transaction lifecycle, invalidation, account/network changes, and accessible interaction.
- Router integration tests cover root discovery, My Escrows without a wallet, role/search parameter persistence, address normalization, factory membership checks, not-found behavior, and route-level retry.
- Listing integration tests cover reverse-index pagination, multicall batching, deterministic ordering, loading, empty results, and partial item failures.
- Transaction integration tests cover simulation failure, wallet rejection, broadcast, successful receipt, reverted receipt, event decoding, duplicate-action blocking, and per-escrow concurrency.
- Wallet tests use a controlled injected connector rather than automating a browser extension.
- Existing Hardhat Solidity and TypeScript suites remain the prior art and authority for contract lifecycle, access control, deadlines, allocations, withdrawals, events, and factory consistency.
- Hardhat tests must cover the factory `isEscrow` registry and its atomic update during creation; frontend tests may assume the published ABI behavior after contract integration coverage passes.
- A real-wallet Playwright suite is deferred because extension automation adds disproportionate complexity. A later smoke E2E may be added after the frontend stabilizes.
- The verification pipeline compiles contracts before generated binding checks, then runs frontend typecheck, unit/integration tests, and production build.

## Out of Scope

- Off-chain profiles, accounts, sessions, or SIWE authentication.
- Backend services, databases, indexers, and event-derived read models.
- WalletConnect, QR-based mobile connection, ENS resolution, and multichain support.
- Push, email, or background notifications.
- Fiat-price conversion and market data.
- Exact historical event timelines.
- Aggregate pending-withdrawal balances and batch withdrawals.
- Batch lifecycle actions across multiple escrows.
- Administrative dashboards or privileged off-chain controls.
- Editing or deleting immutable on-chain text.
- TanStack Table or Virtual before a measured need.
- Automated E2E tests using a real wallet browser extension.
- A fixed hosting provider.

## Further Notes

- Every title, submission reference, dispute reason, and resolution reason is public and immutable. The interface must warn against publishing personal data, credentials, or secrets.
- A connected account is not an off-chain identity proof. Authorization is established only when the resulting transaction executes with that account as `msg.sender`.
- The factory arrays make indexed pagination possible but do not provide arbitrary sorting or filtering by state. Client-visible filters apply to the loaded page unless a future indexer is introduced, and must be labeled accordingly.
- `isEscrow` deliberately duplicates membership information to make canonical deep-link verification constant time. This is recorded in the factory membership ADR.
- The RPC polling interval should be configurable and conservative. HTTP polling is preferred over requiring WebSocket support from the provider.
- A transaction may be replaced or remain pending for an extended period. Receipt tracking must retain the hash and allow recovery after refresh where feasible.
- User-visible amounts must preserve exact wei semantics even when formatted as ETH. Formatting must never silently round the value submitted to the contract.
- Static hosts must provide a fallback rewrite to the SPA entry document for address-based routes to survive direct navigation and reload.
