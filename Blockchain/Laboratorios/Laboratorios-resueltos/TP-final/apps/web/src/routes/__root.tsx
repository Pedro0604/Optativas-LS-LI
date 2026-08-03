import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import type { RouterContext } from "../routerContext";
import { WalletControls } from "../wallet/WalletControls";
import { TransactionRecovery } from "../transactions/TransactionRecovery";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <div className="grid min-h-screen grid-rows-[auto_1fr_auto]">
      <header className="mx-auto flex w-[min(1120px,calc(100%-2rem))] flex-wrap items-center justify-between gap-4 border-b border-line py-5">
        <div className="flex items-center gap-5">
          <Link
            to="/"
            aria-label="Pacto · Inicio"
            className="group flex items-center gap-3 rounded-xl text-ink no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-primary/30 bg-[#161a16] shadow-[0_8px_28px_rgb(119_201_154/0.14)] transition duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/60 group-hover:shadow-[0_10px_32px_rgb(119_201_154/0.22)]">
              <img
                src="/icon.png"
                alt=""
                className="size-full scale-85 object-cover"
                width="44"
                height="44"
              />
            </span>
            <span className="font-display text-2xl font-bold transition group-hover:text-primary-strong">
              Pacto
            </span>
          </Link>
          <nav aria-label="Navegación principal" className="flex items-center gap-4">
            <Link
              to="/my-escrows"
              className="text-sm font-semibold text-primary no-underline transition hover:text-primary-strong"
            >
              Mis escrows
            </Link>
            <Link
              to="/create-escrow"
              className="text-sm font-semibold text-primary no-underline transition hover:text-primary-strong"
            >
              Crear escrow
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <WalletControls />
          <span className="text-xs font-semibold tracking-wide text-primary">● Sepolia</span>
        </div>
      </header>
      <TransactionRecovery />
      <main className="mx-auto w-[min(1120px,calc(100%-2rem))] pt-8">
        <Outlet />
      </main>
      <footer className="mx-auto mt-16 w-[min(1120px,calc(100%-2rem))] border-t border-line py-8 text-sm text-muted flex justify-between">
        <span>Datos públicos verificados en Sepolia</span>
        <span>Trabajo Final Introducción a Blockchain · Spadari Pedro</span>
      </footer>
    </div>
  ),
});
