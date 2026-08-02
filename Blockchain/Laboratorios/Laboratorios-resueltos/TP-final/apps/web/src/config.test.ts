import { describe, expect, it } from "vitest";
import { ConfigurationError, parseConfig } from "./config";

const valid = {
  VITE_SEPOLIA_RPC_URL: "https://rpc.example",
  VITE_CHAIN_ID: "11155111",
  VITE_FACTORY_ADDRESS: "0x0000000000000000000000000000000000000001",
  VITE_EXPLORER_URL: "https://sepolia.etherscan.io/",
};

describe("runtime configuration", () => {
  it("accepts and normalizes a Sepolia configuration", () =>
    expect(parseConfig(valid).explorerUrl).toBe("https://sepolia.etherscan.io"));
  
  it.each(["VITE_SEPOLIA_RPC_URL", "VITE_CHAIN_ID", "VITE_FACTORY_ADDRESS", "VITE_EXPLORER_URL"])(
    "rejects invalid %s",
    (key) => expect(() => parseConfig({ ...valid, [key]: "invalid" })).toThrow(ConfigurationError),
  );
});
