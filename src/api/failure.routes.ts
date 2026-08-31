import { Router } from "express";
import { pool } from "../db/client.js";
import { classifyFailure, computeNextRetry } from "../classification/classifyFailure.ts";
import { generateRecoveryMessage } from "../ai/groqClient.ts";

const REASON_PRESETS = [
  { reason: "insufficient_funds", code: "BAD_REQUEST_ERROR", description: "Payment failed due to insufficient funds" },
  { reason: "card_expired", code: "BAD_REQUEST_ERROR", description: "Payment failed because the card has expired" },
  { reason: "gateway_timeout", code: "GATEWAY_ERROR", description: "Payment failed due to a gateway timeout" },
];


export const failuresRouter = Router();

failuresRouter.get("/failures", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, razorpay_payment_id, amount_paise, currency, status, classification,
            retry_count, next_retry_at, error_reason, recovery_subject, recovery_body, created_at
     FROM payment_failures
     ORDER BY created_at DESC
     LIMIT 100`
  );
  res.json(rows);
});

const AMOUNT_PRESETS_PAISE = [19900, 29900, 49900, 79900, 99900, 149900]; // ₹199 to ₹1499

failuresRouter.post("/simulate", async (req, res) => {
  const preset = REASON_PRESETS[Math.floor(Math.random() * REASON_PRESETS.length)];
  const amountPaise = AMOUNT_PRESETS_PAISE[Math.floor(Math.random() * AMOUNT_PRESETS_PAISE.length)];
  const paymentId = `pay_demo_${Date.now()}`;

  const insertResult = await pool.query(
    `INSERT INTO payment_failures
     (razorpay_payment_id, amount_paise, currency, error_code, error_description, error_reason)
     VALUES ($1, $2, 'INR', $3, $4, $5)
     RETURNING id`,
    [paymentId, amountPaise, preset?.code, preset?.description, preset?.reason]
  );

  const failureId = insertResult.rows[0].id;
  const classification = classifyFailure({
    error_code: preset?.code,
    error_reason: preset?.reason,
    error_description: preset?.description,
    retry_count: 0,
  } as any);
  const nextRetryAt = computeNextRetry(classification, 0);

  const { subject, body } = await generateRecoveryMessage({
    amount_paise: amountPaise,
    currency: "INR",
    classification,
    error_description: preset?.description || null,
    next_retry_at: nextRetryAt,
  });

  await pool.query(
    `UPDATE payment_failures
     SET classification = $1, status = 'message_ready', next_retry_at = $2,
         recovery_subject = $3, recovery_body = $4
     WHERE id = $5`,
    [classification, nextRetryAt, subject, body, failureId]
  );

  res.json({ success: true, paymentId, amount: amountPaise / 100 });
});