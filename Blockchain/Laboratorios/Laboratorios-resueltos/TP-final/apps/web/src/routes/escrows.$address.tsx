import { createFileRoute, redirect } from "@tanstack/react-router";
import { EscrowDetailPage } from "../escrows/EscrowDetailPage";
import { escrowDetailQuery, resolveEscrowAddress } from "../escrows/detail";
import { publicClient } from "../runtime";
import { Button } from "../ui/Button";
export const Route = createFileRoute("/escrows/$address")({
  loader: ({ context, params }) => {
    const resolution = resolveEscrowAddress(params.address);
    if (resolution.kind === "invalid") throw new Error("La dirección del escrow no es válida.");
    if (resolution.kind === "redirect")
      throw redirect({
        to: "/escrows/$address",
        params: { address: resolution.address },
        replace: true,
      });
    return context.queryClient.ensureQueryData(
      escrowDetailQuery(publicClient, context.config.factoryAddress, resolution.address),
    );
  },
  errorComponent: ({ error, reset }) => (
    <div role="alert" className="rounded-xl border border-line bg-surface p-5">
      <h1 className="font-display text-3xl font-bold">Dirección o lectura inválida</h1>
      <p>{error.message}</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  ),
  component: EscrowDetailPage,
});
