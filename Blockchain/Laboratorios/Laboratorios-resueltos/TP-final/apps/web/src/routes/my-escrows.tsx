import { createFileRoute } from "@tanstack/react-router";
import { MyEscrowsPage } from "../escrows/MyEscrowsPage";
import { validateMyEscrowsSearch } from "../escrows/myEscrows";

export const Route = createFileRoute("/my-escrows")({
  validateSearch: validateMyEscrowsSearch,
  component: MyEscrowsPage,
});
