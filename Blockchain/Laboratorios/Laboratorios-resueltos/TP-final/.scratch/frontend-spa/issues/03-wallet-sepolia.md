# 03 — Injected wallet connection and Sepolia writes

**What to build:** A participant can connect, reconnect, switch, and disconnect an injected wallet while public Sepolia reads remain independent from the wallet's current network.

**Blocked by:** 01 — Base SPA and public escrow discovery.

**Status:** ready-for-agent

- [ ] The selector discovers multiple injected EIP-1193 providers supported by wagmi.
- [ ] Connection occurs only after an explicit request and never prompts automatically on page load.
- [ ] The last authorized provider reconnects silently when it still exposes an authorized account.
- [ ] Disconnect clears the local reconnection preference while preserving public read access.
- [ ] Wrong-network state offers a Sepolia switch, blocks writes, and continues reading Sepolia through the public client.
- [ ] Account and chain changes invalidate dependent state and reset account-sensitive transaction state.
- [ ] A modified form requires confirmation before an account change discards it.
- [ ] Controlled connector tests cover connection, rejection, reconnection, disconnection, account changes, wrong network, and switch rejection.

