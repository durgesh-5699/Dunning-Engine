import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  IndianRupee, AlertTriangle, RefreshCw, ShieldAlert,
  ChevronRight, XCircle, Clock, Zap, HelpCircle, Search,
  LayoutGrid, Settings as SettingsIcon, CheckCircle2, Webhook, Bot, Database, Activity,
} from "lucide-react";

interface Failure {
  id: number;
  razorpay_payment_id: string;
  amount_paise: number;
  currency: string;
  classification: "hard_decline" | "soft_decline" | "technical_glitch" | "unknown" | null;
  next_retry_at: string | null;
  recovery_subject: string | null;
  recovery_body: string | null;
  created_at: string;
}

const CLASS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  hard_decline: { label: "Hard decline", color: "#C22C31", bg: "var(--danger-bg)", icon: XCircle },
  soft_decline: { label: "Soft decline", color: "#B8790B", bg: "var(--warning-bg)", icon: Clock },
  technical_glitch: { label: "Technical", color: "#0D94FB", bg: "#E8F1FE", icon: Zap },
  unknown: { label: "Unclassified", color: "#6B7A99", bg: "#F1F3F7", icon: HelpCircle },
};

function formatAmount(paise: number, currency: string) {
  return `${currency === "INR" ? "₹" : currency + " "}${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    startRef.current = null;
    let raf: number;
    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const animated = useCountUp(value);
  return <>{prefix}{animated.toLocaleString("en-IN")}</>;
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[1.2fr_1fr_1fr_24px] items-center px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="skeleton h-4 w-32" /><div className="skeleton h-4 w-20" /><div className="skeleton h-6 w-24 rounded-full" /><div />
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<"overview" | "queue" | "settings">("overview");
  const [failures, setFailures] = useState<Failure[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState("");
  const [search, setSearch] = useState("");

  async function fetchFailures() {
    try {
      const res = await fetch("http://localhost:3000/api/failures");
      setFailures(await res.json());
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchFailures();
    const t = setInterval(fetchFailures, 10000);
    return () => clearInterval(t);
  }, []);

  const totalAtRiskPaise = failures.reduce((s, f) => s + f.amount_paise, 0);
  const counts = { hard_decline: 0, soft_decline: 0, technical_glitch: 0, unknown: 0 };
  failures.forEach((f) => { counts[f.classification ?? "unknown"]++; });
  const retryQueue = counts.soft_decline + counts.technical_glitch;
  const needsAction = counts.hard_decline;

  const pieData = Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => ({ name: CLASS_META[k].label, value: v, color: CLASS_META[k].color }));
  const barData = Object.entries(counts).map(([k, v]) => ({ name: CLASS_META[k].label, count: v, fill: CLASS_META[k].color }));
  const attentionList = failures.filter((f) => f.classification === "hard_decline").slice(0, 5);
  const filteredFailures = failures.filter((f) => f.razorpay_payment_id.toLowerCase().includes(search.toLowerCase()));

  const stats = [
    { label: "Amount at risk", value: totalAtRiskPaise / 100, prefix: "₹", icon: IndianRupee, color: "var(--navy)", bg: "#EAF0F8" },
    { label: "Total failures", value: failures.length, prefix: "", icon: AlertTriangle, color: "var(--blue)", bg: "#E8F1FE" },
    { label: "In retry queue", value: retryQueue, prefix: "", icon: RefreshCw, color: "var(--warning)", bg: "var(--warning-bg)" },
    { label: "Needs action", value: needsAction, prefix: "", icon: ShieldAlert, color: "var(--danger)", bg: "var(--danger-bg)" },
  ];

  const NAV = [
    { id: "overview" as const, label: "Overview", icon: LayoutGrid },
    { id: "queue" as const, label: "Recovery Queue", icon: RefreshCw },
    { id: "settings" as const, label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      <aside className="w-56 shrink-0 flex flex-col" style={{ background: "var(--navy)" }}>
        <div className="px-5 py-5 flex items-center gap-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--blue)" }} className="flex items-center justify-center">
            <span style={{ color: "var(--navy)", fontWeight: 800, fontSize: 14 }}>
              D
            </span>
          </div>
          <span className="text-white text-sm font-semibold">Dunning Engine</span>
        </div>
        <nav className="flex-1 px-3 py-4">
          {NAV.map((item) => {
            const active = tab === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm ${active ? "nav-active" : ""}`}
                style={{
                  background: active ? "rgba(13,148,251,0.15)" : "transparent",
                  color: active ? "var(--blue)" : "rgba(255,255,255,0.55)",
                  fontWeight: active ? 600 : 400,
                  borderLeft: active ? "2px solid var(--blue)" : "2px solid transparent",
                }}
              >
                <item.icon size={16} /> {item.label}
              </div>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-2">
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "#3ECF8E" }} className="animate-pulse" />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Test Mode</span>
          </div>
        </div>
      </aside>

      <div className="flex-1">
        <header className="bg-white border-b px-8 py-5" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold" style={{ color: "var(--navy)" }}>
                {tab === "overview" ? "Overview" : tab === "queue" ? "Recovery Queue" : "Settings"}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {tab === "settings" ? "Pipeline configuration and status" : "Monitor and recover failed subscription payments in real time"}
              </p>
            </div>
            <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <Activity size={13} /> {lastSync ? `Synced ${lastSync}` : "Connecting…"}
            </span>
          </div>
        </header>

        <main className="px-8 py-8 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card card-hover p-5">
                <div className="stat-icon mb-3" style={{ background: s.bg, color: s.color }}><s.icon size={17} strokeWidth={2.25} /></div>
                <div className="text-2xl font-semibold" style={{ color: "var(--navy)" }}>
                  <AnimatedNumber value={Math.round(s.value)} prefix={s.prefix} />
                  {s.prefix === "₹" && ".00"}
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              </motion.div>
            ))}
          </div>

          {tab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="card p-6 md:col-span-2">
                <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--navy)" }}>Failure breakdown</h3>
                {failures.length === 0 ? <p className="text-xs" style={{ color: "var(--text-muted)" }}>No data yet.</p> : (
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                        </Pie>
                        <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
                          formatter={(v) => <span style={{ fontSize: 12, color: "var(--text)" }}>{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="card p-6 md:col-span-3">
                <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--navy)" }}>Failures by type</h3>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {barData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card p-6 md:col-span-5">
                <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--navy)" }}>Needs attention</h3>
                {attentionList.length === 0 ? (
                  <div className="flex items-center gap-2 py-6 justify-center" style={{ color: "var(--success)" }}>
                    <CheckCircle2 size={18} /><span className="text-sm font-medium">All caught up — nothing needs manual action</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attentionList.map((f) => (
                      <div key={f.id} className="flex items-center justify-between text-sm pb-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                        <span style={{ color: "var(--navy)" }} className="font-medium">{f.razorpay_payment_id}</span>
                        <span style={{ color: "var(--text-muted)" }}>{formatAmount(f.amount_paise, f.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "queue" && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between gap-4" style={{ borderColor: "var(--border)" }}>
                <h2 className="text-sm font-semibold shrink-0" style={{ color: "var(--navy)" }}>Failed payments</h2>
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <input
                    className="search-input w-full text-sm pl-8 pr-3 py-1.5 rounded-lg border"
                    style={{ borderColor: "var(--border)" }}
                    placeholder="Search payment ID…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>{filteredFailures.length} entries</span>
              </div>

              {loading ? <>{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</> :
                filteredFailures.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: "var(--success)" }} />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>{search ? "No matches." : "No failures recorded. All clear."}</p>
                  </div>
                ) : filteredFailures.map((f) => {
                  const meta = CLASS_META[f.classification ?? "unknown"];
                  const Icon = meta.icon;
                  const isOpen = expanded === f.id;
                  return (
                    <div key={f.id}>
                      <button className="table-row" onClick={() => setExpanded(isOpen ? null : f.id)}>
                        <span className="text-sm font-medium" style={{ color: "var(--navy)" }}>{f.razorpay_payment_id}</span>
                        <span className="text-sm" style={{ color: "var(--text)" }}>{formatAmount(f.amount_paise, f.currency)}</span>
                        <span className="pill w-fit" style={{ background: meta.bg, color: meta.color }}>
                          <Icon size={12} style={{ marginRight: 5 }} />{meta.label}
                        </span>
                        <motion.span animate={{ rotate: isOpen ? 90 : 0 }} style={{ color: "var(--text-muted)" }}><ChevronRight size={16} /></motion.span>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                            style={{ overflow: "hidden", background: "#FAFBFD", borderBottom: "1px solid var(--border)" }}>
                            <div className="px-6 py-5">
                              {f.recovery_subject ? (
                                <>
                                  <div className="text-sm font-semibold mb-1" style={{ color: "var(--navy)" }}>{f.recovery_subject}</div>
                                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text)" }}>{f.recovery_body}</p>
                                  {f.next_retry_at && (
                                    <div className="mt-3 text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--blue)" }}>
                                      <Clock size={12} /> Next retry: {new Date(f.next_retry_at).toDateString()}
                                    </div>
                                  )}
                                </>
                              ) : <span className="text-sm italic" style={{ color: "var(--text-muted)" }}>Awaiting classification…</span>}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
            </div>
          )}

          {tab === "settings" && (
            <div className="space-y-4">
              <div className="card p-6 flex items-start gap-4">
                <div className="stat-icon" style={{ background: "#E8F1FE", color: "var(--blue)" }}><Webhook size={17} /></div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Webhook receiver</h3>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>HMAC-SHA256 signature verification · endpoint: <code>/webhooks/razorpay</code></p>
                </div>
              </div>
              <div className="card p-6 flex items-start gap-4">
                <div className="stat-icon" style={{ background: "#EAF0F8", color: "var(--navy)" }}><Database size={17} /></div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Storage & queue</h3>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>PostgreSQL (audit log + failure state) · Redis Streams consumer group</p>
                </div>
              </div>
              <div className="card p-6 flex items-start gap-4">
                <div className="stat-icon" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}><Bot size={17} /></div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>AI recovery messages</h3>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Groq · openai/gpt-oss-20b · JSON-structured output with fallback</p>
                </div>
              </div>
              <div className="card p-6">
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--navy)" }}>Retry policy</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="py-2" style={{ color: "var(--text-muted)" }}>Soft decline</td>
                      <td className="py-2 text-right" style={{ color: "var(--text)" }}>1 → 3 → 7 days</td>
                    </tr>
                    <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="py-2" style={{ color: "var(--text-muted)" }}>Technical glitch</td>
                      <td className="py-2 text-right" style={{ color: "var(--text)" }}>30 minutes</td>
                    </tr>
                    <tr>
                      <td className="py-2" style={{ color: "var(--text-muted)" }}>Hard decline</td>
                      <td className="py-2 text-right" style={{ color: "var(--text)" }}>No auto-retry</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
            Node.js · TypeScript · Redis Streams · PostgreSQL · Groq AI · React
          </p>
        </main>
      </div>
    </div>
  );
}