import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WalletControls } from "./WalletControls";
import { SEPOLIA_CHAIN_ID, walletConnectionRequestEvent } from "./wallet";

const mocks = vi.hoisted(() => ({
  account: {
    isConnected: false,
    address: undefined as `0x${string}` | undefined,
    chainId: undefined as number | undefined,
  },
  connect: vi.fn(),
  disconnect: vi.fn(),
  switchChain: vi.fn(),
  connectionError: undefined as Error | undefined,
  switchError: undefined as Error | undefined,
}));

vi.mock("wagmi", () => ({
  useAccount: () => mocks.account,
  useConnect: () => ({
    connectors: [
      { uid: "metamask", name: "MetaMask" },
      { uid: "rabby", name: "Rabby" },
    ],
    connect: mocks.connect,
    error: mocks.connectionError,
    isPending: false,
  }),
  useDisconnect: () => ({ disconnect: mocks.disconnect }),
  useSwitchChain: () => ({
    switchChain: mocks.switchChain,
    error: mocks.switchError,
    isPending: false,
  }),
}));

function renderControls(client = new QueryClient()) {
  const view = render(
    <QueryClientProvider client={client}>
      <WalletControls />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.account = { isConnected: false, address: undefined, chainId: undefined };
  mocks.connectionError = undefined;
  mocks.switchError = undefined;
});

describe("WalletControls", () => {
  it("does not request an account until the user selects a discovered connector", async () => {
    renderControls();
    expect(mocks.connect).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Conectar wallet" }));
    await userEvent.click(screen.getByRole("button", { name: "Rabby" }));

    expect(mocks.connect).toHaveBeenCalledWith({
      connector: expect.objectContaining({ uid: "rabby" }),
    });
  });

  it("opens the existing connector selector for a deferred write request", async () => {
    renderControls();
    await act(async () => window.dispatchEvent(new Event(walletConnectionRequestEvent)));
    expect(screen.getByRole("button", { name: "MetaMask" })).toBeVisible();
  });

  it("keeps public browsing available when connection is rejected", async () => {
    mocks.connectionError = new Error("rejected");
    renderControls();
    await userEvent.click(screen.getByRole("button", { name: "Conectar wallet" }));
    expect(screen.getByText("No se pudo conectar la wallet.")).toBeVisible();
  });

  it("disconnects the selected connector", async () => {
    mocks.account = {
      isConnected: true,
      address: "0x1234567890123456789012345678901234567890",
      chainId: SEPOLIA_CHAIN_ID,
    };
    renderControls();
    await userEvent.click(screen.getByRole("button", { name: "Desconectar" }));
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it("blocks wrong-network writes behind a Sepolia switch and reports rejection", async () => {
    mocks.account = {
      isConnected: true,
      address: "0x1234567890123456789012345678901234567890",
      chainId: 1,
    };
    mocks.switchError = new Error("rejected");
    renderControls();

    await userEvent.click(screen.getByRole("button", { name: "Usar Sepolia" }));
    expect(mocks.switchChain).toHaveBeenCalledWith({ chainId: SEPOLIA_CHAIN_ID });
    expect(screen.getByText("No se cambió la red.")).toBeVisible();
  });

  it("invalidates account-sensitive state after an account change or disconnect", () => {
    mocks.account = {
      isConnected: true,
      address: "0x1234567890123456789012345678901234567890",
      chainId: SEPOLIA_CHAIN_ID,
    };
    const changed = vi.fn();
    window.addEventListener("pacto:wallet-context-changed", changed);
    const { client, rerender } = renderControls();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    mocks.account = {
      isConnected: true,
      address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      chainId: SEPOLIA_CHAIN_ID,
    };
    rerender(
      <QueryClientProvider client={client}>
        <WalletControls />
      </QueryClientProvider>,
    );
    expect(invalidate).toHaveBeenCalledOnce();
    expect(changed).toHaveBeenCalledOnce();

    mocks.account = { isConnected: false, address: undefined, chainId: undefined };
    rerender(
      <QueryClientProvider client={client}>
        <WalletControls />
      </QueryClientProvider>,
    );
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenCalledTimes(2);
    window.removeEventListener("pacto:wallet-context-changed", changed);
  });
});
