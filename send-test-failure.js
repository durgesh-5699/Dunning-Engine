import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const paymentId = process.argv[2] || `pay_test_${Date.now()}`;
const reason = process.argv[3] || "insufficient_funds";

const REASON_PRESETS = {
  insufficient_funds: { code: "BAD_REQUEST_ERROR", description: "Payment failed due to insufficient funds" },
  card_expired: { code: "BAD_REQUEST_ERROR", description: "Payment failed because the card has expired" },
  gateway_timeout: { code: "GATEWAY_ERROR", description: "Payment failed due to a gateway timeout" },
  unknown: { code: "SERVER_ERROR", description: "" },
};

const preset = REASON_PRESETS[reason] || REASON_PRESETS.unknown;

const payload = JSON.stringify({
  entity: "event",
  event: "payment.failed",
  payload: {
    payment: {
      entity: {
        id: paymentId,
        amount: 49900,
        currency: "INR",
        error_code: preset.code,
        error_description: preset.description,
        error_reason: reason === "unknown" ? null : reason,
      },
    },
  },
  created_at: Math.floor(Date.now() / 1000),
});

const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

const res = await fetch("http://localhost:3000/webhooks/razorpay", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Razorpay-Signature": signature,
  },
  body: payload,
});

console.log(`Sent: ${paymentId} (${reason}) -> ${res.status} ${await res.text()}`);