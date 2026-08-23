import { redis } from "./redisClient.ts";
import { pool } from "../db/client.ts";
import { classifyFailure, computeNextRetry } from "../classification/classifyFailure.ts";

const STREAM_KEY = "payment-failures";
const GROUP_NAME = "dunning-workers";
const CONSUMER_NAME = `worker-${process.pid}`;

async function ensureConsumerGroup() {
  try {
    await redis.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "0", "MKSTREAM");
    console.log(`Consumer group "${GROUP_NAME}" created`);
  } catch (err: any) {
    if (err.message.includes("BUSYGROUP")) {
      console.log(`Consumer group "${GROUP_NAME}" already exists`);
    } else {
      throw err;
    }
  }
}

async function processMessage(fields: string[]) {
  const failureId = Number(fields[1]);

  const { rows } = await pool.query(`SELECT * FROM payment_failures WHERE id = $1`, [failureId]);
  const failure = rows[0];
  if (!failure) {
    console.log(`Failure #${failureId} not found — skipping`);
    return;
  }

  const classification = classifyFailure(failure);
  const nextRetryAt = computeNextRetry(classification, failure.retry_count);

  await pool.query(
    `UPDATE payment_failures
     SET classification = $1, status = 'classified', next_retry_at = $2, updated_at = NOW()
     WHERE id = $3`,
    [classification, nextRetryAt, failureId]
  );

  console.log(`Failure #${failureId} -> ${classification} | next retry: ${nextRetryAt ?? "none (needs customer action)"}`);
}

async function consumeLoop() {
  await ensureConsumerGroup();
  console.log(`Consumer "${CONSUMER_NAME}" listening on "${STREAM_KEY}"...`);

  while (true) {
    try {
      const response = await redis.xreadgroup(
        "GROUP", GROUP_NAME, CONSUMER_NAME,
        "COUNT", 5,
        "BLOCK", 5000,
        "STREAMS", STREAM_KEY, ">"
      );

      if (!response) continue;

      const [, messages] = response[0];

      for (const [id, fields] of messages) {
        try {
          await processMessage(fields);
          await redis.xack(STREAM_KEY, GROUP_NAME, id);
        } catch (err) {
          console.error(`Failed to process message ${id}:`, err);
        }
      }
    } catch (err) {
      console.error("Consumer loop error:", err);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

consumeLoop();