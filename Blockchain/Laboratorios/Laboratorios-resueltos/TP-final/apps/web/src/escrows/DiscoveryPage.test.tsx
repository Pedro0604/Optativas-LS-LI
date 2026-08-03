import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiscoveryPage } from "./DiscoveryPage";
import { EscrowState } from "./EscrowState";

const mocks = vi.hoisted(() => ({
  account: undefined as `0x${string}` | undefined,
  navigate: vi.fn(),
  refetch: vi.fn(),
  search: { page: 1, state: "all" as "all" | EscrowState },
  query: {} as Record<string, unknown>,
}));

vi.mock("wagmi", () => ({ useAccount: () => ({ address: mocks.account }) }));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQuery: () => mocks.query,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
  useNavigate: () => mocks.navigate,
  useSearch: () => mocks.search,
}));

vi.mock("../runtime", () => ({
  config: { factoryAddress: "0x0000000000000000000000000000000000000001" },
  publicClient: {},
}));

const data = { count: 2, page: 1, pageCount: 1, blockTime: 1n, items: [] };

function setQuery(overrides: Record<string, unknown> = {}) {
  mocks.query = {
    data,
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: mocks.refetch,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.search = { page: 1, state: "all" };
  mocks.account = undefined;
});

describe("DiscoveryPage", () => {
  it("keeps previous results visible and reports an update in progress", () => {
    setQuery({ isFetching: true });

    render(<DiscoveryPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Actualizando…");
    expect(screen.getByText("2 escrows registrados")).toBeInTheDocument();
    const staleResults = screen.getByText("Página 1 de 1").closest("[aria-busy]");
    expect(staleResults).toHaveAttribute("aria-busy", "true");
    expect(staleResults).toHaveClass("opacity-55");
  });

  it("shows the selected filter before its request settles", async () => {
    setQuery();
    const view = render(<DiscoveryPage />);

    await userEvent.click(screen.getByRole("combobox", { name: "Estado" }));
    await userEvent.click(screen.getByRole("option", { name: "En arbitraje" }));

    expect(mocks.navigate).toHaveBeenCalledOnce();
    const navigation = mocks.navigate.mock.calls[0][0];
    expect(navigation.search(mocks.search)).toEqual({
      page: 1,
      state: EscrowState.PendingArbitration,
    });

    mocks.search = navigation.search(mocks.search);
    setQuery({ isFetching: true });
    view.rerender(<DiscoveryPage />);

    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveTextContent("En arbitraje");
    expect(screen.getByRole("status")).toHaveTextContent("Actualizando…");
    expect(screen.getByText("2 escrows registrados")).toBeInTheDocument();
  });

  it("keeps the last successful results and offers retry after an update fails", async () => {
    setQuery();
    const view = render(<DiscoveryPage />);

    setQuery({ data: undefined, isError: true });
    view.rerender(<DiscoveryPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos actualizar los escrows. Se muestran los resultados anteriores.",
    );
    expect(screen.getByText("2 escrows registrados")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
});
