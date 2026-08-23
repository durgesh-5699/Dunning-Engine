import { Router, type Router as ExpressRouter } from "express";
import {verifyRazorpaySignature} from "./verifySignature.ts";

export const router: ExpressRouter = Router();

router.post("/razorpay", (req, res) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  const rawBody = JSON.stringify(req.body);
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  if (!signature || !verifyRazorpaySignature(rawBody, signature, secret)) {
    console.log("Invalid signature — rejecting webhook");

    return res.status(400).json({
      error: "Invalid signature",
    });
  }

  console.log("Verified webhook:", req.body.event);
  console.log(JSON.stringify(req.body, null, 2));

  // TODO: Postgres persist + Redis push

  return res.sendStatus(200);
});

export default router;