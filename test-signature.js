import fs from "fs";
import crypto from "crypto";

const payload = fs.readFileSync("test-payload4.json", "utf8");
const secret = "dunning_test_secret_123";
const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

console.log("Signature:", signature);