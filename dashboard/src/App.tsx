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
  hard_decline: "Hard decline",
  soft_decline: "Soft decline",
  technical_glitch: "Technical",
  unknown: "Unclassified",
};

const PILL_STYLE: Record<string, { bg: string; color: string }> = {
  hard_decline: { bg: "var(--danger-bg)", color: "var(--danger)" },
  soft_decline: { bg: "var(--warning-bg)", color: "var(--warning)" },
  technical_glitch: { bg: "#E8F1FE", color: "var(--blue)" },
  unknown: { bg: "#F1F3F7", color: "var(--text-muted)" },
};

function formatAmount(paise: number, currency: string) {
  return `${currency === "INR" ? "₹" : currency + " "}${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

const NAV_ITEMS = [
  { icon: "▦", label: "Overview", active: false },
  { icon: "↻", label: "Recovery Queue", active: true },
  { icon: "⚙", label: "Settings", active: false },
];

export default function App() {
  const [failures, setFailures] = useState<Failure[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState("");

  async function fetchFailures() {
    try {
      const res = await fetch("http://localhost:3000/api/failures");
      setFailures(await res.json());
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFailures();
    const t = setInterval(fetchFailures, 10000);
    return () => clearInterval(t);
  }, []);

  const totalAtRisk = failures.reduce((s, f) => s + f.amount_paise, 0);
  const retryQueue = failures.filter((f) => f.classification === "soft_decline" || f.classification === "technical_glitch").length;
  const needsAction = failures.filter((f) => f.classification === "hard_decline").length;

  const stats = [
    { label: "Amount at risk", value: formatAmount(totalAtRisk, "INR"), icon: "₹", color: "var(--navy)", bg: "#EAF0F8" },
    { label: "Total failures", value: String(failures.length), icon: "!", color: "var(--blue)", bg: "#E8F1FE" },
    { label: "In retry queue", value: String(retryQueue), icon: "↻", color: "var(--warning)", bg: "var(--warning-bg)" },
    { label: "Needs action", value: String(needsAction), icon: "✕", color: "var(--danger)", bg: "var(--danger-bg)" },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col" style={{ background: "var(--navy)" }}>
        <div className="px-5 py-5 flex items-center gap-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--blue)" }} className="flex items-center justify-center">
            <span style={{ color: "var(--navy)", fontWeight: 800, fontSize: 14 }}>r</span>
          </div>
          <span className="text-white text-sm font-semibold">Dunning Engine</span>
        </div>
        <nav className="flex-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm"
              style={{
                background: item.active ? "rgba(13,148,251,0.15)" : "transparent",
                color: item.active ? "var(--blue)" : "rgba(255,255,255,0.65)",
                fontWeight: item.active ? 600 : 400,
              }}
            >
              <span style={{ width: 16, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-2">
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "#3ECF8E" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Test Mode</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        <header className="bg-white border-b px-8 py-4 flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <h1 className="text-base font-semibold" style={{ color: "var(--navy)" }}>Recovery Queue</h1>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {lastSync ? `Synced ${lastSync}` : "Connecting…"}
          </span>
        </header>

        <main className="px-8 py-8 max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {stats.map((s) => (
              <div key={s.label} className="card p-5">
                <div className="stat-icon mb-3" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                <div className="text-2xl font-semibold" style={{ color: "var(--navy)" }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Failed payments</h2>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{failures.length} entries</span>
            </div>

            {loading ? (
              <div className="px-6 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>
            ) : failures.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>No failures recorded. All clear.</div>
            ) : (
              failures.map((f) => {
                const cls = f.classification ?? "unknown";
                const style = PILL_STYLE[cls];
                return (
                  <div key={f.id}>
                    <button className="table-row" onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                      <span className="text-sm font-medium" style={{ color: "var(--navy)" }}>{f.razorpay_payment_id}</span>
                      <span className="text-sm" style={{ color: "var(--text)" }}>{formatAmount(f.amount_paise, f.currency)}</span>
                      <span className="pill w-fit" style={{ background: style.bg, color: style.color }}>{CLASS_LABEL[cls]}</span>
                      <span style={{ color: "var(--text-muted)" }}>{expanded === f.id ? "−" : "›"}</span>
                    </button>
                    {expanded === f.id && (
                      <div className="px-6 py-5" style={{ background: "#FAFBFD", borderBottom: "1px solid var(--border)" }}>
                        {f.recovery_subject ? (
                          <>
                            <div className="text-sm font-semibold mb-1" style={{ color: "var(--navy)" }}>{f.recovery_subject}</div>
                            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text)" }}>{f.recovery_body}</p>
                            {f.next_retry_at && (
                              <div className="mt-3 text-xs font-medium" style={{ color: "var(--blue)" }}>
                                Next retry: {new Date(f.next_retry_at).toDateString()}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-sm italic" style={{ color: "var(--text-muted)" }}>Awaiting classification…</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}