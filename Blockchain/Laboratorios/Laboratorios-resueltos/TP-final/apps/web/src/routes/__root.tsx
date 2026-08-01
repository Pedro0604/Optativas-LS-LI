import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import type { RouterContext } from "../routerContext";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <div className="shell">
      <header>
        <Link to="/" className="brand">
          Pacto
        </Link>
        <span className="network">● Sepolia</span>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>Datos públicos verificados en Sepolia</footer>
    </div>
  ),
});
