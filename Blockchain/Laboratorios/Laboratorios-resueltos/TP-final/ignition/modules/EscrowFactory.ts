import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("EscrowFactoryModule", (module) => {
  const escrowFactory = module.contract("EscrowFactory");

  return {
    escrowFactory,
  };
});
