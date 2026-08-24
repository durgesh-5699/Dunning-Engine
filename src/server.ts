import "./config/config.ts"
import express from 'express'
import razorpayWebhookRouter from "./webhooks/razorpay.routes.ts";

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json({
    verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));


app.use("/webhooks",razorpayWebhookRouter);

app.get("/health",(req,res)=>{
    res.json({
        status: "success",
        message: "Engine is running"
    })
});

app.post("/webhooks/razorpay", (req, res) => {
  console.log("📩 Webhook received:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
})
