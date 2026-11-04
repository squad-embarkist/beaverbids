import { fileURLToPath } from "node:url";

// fixtures/canadabuys-sample-20.csv: the trimmed copy of the real open
// tender notices file that the parser, golden and integration tests read.
export const SAMPLE_PATH = fileURLToPath(new URL("../../../../../../fixtures/canadabuys-sample-20.csv", import.meta.url));
