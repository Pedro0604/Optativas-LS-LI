import { describe, expect, it } from "vitest";
import { canWrite, SEPOLIA_CHAIN_ID, shortAddress } from "./wallet";

describe("wallet write guard", () => {
  it("only permits writes from Sepolia", () => {
    expect(canWrite(SEPOLIA_CHAIN_ID)).toBe(true);
    expect(canWrite(1)).toBe(false);
    expect(canWrite(undefined)).toBe(false);
  });

  it("formats the connected account without losing its identity", () => {
    expect(shortAddress("0x1234567890123456789012345678901234567890")).toBe("0x1234…7890");
  });
});
