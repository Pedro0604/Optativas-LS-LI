import { createFileRoute } from "@tanstack/react-router";
import { DiscoveryPage } from "../escrows/DiscoveryPage";
import { validateDiscoverySearch } from "../escrows/search";

export const Route = createFileRoute("/")({
  validateSearch: validateDiscoverySearch,
  component: DiscoveryPage,
});
