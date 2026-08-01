# Use wagmi and viem in the frontend

The SPA will use wagmi for wallet lifecycle and viem for typed contract interaction, with TanStack Query owning cached on-chain state. Hardhat tests may continue using ethers: the shared integration boundary is the generated ABI and deployment metadata, not a common runtime client library; this accepts two Ethereum libraries to avoid implementing React wallet lifecycle directly with ethers.
