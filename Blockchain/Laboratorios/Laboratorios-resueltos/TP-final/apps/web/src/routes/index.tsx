import { createFileRoute } from "@tanstack/react-router";
import { DiscoveryPage } from "../escrows/DiscoveryPage";
import { discoveryQuery } from "../escrows/discovery";
import { publicClient } from "../runtime";
import { validateDiscoverySearch } from "../escrows/search";

export const Route = createFileRoute("/")({
  validateSearch: validateDiscoverySearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      discoveryQuery(publicClient, context.config.factoryAddress, deps.page, deps.state),
    ),
  component: DiscoveryPage,
});
