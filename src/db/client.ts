import { Pool } from "pg";

export const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "dunning",
  password: "dunning123",
  database: "dunning_engine",
});