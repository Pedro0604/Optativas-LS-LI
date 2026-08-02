import { createFileRoute } from "@tanstack/react-router";
import { CreateEscrowPage } from "../escrows/CreateEscrowPage";

export const Route = createFileRoute("/create-escrow")({ component: CreateEscrowPage });
