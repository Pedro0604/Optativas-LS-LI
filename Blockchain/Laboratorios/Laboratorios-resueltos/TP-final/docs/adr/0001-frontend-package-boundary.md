# Separate frontend package with generated contract bindings

The React SPA will live in `apps/web/` as an independent package inside the existing pnpm workspace. Contract ABIs and chain metadata will cross the package boundary through a small generated package rather than through direct imports from Hardhat build artifacts, keeping frontend builds independent while contracts and UI remain versioned together. The deployed factory address remains runtime environment configuration so contract compilation does not bind the frontend package to a particular deployment.
