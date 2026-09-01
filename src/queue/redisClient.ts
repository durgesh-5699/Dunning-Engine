import { Redis } from "ioredis";
import "../config/config.ts";

export const redis = new Redis(
  process.env.REDIS_URL!
);