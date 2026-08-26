# Smart Dunning Engine

An AI-powered payment recovery system for subscription businesses — built for the Razorpay AI Buildathon (Open Track).

## The problem

When a subscription's auto-debit fails (expired card, insufficient funds, a gateway hiccup), most systems retry blindly — same schedule, regardless of *why* the payment failed. That costs businesses real, recoverable revenue and quietly churns customers who never even see a helpful nudge.

## What this does

Smart Dunning Engine listens for payment-failure webhooks, figures out *why* the payment failed, decides a smart retry strategy based on that reason, and uses AI to draft a personalized, context-aware recovery message — instead of one generic "your payment failed" email for every case.

## Architecture

```mermaid
flowchart TD
    A["Razorpay webhook<br/>(or curl-simulated for local dev)"] -->|POST + HMAC signature| B[Webhook Endpoint]
    B --> C{Verify signature}
    C -->|Invalid| D[Reject — 400]
    C -->|Valid| E[(Postgres<br/>payment_events — audit log)]
    E --> F{event == payment.failed?}
    F -->|No| G[Done — 200 OK]
    F -->|Yes| H[(Postgres<br/>payment_failures)]
    H --> I[Redis Stream<br/>payment-failures]
    I --> J[Consumer Group<br/>dunning-workers]
    J --> K["Classify failure<br/>(hard / soft / technical)"]
    K --> L[(Update classification<br/>+ next retry time)]
    L --> M[Groq AI<br/>generate recovery message]
    M --> N[(Update recovery_subject<br/>+ recovery_body)]
    N --> O[React Dashboard<br/>— Recovery Ledger]
```

## How classification works

Every failed payment is bucketed by matching its error code/reason/description against known patterns:

| Classification | Meaning | Retry strategy |
|---|---|---|
| `hard_decline` | Card expired, blocked, invalid | No auto-retry — customer must update payment method |
| `soft_decline` | Insufficient funds, issuer declined | Retry with escalating gaps (1 day → 3 days → 7 days) |
| `technical_glitch` | Gateway timeout, server error | Fast retry (30 min) — not the customer's fault |
| `unknown` | Insufficient data to classify | Safe 24h fallback, generic message |

Classification is persisted **independently** of AI message generation — if the AI provider has a hiccup, the business-critical classification and retry schedule are never blocked or lost.

## Tech stack

- **Backend:** Node.js, TypeScript, Express
- **Queue:** Redis Streams (consumer groups, at-least-once delivery)
- **Database:** PostgreSQL
- **AI:** Groq (`openai/gpt-oss-20b`) for recovery message generation
- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Infra:** Docker Compose (local Redis + Postgres, persistent volume)

## Project structure

```
dunning_engine/
├── src/
│   ├── server.ts              # Express entry point
│   ├── config/env.ts          # Centralized environment loading
│   ├── webhooks/
│   │   ├── razorpay.routes.ts # Webhook receiver + orchestration
│   │   └── verifySignature.ts # HMAC-SHA256 signature verification
│   ├── queue/
│   │   ├── redisClient.ts
│   │   ├── producer.ts        # Pushes failures onto the stream
│   │   └── consumer.ts        # Consumer group: classify + generate
│   ├── classification/
│   │   └── classifyFailure.ts # Rule-based classifier + retry scheduler
│   ├── ai/
│   │   └── groqClient.ts      # Recovery message generation
│   ├── db/
│   │   ├── client.ts
│   │   └── schema.sql
│   └── api/
│       └── failure.routes.ts  # GET /api/failures for the dashboard
├── dashboard/                 # React + Vite frontend
├── docker-compose.yml
└── package.json
```

## Running it locally

**Prerequisites:** Node.js 18+, pnpm, Docker Desktop

```bash
pnpm install

docker compose up -d

docker cp src/db/schema.sql $(docker ps -qf "ancestor=postgres:16-alpine"):/schema.sql
docker exec -it $(docker ps -qf "ancestor=postgres:16-alpine") psql -U dunning -d dunning_engine -f /schema.sql

# Set environment variables — create a .env file:
#    RAZORPAY_WEBHOOK_SECRET=<your test secret>
#    GROQ_API_KEY=<your Groq API key>

# Start the backend
pnpm run dev

# Start the consumer worker
pnpm run consumer

# Start the dashboard
cd dashboard && pnpm run dev
```

Dashboard runs at `http://localhost:5173`. Backend at `http://localhost:3000`.

## Testing without a live Razorpay webhook

Razorpay's dashboard checkout flow can be inconsistent in test mode across accounts. This project includes a signature-generation script so the full pipeline can be exercised without depending on that:

```bash
node test-signature.js   # generates a valid HMAC signature for a sample payload
curl -X POST http://localhost:3000/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: <signature from above>" \
  --data-binary @test-payload.json
```

This exercises the exact same code path a real Razorpay webhook would — signature verification, persistence, queueing, classification, and AI generation are all identical either way.

## Design decisions worth knowing

- **Audit log vs. business state, separated.** `payment_events` is append-only raw truth; `payment_failures` is mutable state that evolves (`received` → `classified` → `message_ready`). This mirrors how real payment systems separate immutable logs from evolving records.
- **Idempotency by design.** `ON CONFLICT (razorpay_payment_id) DO NOTHING` means a webhook delivered twice (which providers do, by design, for reliability) never creates duplicate records.
- **AI failure isolation.** Classification and retry scheduling are committed to the database before the AI call runs, so a flaky AI provider degrades gracefully instead of losing business-critical state.
- **Provider-agnostic AI layer.** The message-generation function has a stable interface; swapping the underlying AI provider only touches one file.

## What's next

- Connect to a live Razorpay subscription webhook (currently simulated via signed curl requests due to test-mode checkout flakiness)
- Dead-letter queue + exponential backoff for message-processing failures (pattern already proven in an earlier project, deliberately deferred here for scope)
- WhatsApp delivery channel for recovery messages, alongside email