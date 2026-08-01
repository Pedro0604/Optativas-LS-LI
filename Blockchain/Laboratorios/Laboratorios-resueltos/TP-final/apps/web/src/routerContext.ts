import type { QueryClient } from "@tanstack/react-query";
import type { AppConfig } from "./config";

export type RouterContext = { queryClient: QueryClient; config: AppConfig };
