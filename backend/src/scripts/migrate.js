require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "DATABASE_URL is not set. Example: postgres://ontime:changeme@localhost:5432/ontime"
  );
  process.exit(1);
}

(async () => {
  const sqlPath = path.join(__dirname, "..", "..", "sql", "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = new Pool({ connectionString });
  try {
    await pool.query(sql);
    console.log("Migration complete");
  } catch (err) {
    console.error("Migration failed", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
