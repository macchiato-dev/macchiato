import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RESOURCES_SQL_OPERATIONS,
  RESOURCES_STORE_SQL_OPERATIONS } from "./resources-sql-operations.js";

const here = dirname(fileURLToPath(import.meta.url));
const output = join(here, "generated/resources-policy-catalog.js");
await writeFile(output,
  `var SQL_OPERATIONS = ${JSON.stringify(RESOURCES_SQL_OPERATIONS)};\n` +
  `var STORE_SQL_OPERATIONS = ${JSON.stringify(RESOURCES_STORE_SQL_OPERATIONS)};\n`);
