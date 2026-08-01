# 01 — Base SPA and public escrow discovery

**What to build:** A production-buildable React SPA whose root view lets a visitor browse canonical escrows from the configured Sepolia factory without connecting a wallet.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The SPA uses Vite, strict TypeScript, file-based TanStack Router, TanStack Query, Tailwind, and accessible shared UI primitives inside the pnpm workspace.
- [ ] Startup validates the public RPC URL, Sepolia chain ID, factory address, and explorer URL and renders a clear configuration error when invalid.
- [ ] Compiled contract ABIs and chain metadata are generated as committed typed bindings, and a repeatable check detects drift.
- [ ] Hardhat tests verify that successful factory creation sets `isEscrow` atomically and invalid creation leaves it false without corrupting registries.
- [ ] The root route displays canonical escrows newest-first using count/index pagination with a default page size of 20.
- [ ] Card details use same-block multicalls; one failed item remains retryable without hiding successful items.
- [ ] Pagination and supported filters survive reload through validated search parameters.
- [ ] Public discovery works without a connected wallet and has tested loading, empty, success, partial-error, and fatal-error states.

