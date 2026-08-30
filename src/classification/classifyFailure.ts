type Classification = "hard_decline" | "soft_decline" | "technical_glitch" | "unknown";

interface FailureRecord {
  error_code: string | null;
  error_reason: string | null;
  error_description: string | null;
  retry_count: number;
}

const HARD_DECLINE_KEYWORDS = ["expired", "invalid_card", "blocked", "restricted", "stolen", "blacklist"];
const TECHNICAL_KEYWORDS = ["timeout", "downtime", "gateway", "server_error", "network"];
const SOFT_DECLINE_KEYWORDS = ["insufficient_funds", "declined", "issuer"];

export function classifyFailure(failure: FailureRecord): Classification {
  const text = `${failure.error_code ?? ""} ${failure.error_reason ?? ""} ${failure.error_description ?? ""}`.toLowerCase();

  if (HARD_DECLINE_KEYWORDS.some((k) => text.includes(k))) return "hard_decline";
  if (TECHNICAL_KEYWORDS.some((k) => text.includes(k))) return "technical_glitch";
  if (SOFT_DECLINE_KEYWORDS.some((k) => text.includes(k))) return "soft_decline";

  return "unknown";
}

export function computeNextRetry(classification: Classification, retryCount: number): Date | null {
  const now = Date.now();

  switch (classification) {
    case "technical_glitch":
      return new Date(now + 30 * 60 * 1000); 

    case "soft_decline": {
      const delays = [1, 3, 7]; 
      const days = Number(delays[Math.min(retryCount, delays.length - 1)]);
      return new Date(now + days * 24 * 60 * 60 * 1000);
    }

    case "hard_decline":
      return null; 

    default:
      return new Date(now + 24 * 60 * 60 * 1000); 
  }
}