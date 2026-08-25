import { useEffect, useState } from "react";

interface Failure {
  id: number;
  razorpay_payment_id: string;
  amount_paise: number;
  currency: string;
  status: string;
  classification: "hard_decline" | "soft_decline" | "technical_glitch" | "unknown" | null;
  retry_count: number;
  next_retry_at: string | null;
  recovery_subject: string | null;
  recovery_body: string | null;
  created_at: string;
}

const CLASS_LABEL: Record<string, string> = {
  hard_decline: "HARD DECLINE",
  soft_decline: "SOFT DECLINE",
  technical_glitch: "TECHNICAL",
  unknown: "UNCLASSIFIED",
};

const STAMP_COLOR: Record<string, string> = {
  hard_decline: "border-[#A63A2E] text-[#A63A2E]",
  soft_decline: "border-[#95690F] text-[#95690F]",
  technical_glitch: "border-[#1F7A5C] text-[#1F7A5C]",
  unknown: "border-[#7A6F5C] text-[#7A6F5C]",
};

function formatAmount(paise: number, currency: string) {
  return `${currency === "INR" ? "₹" : currency + " "}${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function App() {
  const [failures, setFailures] = useState<Failure[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>("");

  async function fetchFailures() {
    try {
      const res = await fetch("http://localhost:3000/api/failures");
      const data = await res.json();
      setFailures(data);
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to fetch failures:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFailures();
    const interval = setInterval(fetchFailures, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalAtRisk = failures.reduce((sum, f) => sum + f.amount_paise, 0);
  const retryQueue = failures.filter(
    (f) => f.classification === "soft_decline" || f.classification === "technical_glitch"
  ).length;
  const needsAction = failures.filter((f) => f.classification === "hard_decline").length;

  return (
    <div className="min-h-screen bg-[#0B0F0E] text-[#E7ECEA]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE9C] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4ADE9C]"></span>
          </span>
          <h1 className="font-display text-lg tracking-tight">Smart Dunning Engine</h1>
        </div>
        <div className="font-mono text-xs text-[#6B7873]">
          {lastSync ? `last sync ${lastSync}` : "connecting…"}
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 border-b border-white/10">
        <Stat label="AT RISK" value={formatAmount(totalAtRisk, "INR")} color="#FF6B5E" />
        <Stat label="FAILURES" value={String(failures.length)} color="#E7ECEA" />
        <Stat label="RETRY QUEUE" value={String(retryQueue)} color="#F2B84B" />
        <Stat label="NEEDS ACTION" value={String(needsAction)} color="#FF6B5E" />
      </section>

      <main className="p-6 max-w-4xl mx-auto">
        <div className="ledger">
          <div className="ledger-perforation" />
          <div className="ledger-header">
            <span>PAYMENT ID</span>
            <span>AMOUNT</span>
            <span>STATUS</span>
            <span></span>
          </div>
          {loading ? (
            <div className="ledger-empty">Reading ledger…</div>
          ) : failures.length === 0 ? (
            <div className="ledger-empty">No failures recorded. All clear.</div>
          ) : (
            failures.map((f) => (
              <div key={f.id} className="ledger-entry-wrap">
                <button className="ledger-row" onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                  <span className="font-mono text-sm">{f.razorpay_payment_id}</span>
                  <span className="font-mono text-sm">{formatAmount(f.amount_paise, f.currency)}</span>
                  <span className={`stamp ${STAMP_COLOR[f.classification ?? "unknown"]}`}>
                    {CLASS_LABEL[f.classification ?? "unknown"]}
                  </span>
                  <span className="text-[#6B7873]">{expanded === f.id ? "−" : "›"}</span>
                </button>
                {expanded === f.id && (
                  <div className="ledger-note">
                    {f.recovery_subject ? (
                      <>
                        <div className="font-display text-sm mb-1" style={{ color: "var(--ledger-ink)" }}>
                          {f.recovery_subject}
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#3A322A" }}>
                          {f.recovery_body}
                        </p>
                        {f.next_retry_at && (
                          <div className="mt-3 font-mono text-xs" style={{ color: "#8A7B5C" }}>
                            next retry: {new Date(f.next_retry_at).toDateString()}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-sm italic" style={{ color: "#8A7B5C" }}>awaiting classification…</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-6 py-5 border-r border-white/10 last:border-r-0">
      <div className="font-mono text-2xl md:text-3xl font-medium" style={{ color }}>{value}</div>
      <div className="text-[10px] tracking-widest text-[#6B7873] mt-1">{label}</div>
    </div>
  );
}