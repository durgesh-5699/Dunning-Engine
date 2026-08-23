import { Router, type Router as ExpressRouter } from "express";
import {verifyRazorpaySignature} from "./verifySignature.ts";
import { pool } from "../db/client.ts";
import { pushToFailureStream } from "../queue/producer.ts";

export const router: ExpressRouter = Router();

router.post("/razorpay", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  const rawBody = (req as any).rawBody;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  if (!signature || !verifyRazorpaySignature(rawBody, signature, secret)) {
    console.log("Invalid signature — rejecting webhook");

    return res.status(400).json({
      error: "Invalid signature",
    });
  }

  const {event,payload} = req.body;
  console.log("Verified webhook:", event);

  await pool.query(`INSERT INTO payment_events (event_type, payload) VALUES ($1, $2)`,
    [event,req.body]
  );

  if(event==="payment.failed"){
    const payment = payload.payment.entity;

    const result = await pool.query(
      `INSERT INTO payment_failures
       (razorpay_payment_id, amount_paise, currency, error_code, error_description, error_reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (razorpay_payment_id) DO NOTHING
       RETURNING id`,
       [
        payment.id,
        payment.amount,
        payment.currency || "INR",
        payment.error_code,
        payment.error_description,
        payment.error_reason,
       ]
    )

  if(result.rows.length>0){
    const failureId = result.rows[0].id;
    await pushToFailureStream(failureId);
    console.log(`📤 Pushed failure #${failureId} to Redis Stream`);
  }else{
    console.log("⚠️ Duplicate payment ID — skipped (already processed)");
  }
}

  return res.sendStatus(200);
});

export default router;