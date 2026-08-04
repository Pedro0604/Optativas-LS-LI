import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  it("renders a Spanish 404 page with an autocompleting command line", async () => {
    const user = userEvent.setup();
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
    const input = screen.getByRole("textbox", { name: "Comando de navegación" });
    await user.type(input, "mi");

    expect(screen.getByRole("button", { name: /mis-escrows/i })).toBeInTheDocument();

    await user.tab();

    expect(input).toHaveValue("mis-escrows");
  });
});
