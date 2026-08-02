import { describe, expect, it, vi } from "vitest";
import { fetchMyEscrows, myEscrowsQuery, validateMyEscrowsSearch } from "./myEscrows";

const factory = "0x0000000000000000000000000000000000000001" as const;
const account = "0x0000000000000000000000000000000000000002" as const;
const escrow = "0x0000000000000000000000000000000000000003" as const;

describe("my escrows", () => {
  it("validates an independently shareable role and page", () => {
    expect(validateMyEscrowsSearch({ role: "worker", page: "2" })).toEqual({
      role: "worker",
      page: 2,
    });
    expect(validateMyEscrowsSearch({ role: "unknown", page: "0" })).toEqual({
      role: "owner",
      page: 1,
    });
  });

  it("paginates a role registry from newest to oldest", async () => {
    const client = {
      readContract: vi.fn().mockResolvedValue(1n),
      getBlockNumber: vi.fn().mockResolvedValue(7n),
      getBlock: vi.fn().mockResolvedValue({ timestamp: 6n }),
      multicall: vi
        .fn()
        .mockResolvedValueOnce([escrow])
        .mockResolvedValueOnce(
          Array.from({ length: 10 }, () => ({ status: "success", result: 0n })),
        ),
    };

    await fetchMyEscrows(client as never, factory, account, "worker", 1);

    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "getEscrowCountByWorker", args: [account] }),
    );
    expect(client.multicall).toHaveBeenCalledWith(
      expect.objectContaining({
        contracts: [
          expect.objectContaining({ functionName: "escrowsByWorker", args: [account, 0n] }),
        ],
      }),
    );
  });

  it("keys cached pages by account and role", () => {
    expect(myEscrowsQuery({} as never, factory, account, "arbiter", 3).queryKey).toEqual([
      "my-escrows",
      account,
      "arbiter",
      3,
    ]);
  });
});
