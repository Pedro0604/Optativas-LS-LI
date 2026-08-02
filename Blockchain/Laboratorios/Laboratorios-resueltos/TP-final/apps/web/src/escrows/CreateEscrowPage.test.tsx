import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateEscrowPage } from "./CreateEscrowPage";

const mocks = vi.hoisted(() => ({
  account: {
    isConnected: false,
    address: undefined as `0x${string}` | undefined,
    chainId: undefined as number | undefined,
  },
  writeContractAsync: vi.fn(),
  simulateContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  readContract: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => mocks.account,
  useWriteContract: () => ({ writeContractAsync: mocks.writeContractAsync }),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../runtime", () => ({
  config: {
    factoryAddress: "0x0000000000000000000000000000000000000001",
    explorerUrl: "https://etherscan.io",
  },
  publicClient: {
    simulateContract: mocks.simulateContract,
    waitForTransactionReceipt: mocks.waitForTransactionReceipt,
    readContract: mocks.readContract,
  },
}));
vi.mock("../wallet/WalletControls", () => ({
  WalletControls: () => <button>Conectar wallet</button>,
}));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CreateEscrowPage />
    </QueryClientProvider>,
  );
}

async function completeDraft() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Título"), "Diseño");
  await user.type(screen.getByLabelText("Monto (ETH)"), "1");
  await user.type(
    screen.getByLabelText("Dirección del worker"),
    "0x0000000000000000000000000000000000000002",
  );
  await user.type(
    screen.getByLabelText("Dirección del árbitro"),
    "0x0000000000000000000000000000000000000003",
  );
  for (const label of ["Aceptación", "Entrega", "Revisión", "Arbitraje"])
    await user.type(screen.getByLabelText(`${label} duración`), "1");
  return user;
}

async function reviewConnectedDraft() {
  mocks.account = {
    isConnected: true,
    address: "0x0000000000000000000000000000000000000001",
    chainId: 11155111,
  };
  renderPage();
  const user = await completeDraft();
  await user.click(screen.getByRole("button", { name: "Revisar creación" }));
  return user;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.account = { isConnected: false, address: undefined, chainId: undefined };
  mocks.simulateContract.mockReset();
  mocks.waitForTransactionReceipt.mockReset();
  mocks.readContract.mockReset();
});

describe("CreateEscrowPage", () => {
  it("keeps the draft disconnected and asks for a wallet only from review", async () => {
    renderPage();
    expect(screen.queryByRole("button", { name: "Conectar wallet" })).not.toBeInTheDocument();
    const user = await completeDraft();
    await user.click(screen.getByRole("button", { name: "Revisar creación" }));
    expect(screen.getByText(/1000000000000000000 wei/)).toBeVisible();
    expect(screen.getAllByText("86400 segundos")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Conectar wallet" })).toBeVisible();
  });

  it("shows client validation before review for a connected owner", async () => {
    mocks.account = {
      isConnected: true,
      address: "0x0000000000000000000000000000000000000001",
      chainId: 11155111,
    };
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Título"), "é".repeat(33));
    await user.click(screen.getByRole("button", { name: "Revisar creación" }));
    expect(screen.getByText("El título admite hasta 64 bytes (tiene 66).")).toBeVisible();
    expect(screen.queryByText("Confirmá los datos on-chain")).not.toBeInTheDocument();
  });

  it("shows a translated simulation failure before requesting a wallet signature", async () => {
    mocks.simulateContract.mockRejectedValueOnce(new Error("ZeroDuration"));
    const user = await reviewConnectedDraft();
    await user.click(screen.getByRole("button", { name: "Simular y firmar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cada duración debe ser mayor a cero.",
    );
    expect(mocks.writeContractAsync).not.toHaveBeenCalled();
  });

  it("retains the hash when confirmation lacks a factory creation event", async () => {
    mocks.simulateContract.mockResolvedValueOnce({ request: {} });
    mocks.writeContractAsync.mockResolvedValueOnce(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    mocks.waitForTransactionReceipt.mockResolvedValueOnce({ status: "success", logs: [] });
    const user = await reviewConnectedDraft();
    await user.click(screen.getByRole("button", { name: "Simular y firmar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "no pudimos identificar el escrow creado",
    );
    expect(screen.getByRole("link", { name: "Ver transacción confirmada" })).toHaveAttribute(
      "href",
      expect.stringContaining("/tx/0xaaaa"),
    );
  });
});
