# 01 — Base SPA and public escrow discovery

**What to build:** A production-buildable React SPA whose root view lets a visitor browse canonical escrows from the configured Sepolia factory without connecting a wallet.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] The SPA uses Vite, strict TypeScript, file-based TanStack Router, TanStack Query, Tailwind, and accessible shared UI primitives inside the pnpm workspace.
- [x] Startup validates the public RPC URL, Sepolia chain ID, factory address, and explorer URL and renders a clear configuration error when invalid.
- [x] Compiled contract ABIs and chain metadata are generated as committed typed bindings, and a repeatable check detects drift.
- [x] Hardhat tests verify that successful factory creation sets `isEscrow` atomically and invalid creation leaves it false without corrupting registries.
- [x] The root route displays canonical escrows newest-first using count/index pagination with a default page size of 20.
- [x] Card details use same-block multicalls; one failed item remains retryable without hiding successful items.
- [x] Pagination and supported filters survive reload through validated search parameters.
- [x] Public discovery works without a connected wallet and has tested loading, empty, success, partial-error, and fatal-error states.

## Answer

Implementada la SPA pública en `apps/web`, bindings generados en `packages/contracts`, registro canónico `isEscrow`, paginación newest-first, filtros por URL, multicalls al mismo bloque, tolerancia de errores por tarjeta y validación explícita de configuración. Verificado con Hardhat, Vitest, TypeScript y build de producción.
