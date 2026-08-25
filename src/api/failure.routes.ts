import { Router } from "express";
import { pool } from "../db/client";

export const failuresRouter = Router();

failuresRouter.get("/failures", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, razorpay_payment_id, amount_paise, currency, status, classification,
            retry_count, next_retry_at, error_reason, recovery_subject, recovery_body, created_at
     FROM payment_failures
     ORDER BY created_at DESC`
  );
  res.json(rows);
});