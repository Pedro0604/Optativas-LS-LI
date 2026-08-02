import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MyEscrowsPage } from "./MyEscrowsPage";

const mocks = vi.hoisted(() => ({
  account: { isConnected: false, address: undefined as `0x${string}` | undefined },
  navigate: vi.fn(),
  refetch: vi.fn(),
  search: { role: "owner" as "owner" | "worker" | "arbiter", page: 1 },
  query: {} as Record<string, unknown>,
}));

vi.mock("wagmi", () => ({ useAccount: () => mocks.account }));
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
vi.mock("../wallet/WalletControls", () => ({
  WalletControls: () => <button type="button">Conectar wallet</button>,
}));

const data = { count: 0, page: 1, pageCount: 1, blockTime: 1n, items: [] };

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
  mocks.account = { isConnected: false, address: undefined };
  mocks.search = { role: "owner", page: 1 };
});

describe("MyEscrowsPage", () => {
  it("keeps its route readable while disconnected", () => {
    setQuery();
    render(<MyEscrowsPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Conectá tu wallet para ver tus escrows");
    expect(screen.getByRole("button", { name: "Conectar wallet" })).toBeVisible();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("switches role through shareable search and resets the page", async () => {
    mocks.account = { isConnected: true, address: "0x0000000000000000000000000000000000000002" };
    mocks.search = { role: "owner", page: 3 };
    setQuery();
    render(<MyEscrowsPage />);
    await userEvent.click(screen.getByRole("tab", { name: "Como worker" }));
    const navigation = mocks.navigate.mock.calls[0][0];
    expect(navigation.search(mocks.search)).toEqual({ role: "worker", page: 1 });
  });

  it("offers retry for an initial request failure", async () => {
    mocks.account = { isConnected: true, address: "0x0000000000000000000000000000000000000002" };
    setQuery({ data: undefined, isError: true });
    render(<MyEscrowsPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar tus escrows");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("retries partial card failures and changes page through search", async () => {
    mocks.account = { isConnected: true, address: "0x0000000000000000000000000000000000000002" };
    setQuery({
      data: {
        ...data,
        pageCount: 2,
        items: [
          {
            kind: "error",
            address: "0x0000000000000000000000000000000000000003",
            error: "RPC falló",
          },
        ],
      },
    });
    render(<MyEscrowsPage />);
    expect(screen.getByText("Lectura fallida")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    const navigation = mocks.navigate.mock.calls[0][0];
    expect(navigation.search(mocks.search)).toEqual({ role: "owner", page: 2 });
  });

  it("drops old account results while the new account loads", () => {
    mocks.account = { isConnected: true, address: "0x0000000000000000000000000000000000000002" };
    setQuery({ data: { ...data, count: 1 } });
    const view = render(<MyEscrowsPage />);
    expect(screen.getByText("No hay escrows para mostrar")).toBeVisible();

    mocks.account = { isConnected: true, address: "0x0000000000000000000000000000000000000003" };
    setQuery({ data: undefined, isPending: true });
    view.rerender(<MyEscrowsPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando tus escrows");
    expect(screen.queryByText("No hay escrows para mostrar")).not.toBeInTheDocument();
  });
});
