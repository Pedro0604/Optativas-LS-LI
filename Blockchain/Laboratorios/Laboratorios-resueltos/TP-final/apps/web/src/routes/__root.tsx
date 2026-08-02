import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import type { RouterContext } from "../routerContext";
import { WalletControls } from "../wallet/WalletControls";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <div className="grid min-h-screen grid-rows-[auto_1fr_auto]">
      <header className="mx-auto flex w-[min(1120px,calc(100%-2rem))] items-center justify-between py-6">
        <div className="flex gap-4 items-center">
          <Link
            to="/"
            className="font-display text-2xl font-bold text-ink no-underline transition hover:text-primary-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Pacto
          </Link>
          <Link
            to="/my-escrows"
            className="text-sm font-semibold text-primary no-underline hover:text-primary-strong"
          >
            Mis escrows
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <WalletControls />
          <span className="text-xs font-semibold tracking-wide text-primary">● Sepolia</span>
        </div>
      </header>
      <main className="mx-auto w-[min(1120px,calc(100%-2rem))]">
        <Outlet />
      </main>
      <footer className="mx-auto mt-16 w-[min(1120px,calc(100%-2rem))] border-t border-line py-8 text-sm text-muted">
        Datos públicos verificados en Sepolia
      </footer>
    </div>
  ),
});
