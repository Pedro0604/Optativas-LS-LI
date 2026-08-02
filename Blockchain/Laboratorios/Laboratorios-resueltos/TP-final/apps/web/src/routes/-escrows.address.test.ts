import { QueryClient } from "@tanstack/react-query";
import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";

const { client } = vi.hoisted(() => ({
  client: {
    getBlockNumber: vi.fn(),
    readContract: vi.fn(),
    multicall: vi.fn(),
    getBlock: vi.fn(),
  },
}));

vi.mock("../runtime", () => ({ publicClient: client }));

import { loadEscrowDetailRoute } from "./escrows.$address";

const factoryAddress = "0x0000000000000000000000000000000000000002" as const;
const canonicalAddress = "0x52908400098527886E0F7030069857D2E4169EE7" as const;
const context = () => ({
  queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  config: {
    rpcUrl: "https://rpc.example",
    chainId: 11155111 as const,
    factoryAddress,
    explorerUrl: "https://sepolia.etherscan.io",
  },
});

describe("escrow detail route loader", () => {
  it("rejects malformed addresses before RPC", () => {
    expect(() => loadEscrowDetailRoute({ context: context(), params: { address: "bad" } })).toThrow(
      "La dirección del escrow no es válida.",
    );
    expect(client.getBlockNumber).not.toHaveBeenCalled();
  });

  it("redirects non-canonical casing to the checksum URL", () => {
    try {
      loadEscrowDetailRoute({
        context: context(),
        params: { address: canonicalAddress.toLowerCase() },
      });
      expect.fail("Expected redirect");
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect(error).toMatchObject({
        options: {
          to: "/escrows/$address",
          params: { address: canonicalAddress },
          replace: true,
        },
      });
    }
  });

  it("returns a distinct not-found result for a non-factory address", async () => {
    client.getBlockNumber.mockResolvedValueOnce(42n);
    client.readContract.mockResolvedValueOnce(false);
    await expect(
      loadEscrowDetailRoute({ context: context(), params: { address: canonicalAddress } }),
    ).resolves.toEqual({ kind: "not-found" });
  });

  it("propagates RPC errors to the route error boundary", async () => {
    client.getBlockNumber.mockRejectedValueOnce(new Error("RPC unavailable"));
    await expect(
      loadEscrowDetailRoute({ context: context(), params: { address: canonicalAddress } }),
    ).rejects.toThrow("RPC unavailable");
  });
});
