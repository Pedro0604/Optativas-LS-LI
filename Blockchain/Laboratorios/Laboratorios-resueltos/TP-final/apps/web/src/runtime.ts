import { parseConfig } from "./config";
import { createSepoliaClient } from "./escrows/discovery";

export const config = parseConfig(import.meta.env);
export const publicClient = createSepoliaClient(config);
