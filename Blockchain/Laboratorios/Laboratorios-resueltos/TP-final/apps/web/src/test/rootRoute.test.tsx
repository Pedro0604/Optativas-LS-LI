import { render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { NotFoundPage } from "../ui/NotFoundPage";

describe("root route", () => {
  it("renders a Spanish 404 page with recovery links for an unknown route", async () => {
    const rootRoute = createRootRoute({ notFoundComponent: NotFoundPage });
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => <h1>Inicio</h1>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ["/desconocida"] }),
    });

    render(<RouterProvider router={router} />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Conexión rota." })).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "↳ Reconectar al inicio" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Ver mis escrows" })).toHaveAttribute(
      "href",
      "/my-escrows",
    );
  });
});
