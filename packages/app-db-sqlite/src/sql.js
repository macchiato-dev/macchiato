const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function quoteIdentifier(value) {
  const text = String(value || "");
  if (!IDENTIFIER.test(text)) throw new Error(`Invalid SQL identifier: ${text}`);
  return text;
}

export function quoteLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function rawSql(sql) {
  return { kind: "raw", sql };
}

export function column(name, alias = "") {
  return { kind: "column", name, alias };
}

export function literal(value, alias) {
  return { kind: "literal", value, alias };
}

export function nullAs(alias) {
  return { kind: "null", alias };
}

export function distinctColumn(name) {
  return { kind: "distinct-column", name };
}

function expression(sql, alias = "") {
  return { kind: "expression", sql, alias };
}

function renderSelection(selection) {
  if (typeof selection === "string") return quoteIdentifier(selection);
  if (!selection || typeof selection !== "object") throw new Error("Invalid SQL selection.");
  if (selection.kind === "raw") return selection.sql;
  if (selection.kind === "column") {
    const base = quoteIdentifier(selection.name);
    return selection.alias ? `${base} AS ${quoteIdentifier(selection.alias)}` : base;
  }
  if (selection.kind === "literal") return `${quoteLiteral(selection.value)} AS ${quoteIdentifier(selection.alias)}`;
  if (selection.kind === "null") return `NULL AS ${quoteIdentifier(selection.alias)}`;
  if (selection.kind === "distinct-column") return `DISTINCT ${quoteIdentifier(selection.name)}`;
  if (selection.kind === "expression") {
    return selection.alias ? `${selection.sql} AS ${quoteIdentifier(selection.alias)}` : selection.sql;
  }
  throw new Error(`Unsupported SQL selection kind: ${selection.kind}`);
}

function renderSelections(selections) {
  if (selections === "*") return "*";
  if (!Array.isArray(selections)) throw new Error("SQL selections must be an array or '*'.");
  return selections.map(renderSelection).join(", ");
}

export function whereEquals(name) {
  return `${quoteIdentifier(name)} = ?`;
}

export function orderBy(name) {
  return `ORDER BY ${quoteIdentifier(name)}`;
}

export function select({ from, columns = "*", where = "", order = "" }) {
  const clauses = [`SELECT ${renderSelections(columns)}`, `FROM ${quoteIdentifier(from)}`];
  if (where) clauses.push(`WHERE ${where}`);
  if (order) clauses.push(order);
  return clauses.join(" ");
}

export function insert({ into, columns, conflict = "" }) {
  const allowedConflicts = new Set(["", "OR REPLACE", "OR IGNORE"]);
  if (!allowedConflicts.has(conflict)) throw new Error(`Unsupported INSERT conflict clause: ${conflict}`);
  const conflictSql = conflict ? ` ${conflict}` : "";
  const names = columns.map(quoteIdentifier).join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  return `INSERT${conflictSql} INTO ${quoteIdentifier(into)} (${names}) VALUES (${placeholders})`;
}

export function deleteWhere({ from, where }) {
  return `DELETE FROM ${quoteIdentifier(from)} WHERE ${where}`;
}

function columnDefinition(definition) {
  const parts = [quoteIdentifier(definition.name), definition.type];
  if (definition.primaryKey) parts.push("PRIMARY KEY");
  if (definition.notNull) parts.push("NOT NULL");
  if (Object.hasOwn(definition, "default")) parts.push(`DEFAULT ${defaultValue(definition.default)}`);
  if (definition.check) parts.push(`CHECK (${definition.check})`);
  return parts.join(" ");
}

function defaultValue(value) {
  if (value && typeof value === "object" && value.kind === "raw") return value.sql;
  if (typeof value === "string") return quoteLiteral(value);
  if (typeof value === "number") return String(value);
  if (value === null) return "NULL";
  throw new Error(`Unsupported SQL default value: ${value}`);
}

export function createTable(definition) {
  const columns = definition.columns.map(columnDefinition).join(",\n      ");
  return `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(definition.name)} (\n      ${columns}\n    )`;
}

export const tableDefinitions = {
  migrations: {
    name: "app_db_migrations",
    columns: [
      { name: "version", type: "INTEGER", primaryKey: true },
      { name: "name", type: "TEXT", notNull: true },
      { name: "applied_at", type: "TEXT", notNull: true, default: rawSql("CURRENT_TIMESTAMP") },
    ],
  },
  sites: {
    name: "sites",
    columns: [
      { name: "subdomain", type: "TEXT", primaryKey: true },
      { name: "directory", type: "TEXT", notNull: true },
    ],
  },
  schemas: {
    name: "schemas",
    columns: [
      { name: "name", type: "TEXT", primaryKey: true },
      { name: "json", type: "TEXT", notNull: true },
    ],
  },
  sitePages: {
    name: "site_pages",
    columns: [
      { name: "subdomain", type: "TEXT", primaryKey: true },
      { name: "title", type: "TEXT", notNull: true, default: "" },
      { name: "html", type: "TEXT", notNull: true },
      { name: "css", type: "TEXT", notNull: true, default: "" },
      { name: "dom_schema_json", type: "TEXT", notNull: true },
      { name: "css_schema_json", type: "TEXT", notNull: true },
      { name: "sandboxed", type: "INTEGER", notNull: true, default: 1 },
    ],
  },
  siteFiles: {
    name: "site_files",
    columns: [
      { name: "subdomain", type: "TEXT", primaryKey: true },
      { name: "title", type: "TEXT", notNull: true, default: "" },
      { name: "file_path", type: "TEXT", notNull: true },
      { name: "content_type", type: "TEXT", notNull: true, default: "" },
      { name: "csp", type: "TEXT", notNull: true, default: "" },
    ],
  },
  appConfigs: {
    name: "app_configs",
    columns: [
      { name: "subdomain", type: "TEXT", primaryKey: true },
      { name: "name", type: "TEXT", notNull: true },
      { name: "kind", type: "TEXT", notNull: true },
      { name: "description", type: "TEXT", notNull: true, default: "" },
      { name: "handler", type: "TEXT", notNull: true },
      { name: "permissions_json", type: "TEXT", notNull: true, default: "{}", check: `${rawFunction("json_valid", "permissions_json")}` },
      { name: "access_json", type: "TEXT", notNull: true, default: "{}", check: `${rawFunction("json_valid", "access_json")}` },
      { name: "options_json", type: "TEXT", notNull: true, default: "{}", check: `${rawFunction("json_valid", "options_json")}` },
      { name: "directory", type: "INTEGER", notNull: true, default: 1, check: `${quoteIdentifier("directory")} IN (0, 1)` },
    ],
  },
};

function rawFunction(name, arg) {
  if (!IDENTIFIER.test(name)) throw new Error(`Invalid SQL function name: ${name}`);
  return `${name}(${quoteIdentifier(arg)})`;
}

export const schemaSql = Object.fromEntries(
  Object.entries(tableDefinitions).map(([key, definition]) => [key, createTable(definition)]),
);

const names = Object.fromEntries(
  Object.entries(tableDefinitions).map(([key, definition]) => [key, definition.name]),
);
names.siteRoutes = "site_routes";

const subdomain = whereEquals("subdomain");
const nameEquals = whereEquals("name");

export const querySql = {
  migrations: {
    listVersions: select({ from: names.migrations, columns: ["version"] }),
    insertIfMissing: insert({ into: names.migrations, columns: ["version", "name"], conflict: "OR IGNORE" }),
    currentVersion: select({ from: names.migrations, columns: [expression("MAX(version)", "version")] }),
  },
  serverLookups: {
    directorySiteBySubdomain: select({ from: names.sites, columns: ["directory"], where: subdomain }),
    schemaByName: select({ from: names.schemas, columns: ["json"], where: nameEquals }),
    pageBySubdomain: select({ from: names.sitePages, columns: ["subdomain", "title", "html", "css", "dom_schema_json", "css_schema_json", "sandboxed"], where: subdomain }),
    fileBySubdomain: select({ from: names.siteFiles, columns: ["subdomain", "title", column("file_path", "path"), column("content_type", "contentType"), "csp"], where: subdomain }),
  },
  schemaRows: {
    upsert: insert({ into: names.schemas, columns: ["name", "json"], conflict: "OR REPLACE" }),
    list: select({ from: names.schemas, columns: ["name"], order: orderBy("name") }),
  },
  siteWrites: {
    upsertDirectory: insert({ into: names.sites, columns: ["subdomain", "directory"], conflict: "OR REPLACE" }),
    upsertPage: insert({ into: names.sitePages, columns: ["subdomain", "title", "html", "css", "dom_schema_json", "css_schema_json", "sandboxed"], conflict: "OR REPLACE" }),
    upsertFile: insert({ into: names.siteFiles, columns: ["subdomain", "title", "file_path", "content_type", "csp"], conflict: "OR REPLACE" }),
    insertFileIfMissing: insert({ into: names.siteFiles, columns: ["subdomain", "title", "file_path", "content_type", "csp"], conflict: "OR IGNORE" }),
  },
  appConfigs: {
    insertIfMissing: insert({ into: names.appConfigs, columns: ["subdomain", "name", "kind", "description", "handler", "permissions_json", "access_json", "options_json", "directory"], conflict: "OR IGNORE" }),
    upsert: insert({ into: names.appConfigs, columns: ["subdomain", "name", "kind", "description", "handler", "permissions_json", "access_json", "options_json", "directory"], conflict: "OR REPLACE" }),
    getBySubdomain: select({ from: names.appConfigs, columns: ["subdomain", "name", "kind", "description", "handler", "permissions_json", "access_json", "options_json", "directory"], where: subdomain }),
    list: select({ from: names.appConfigs, columns: ["subdomain", "name", "kind", "description", "handler", "permissions_json", "access_json", "options_json", "directory"], order: orderBy("subdomain") }),
    listVisible: select({ from: names.appConfigs, columns: ["subdomain", "name", "kind", "description", "handler", "permissions_json", "access_json", "options_json", "directory"], where: `${quoteIdentifier("directory")} != 0`, order: orderBy("subdomain") }),
    remove: deleteWhere({ from: names.appConfigs, where: subdomain }),
  },
  siteLists: {
    configuredDirectories: select({ from: names.sites, columns: ["subdomain", literal("directory", "kind"), "directory", nullAs("sandboxed")] }),
    configuredPages: select({ from: names.sitePages, columns: ["subdomain", literal("page", "kind"), nullAs("directory"), "sandboxed"] }),
    configuredRawFiles: select({ from: names.siteFiles, columns: ["subdomain", literal("raw site", "kind"), column("file_path", "directory"), nullAs("sandboxed")] }),
    configuredRoutes: select({ from: names.siteRoutes, columns: [distinctColumn("subdomain"), literal("routes", "kind"), nullAs("directory"), nullAs("sandboxed")] }),
    directoryRows: select({ from: names.sites, columns: ["subdomain", column("subdomain", "title"), literal("directory site", "kind"), column("directory", "source")] }),
    pageRows: select({ from: names.sitePages, columns: ["subdomain", "title", literal("sqlite page", "kind"), literal("site_pages", "source")] }),
    rawFileRows: select({ from: names.siteFiles, columns: ["subdomain", "title", literal("raw site", "kind"), column("file_path", "source")] }),
    routeRows: select({ from: names.siteRoutes, columns: [distinctColumn("subdomain"), column("subdomain", "title"), literal("sqlite routes", "kind"), literal("site_routes", "source")] }),
  },
  siteConfig: {
    rawFile: select({ from: names.siteFiles, columns: ["subdomain", "title", column("file_path", "filePath"), column("content_type", "contentType"), "csp"], where: subdomain }),
    page: select({ from: names.sitePages, columns: ["subdomain", "title", "sandboxed"], where: subdomain }),
    route: select({ from: names.siteRoutes, columns: [distinctColumn("subdomain")], where: subdomain }),
    directory: select({ from: names.sites, columns: ["subdomain", "directory"], where: subdomain }),
  },
  siteRemoval: {
    directory: deleteWhere({ from: names.sites, where: subdomain }),
    page: deleteWhere({ from: names.sitePages, where: subdomain }),
    file: deleteWhere({ from: names.siteFiles, where: subdomain }),
  },
};
