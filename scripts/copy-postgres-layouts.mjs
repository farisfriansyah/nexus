import { existsSync } from "node:fs";
import mariadb from "mariadb";
import pg from "pg";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const sourceUrl = process.env.POSTGRES_SOURCE_URL;
const targetUrl = process.env.DATABASE_URL;

if (!sourceUrl) throw new Error("POSTGRES_SOURCE_URL belum diatur");
if (!targetUrl) throw new Error("DATABASE_URL MySQL belum diatur");

const source = new pg.Pool({ connectionString: sourceUrl });
let target;
let transactionStarted = false;

try {
  const { rows } = await source.query(
    'SELECT "id", "tab", "version", "status", "data", "createdBy", "createdAt", "publishedAt" FROM "LayoutVersion" ORDER BY "id"'
  );
  const mysqlUrl = new URL(targetUrl);
  if (mysqlUrl.protocol === "mysql:") mysqlUrl.protocol = "mariadb:";
  target = await mariadb.createConnection(mysqlUrl.toString());
  const existing = await target.query("SELECT COUNT(*) AS count FROM `LayoutVersion`");
  if (Number(existing[0].count) > 0) {
    throw new Error("Target `LayoutVersion` is not empty; refusing to overwrite MySQL data");
  }

  await target.beginTransaction();
  transactionStarted = true;
  for (const row of rows) {
    await target.query(
      `INSERT INTO \`LayoutVersion\`
        (\`id\`, \`tab\`, \`version\`, \`status\`, \`data\`, \`createdBy\`, \`createdAt\`, \`publishedAt\`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.tab,
        row.version,
        row.status,
        JSON.stringify(row.data),
        row.createdBy,
        row.createdAt,
        row.publishedAt
      ]
    );
  }
  const copied = await target.query("SELECT COUNT(*) AS count FROM `LayoutVersion`");
  if (Number(copied[0].count) !== rows.length) {
    throw new Error(`Copy verification failed: source=${rows.length}, target=${copied[0].count}`);
  }
  await target.commit();
  transactionStarted = false;
  console.log(`Copied and verified ${rows.length} layout versions.`);
} catch (error) {
  if (target && transactionStarted) await target.rollback().catch(() => undefined);
  console.error("PostgreSQL to MySQL layout copy failed:", error.code ?? error.name);
  process.exitCode = 1;
} finally {
  await source.end();
  await target?.end();
}
