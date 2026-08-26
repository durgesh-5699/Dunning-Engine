import fs from "fs";
import crypto from "crypto";
import "./src/config/config.ts"

const payload = fs.readFileSync("test-payload3.json", "utf8");
const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

console.log("Signature:", signature);