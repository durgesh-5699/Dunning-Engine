   import {Redis} from "ioredis";
   import '../config/config.ts'
   
   export const redis = process.env.REDIS_URL
     ? new Redis(process.env.REDIS_URL, { tls: {} })   // Upstash requires TLS
     : new Redis({ host: "localhost", port: 6379 });