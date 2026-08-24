import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface FailureContext {
  amount_paise: number;
  currency: string;
  classification: string;
  error_description: string | null;
  next_retry_at: Date | null;
}

export async function generateRecoveryMessage(
  failure: FailureContext
): Promise<{ subject: string; body: string }> {
  const amount = (failure.amount_paise / 100).toFixed(2);

  const prompt = `You are writing a payment-failure recovery email for a subscription business. Warm, non-shaming, helpful tone — never scary or legal-sounding.

Context:
- Amount: ${failure.currency} ${amount}
- Failure type: ${failure.classification}
- Technical error (context only, don't quote directly): ${failure.error_description ?? "unknown"}
- Next automatic retry: ${failure.next_retry_at ? failure.next_retry_at.toDateString() : "none — customer action needed"}

Guidance by type:
- hard_decline: customer must update payment method now. Be clear, direct next step.
- soft_decline: likely temporary funds issue. Reassure auto-retry is scheduled, offer option to act sooner.
- technical_glitch: not the customer's fault. Reassure, no urgent action needed.
- unknown: generic but still helpful.

Respond ONLY with a JSON object in this exact shape: {"subject": "...", "body": "..."}`;

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 400,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  try {
    return JSON.parse(raw);
  } catch {
    console.error("Groq response wasn't valid JSON:", raw);
    return {
      subject: "Action needed on your subscription payment",
      body: "We had trouble processing your last payment. Please check your payment details.",
    };
  }
}