import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import * as THREE from "three";
import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
  Legend, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  IndianRupee, AlertTriangle, RefreshCw, ShieldAlert, ChevronRight,
  XCircle, Clock, Zap, HelpCircle, Search, LayoutGrid, Cpu,
  CheckCircle2, Webhook, Bot, Database, Activity, X, Copy, Check,
  ArrowUpCircle, FileWarning, MessageSquareText, CalendarClock, UserCircle2, Menu, Info,
} from "lucide-react";

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

const CLASS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  hard_decline: { label: "Hard decline", color: "#C4353F", bg: "var(--danger-bg)", icon: XCircle },
  soft_decline: { label: "Soft decline", color: "#B07A16", bg: "var(--warning-bg)", icon: Clock },
  technical_glitch: { label: "Technical", color: "#2E6BFF", bg: "#E8EFFF", icon: Zap },
  unknown: { label: "Unclassified", color: "#666F8E", bg: "#EEF1F8", icon: HelpCircle },
};

const AVATAR_COLORS = ["#0A1330", "#2E6BFF", "#D9A62B", "#128A67", "#C4353F"];

function formatAmount(paise: number, currency: string) {
  return `${currency === "INR" ? "₹" : currency + " "}${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}
function initialsOf(id: string) {
  const parts = id.replace(/^pay[_-]?/i, "").replace(/^test[_-]?/i, "").replace(/^demo[_-]?/i, "");
  return parts.slice(0, 2).toUpperCase();
}
function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    startRef.current = null;
    let raf: number;
    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / duration, 1);
      setValue(Math.floor(p * target));
      if (p < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}
function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  return <>{prefix}{useCountUp(value).toLocaleString("en-IN")}</>;
}
function StatusBadge({ classification }: { classification: string | null }) {
  const meta = CLASS_META[classification ?? "unknown"];
  const Icon = meta.icon;
  return (
    <span className="pill w-fit shrink-0" style={{ background: meta.bg, color: meta.color }}>
      <Icon size={12} style={{ marginRight: 5 }} />{meta.label}
    </span>
  );
}

function TiltCard({
  children, className, maxTilt = 9, ...motionProps
}: React.PropsWithChildren<{ className?: string; maxTilt?: number } & Record<string, any>>) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [maxTilt, -maxTilt]), { stiffness: 260, damping: 22 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTilt, maxTilt]), { stiffness: 260, damping: 22 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    px.set(nx);
    py.set(ny);
    el.style.setProperty("--mx", `${nx * 100}%`);
    el.style.setProperty("--my", `${ny * 100}%`);
  }
  function handleLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={`tilt-glare ${className ?? ""}`}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

function roundedCardShape(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function textSprite(text: string, color: string, background: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Sprite();
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = background;
  context.roundRect(4, 14, canvas.width - 8, 100, 22);
  context.fill();
  context.font = "700 34px Inter, Arial, sans-serif";
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(1.25, 0.25, 1);
  return sprite;
}

function EngineScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0.15, 6.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.set(0.12, -0.22, -0.08);
    scene.add(group);
    const baseRotation = { x: 0.12, y: -0.22, z: -0.08 };

    const ambient = new THREE.AmbientLight(0x9db5ff, 2.2);
    const keyLight = new THREE.PointLight(0x6f8cff, 15, 12);
    keyLight.position.set(3, 3, 4);
    const goldLight = new THREE.PointLight(0xf2bd57, 10, 9);
    goldLight.position.set(-3, -2, 2);
    scene.add(ambient, keyLight, goldLight);

    const card = new THREE.Group();
    card.rotation.set(-0.16, 0.36, -0.12);
    const cardGeometry = new THREE.ExtrudeGeometry(roundedCardShape(2.7, 1.68, 0.2), {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: 0.045,
      bevelThickness: 0.04,
    });
    const cardMesh = new THREE.Mesh(
      cardGeometry,
      new THREE.MeshPhysicalMaterial({
        color: 0x506cff,
        emissive: 0x17266e,
        emissiveIntensity: 0.8,
        metalness: 0.52,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
      }),
    );
    card.add(cardMesh);

    const cardOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(cardGeometry),
      new THREE.LineBasicMaterial({ color: 0xdbe4ff, transparent: true, opacity: 0.72 }),
    );
    cardOutline.scale.setScalar(1.012);
    card.add(cardOutline);

    const chip = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.32, 0.045),
      new THREE.MeshStandardMaterial({ color: 0xf6d27a, metalness: 0.82, roughness: 0.24, emissive: 0x8d5d1a, emissiveIntensity: 0.32 }),
    );
    chip.position.set(-0.78, 0.2, 0.12);
    chip.rotation.z = -0.04;
    card.add(chip);

    const chipLineMaterial = new THREE.LineBasicMaterial({ color: 0x8e651f, transparent: true, opacity: 0.8 });
    [-0.07, 0.07].forEach((offset) => {
      const points = [new THREE.Vector3(-0.78 + offset, 0.045, 0.15), new THREE.Vector3(-0.78 + offset, 0.35, 0.15)];
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), chipLineMaterial);
      card.add(line);
    });

    const contactless = new THREE.Group();
    [0.09, 0.17, 0.25].forEach((radius) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.012, 8, 32, Math.PI * 0.62),
        new THREE.MeshBasicMaterial({ color: 0xdbe4ff, transparent: true, opacity: 0.8 }),
      );
      arc.rotation.z = -Math.PI / 2;
      arc.position.set(0.82, 0.13, 0.14);
      contactless.add(arc);
    });
    card.add(contactless);

    const cardStripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 0.09, 0.018),
      new THREE.MeshBasicMaterial({ color: 0x263a9c, transparent: true, opacity: 0.8 }),
    );
    cardStripe.position.set(0.18, -0.35, 0.125);
    card.add(cardStripe);

    const paymentMark = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 32),
      new THREE.MeshBasicMaterial({ color: 0x6ff0bb, transparent: true, opacity: 0.9 }),
    );
    paymentMark.position.set(0.94, -0.56, 0.15);
    card.add(paymentMark);
    const paymentLabel = textSprite("PAYMENT EVENT", "#dce6ff", "rgba(14, 28, 97, 0.28)");
    paymentLabel.position.set(-0.05, 0.64, 0.16);
    paymentLabel.scale.set(0.92, 0.17, 1);
    card.add(paymentLabel);
    const paymentAmount = textSprite("₹ 2,499", "#fff2b1", "rgba(255, 255, 255, 0.1)");
    paymentAmount.position.set(-0.18, -0.58, 0.16);
    paymentAmount.scale.set(0.68, 0.15, 1);
    card.add(paymentAmount);
    group.add(card);
    const core = card;
    const wire = cardOutline;

    const makeStatusTile = (label: string, amount: string, color: number, x: number, y: number) => {
      const tile = new THREE.Group();
      const geometry = new THREE.ExtrudeGeometry(roundedCardShape(1.5, 0.82, 0.12), {
        depth: 0.08,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.025,
        bevelThickness: 0.025,
      });
      const body = new THREE.Mesh(
        geometry,
        new THREE.MeshPhysicalMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.24,
          metalness: 0.35,
          roughness: 0.22,
          clearcoat: 1,
        }),
      );
      tile.add(body);
      const labelSprite = textSprite(label, "#ffffff", "rgba(8, 15, 45, 0.28)");
      labelSprite.position.set(0, 0.16, 0.12);
      labelSprite.scale.set(1.05, 0.2, 1);
      tile.add(labelSprite);
      const amountSprite = textSprite(amount, "#ffffff", "rgba(255, 255, 255, 0.12)");
      amountSprite.position.set(0, -0.16, 0.12);
      amountSprite.scale.set(0.75, 0.16, 1);
      tile.add(amountSprite);
      tile.position.set(x, y, 0.25);
      return tile;
    };

    const failedTile = makeStatusTile("PAYMENT FAILED", "WEBHOOK EVENT", 0xb83f5b, -1.72, 0.74);
    failedTile.rotation.set(0.06, 0.18, 0.08);
    const classifierTile = makeStatusTile("FAILURE CLASSIFIED", "HARD / SOFT / TECH", 0x536bdb, 0, 1.48);
    classifierTile.scale.setScalar(0.7);
    classifierTile.rotation.set(-0.08, 0.02, -0.02);
    const recoveredTile = makeStatusTile("RECOVERY READY", "RETRY + MESSAGE", 0x168b79, 1.72, -0.72);
    recoveredTile.rotation.set(-0.06, -0.18, -0.08);
    group.add(failedTile, classifierTile, recoveredTile);

    const failurePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.05, 0.56, 0.3),
      new THREE.Vector3(-0.55, 0.42, 0.4),
      new THREE.Vector3(-0.25, 0.18, 0.36),
    ]);
    const recoveryPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.28, -0.16, 0.36),
      new THREE.Vector3(0.75, -0.4, 0.45),
      new THREE.Vector3(1.12, -0.58, 0.38),
    ]);
    const failureTube = new THREE.Mesh(
      new THREE.TubeGeometry(failurePath, 48, 0.018, 6, false),
      new THREE.MeshBasicMaterial({ color: 0xf39a69, transparent: true, opacity: 0.9 }),
    );
    const recoveryTube = new THREE.Mesh(
      new THREE.TubeGeometry(recoveryPath, 48, 0.022, 6, false),
      new THREE.MeshBasicMaterial({ color: 0x71f4bb, transparent: true, opacity: 0.95 }),
    );
    group.add(failureTube, recoveryTube);

    const scanBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 1.35, 0.035),
      new THREE.MeshBasicMaterial({ color: 0x8de6ff, transparent: true, opacity: 0.85 }),
    );
    scanBeam.position.set(-1.2, 0, 0.2);
    scanBeam.rotation.z = -0.16;
    group.add(scanBeam);

    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.13, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0xf1c45d,
        emissive: 0x8e5d18,
        emissiveIntensity: 0.6,
        metalness: 0.85,
        roughness: 0.2,
        clearcoat: 1,
      }),
    );
    coin.rotation.set(0.58, 0.22, -0.2);
    coin.position.set(1.25, 0.9, 0.18);
    group.add(coin);

    const successOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x73f2b7, emissive: 0x24ad79, emissiveIntensity: 1.8 }),
    );
    successOrb.position.set(-1.3, -0.9, 0.22);
    group.add(successOrb);

    const rings: THREE.Mesh[] = [];
    [
      { radius: 1.75, tube: 0.012, color: 0x92aaff, rotation: [0.9, 0.12, 0.35] },
      { radius: 2.05, tube: 0.018, color: 0xf0c45f, rotation: [1.7, 0.2, -0.55] },
      { radius: 1.5, tube: 0.009, color: 0xa88dff, rotation: [0.15, 1.2, 0.15] },
    ].forEach(({ radius, tube, color, rotation }) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 10, 128),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82 }),
      );
      ring.rotation.set(rotation[0], rotation[1], rotation[2]);
      group.add(ring);
      rings.push(ring);
    });

    const satellites: { mesh: THREE.Mesh; radius: number; speed: number; offset: number; y: number }[] = [];
    [
      { radius: 1.78, speed: 0.72, offset: 0.2, y: 0.08, color: 0xeff4ff, size: 0.1 },
      { radius: 2.06, speed: -0.48, offset: 2.2, y: -0.2, color: 0xf5d77f, size: 0.075 },
      { radius: 1.52, speed: 1.02, offset: 4.3, y: 0.24, color: 0xb9a8ff, size: 0.065 },
    ].forEach(({ radius, speed, offset, y, color, size }) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 16, 16),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.5, metalness: 0.4, roughness: 0.18 }),
      );
      group.add(mesh);
      satellites.push({ mesh, radius, speed, offset, y });
    });

    const starPositions = new Float32Array(240 * 3);
    for (let i = 0; i < starPositions.length; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 8;
      starPositions[i + 1] = (Math.random() - 0.5) * 5;
      starPositions[i + 2] = (Math.random() - 0.5) * 3 - 1;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({ color: 0xb9c8ff, size: 0.018, transparent: true, opacity: 0.65 }),
    );
    scene.add(stars);

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    mount.addEventListener("pointermove", onPointerMove);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      // Keep the WebGL loop alive even when reduced-motion is enabled.
      // It runs slower there instead of freezing on the first frame.
      const time = elapsed * (reducedMotion ? 0.35 : 1);
      core.rotation.x = time * 0.5;
      core.rotation.y = time * 0.82;
      core.rotation.z = time * 0.22;
      const pulse = 1 + Math.sin(time * 2.4) * 0.045;
      core.scale.setScalar(pulse);
      wire.rotation.x = -time * 0.34;
      wire.rotation.y = time * 0.58;
      group.rotation.x = baseRotation.x + pointer.y * 0.22 + Math.sin(time * 0.7) * 0.06;
      group.rotation.y = baseRotation.y + pointer.x * 0.3 + time * 0.13;
      group.rotation.z = baseRotation.z + Math.cos(time * 0.52) * 0.05;
      rings[0].rotation.x = 0.9 + Math.sin(time * 0.4) * 0.12;
      rings[0].rotation.z = 0.35 + time * 0.72;
      rings[1].rotation.y = 0.2 + Math.cos(time * 0.5) * 0.16;
      rings[1].rotation.z = -0.55 - time * 0.52;
      rings[2].rotation.x = 0.15 + Math.sin(time * 0.6) * 0.22;
      rings[2].rotation.y = 1.2 + time * 0.64;
      keyLight.position.x = 3 + Math.sin(time * 0.8) * 0.8;
      goldLight.position.y = -2 + Math.cos(time * 0.65) * 0.6;
      coin.rotation.y = time * 0.72;
      coin.rotation.z = -0.2 + Math.sin(time * 0.8) * 0.12;
      coin.position.y = 0.9 + Math.sin(time * 1.3) * 0.1;
      successOrb.scale.setScalar(1 + Math.sin(time * 2.1) * 0.18);
      successOrb.position.z = 0.22 + Math.sin(time * 1.4) * 0.08;
      failedTile.position.y = 0.74 + Math.sin(time * 1.2) * 0.08;
      failedTile.rotation.z = 0.08 + Math.sin(time * 0.75) * 0.035;
      classifierTile.position.y = 1.48 + Math.sin(time * 1.05 + 0.8) * 0.06;
      classifierTile.rotation.y = Math.sin(time * 0.6) * 0.04;
      recoveredTile.position.y = -0.72 + Math.sin(time * 1.1 + 1.5) * 0.08;
      recoveredTile.rotation.z = -0.08 + Math.cos(time * 0.7) * 0.035;
      scanBeam.position.x = -1.2 + ((time * 0.9) % 2.4);
      satellites.forEach(({ mesh, radius, speed, offset, y }) => {
        const angle = time * speed + offset;
        mesh.position.set(Math.cos(angle) * radius, y + Math.sin(angle * 1.7) * 0.12, Math.sin(angle) * radius);
      });
      stars.rotation.y = time * 0.012;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mount.removeEventListener("pointermove", onPointerMove);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="engine-scene" />;
}

function SkeletonRow() {
  return (
    <div className="table-row">
      <div className="skeleton shrink-0" style={{ width: 34, height: 34, borderRadius: 10 }} />
      <div className="flex-1 min-w-0">
        <div className="skeleton h-4 w-28 mb-2" />
        <div className="skeleton h-4 w-40" />
      </div>
    </div>
  );
}

function FailureRow({ f, onClick, delay }: { f: Failure; onClick: () => void; delay: number }) {
  return (
    <motion.button
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}
      onClick={onClick} className="table-row"
    >
      <div className="avatar shrink-0" style={{ background: avatarColor(f.razorpay_payment_id) }}>{initialsOf(f.razorpay_payment_id)}</div>
      <div className="flex-1 min-w-0 flex flex-col gap-2 sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr] sm:items-center sm:gap-4">
        <div className="text-sm font-semibold truncate" style={{ color: "var(--navy)" }}>{f.razorpay_payment_id}</div>
        <div className="flex items-center gap-3 sm:contents">
          <span className="text-sm font-medium num-display" style={{ color: "var(--text)" }}>{formatAmount(f.amount_paise, f.currency)}</span>
          <StatusBadge classification={f.classification} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(f.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      <ChevronRight size={16} className="shrink-0" style={{ color: "var(--text-muted)" }} />
    </motion.button>
  );
}

function buildTimeline(f: Failure) {
  const steps = [
    { label: "Payment attempt", done: true, icon: Activity, time: f.created_at },
    { label: "Payment failed", done: true, icon: XCircle, time: f.created_at },
    { label: "Failure classified", done: !!f.classification, icon: FileWarning, time: f.classification ? f.created_at : null },
    { label: "Recovery message generated", done: !!f.recovery_subject, icon: MessageSquareText, time: f.recovery_subject ? f.created_at : null },
  ];
  if (f.classification === "hard_decline") {
    steps.push({ label: "Customer action needed", done: true, icon: AlertTriangle, time: f.created_at });
  } else {
    steps.push({ label: "Retry scheduled", done: !!f.next_retry_at, icon: CalendarClock, time: f.next_retry_at });
  }
  steps.push({ label: "Outcome pending", done: false, icon: ArrowUpCircle, time: null });
  return steps;
}

function FailureDrawer({ failure, onClose }: { failure: Failure; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const timeline = buildTimeline(failure);
  const isSimulated = failure.razorpay_payment_id.startsWith("pay_demo_");

  function copyMessage() {
    if (!failure.recovery_body) return;
    navigator.clipboard.writeText(`${failure.recovery_subject}\n\n${failure.recovery_body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <motion.div className="drawer-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="fixed top-0 right-0 h-full drawer-glass z-50 overflow-y-auto"
        style={{ width: "min(480px, 100vw)", boxShadow: "-24px 0 60px rgba(10,19,48,0.22)" }}
      >
        <div className="px-5 sm:px-6 py-5 border-b flex items-start justify-between" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="avatar shrink-0" style={{ background: avatarColor(failure.razorpay_payment_id) }}>{initialsOf(failure.razorpay_payment_id)}</div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: "var(--navy)" }}>{failure.razorpay_payment_id}</div>
              <div className="text-xs mt-0.5 num-display" style={{ color: "var(--text-muted)" }}>{formatAmount(failure.amount_paise, failure.currency)}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 shrink-0"><X size={18} style={{ color: "var(--text-muted)" }} /></button>
        </div>

        {isSimulated && (
          <div className="mx-5 sm:mx-6 mt-4 px-3 py-2.5 rounded-lg flex items-start gap-2" style={{ background: "rgba(46,107,255,0.08)" }}>
            <Info size={13} className="mt-0.5 shrink-0" style={{ color: "var(--navy)" }} />
            <p className="text-xs leading-relaxed" style={{ color: "var(--navy)" }}>
              Demo event — the failure reason was picked at random and given to the pipeline exactly as Razorpay would. Classification, retry timing, and this message below were all decided independently by the engine.
            </p>
          </div>
        )}

        <div className="px-5 sm:px-6 py-5"><StatusBadge classification={failure.classification} /></div>

        <div className="px-5 sm:px-6 pb-6">
          <h3 className="text-xs font-semibold tracking-wide mb-4" style={{ color: "var(--text-muted)" }}>Dunning lifecycle</h3>
          <div className="relative">
            {timeline.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="relative flex gap-3 pb-6 last:pb-0">
                  {i < timeline.length - 1 && <div className="timeline-line" style={{ background: step.done ? "var(--blue)" : "var(--border)" }} />}
                  <div className="timeline-dot" style={{ background: step.done ? "#E8EFFF" : "#EEF1F8", color: step.done ? "var(--blue)" : "var(--text-muted)" }}>
                    <Icon size={12} />
                  </div>
                  <div className="pt-0.5 min-w-0">
                    <div className="text-sm font-medium" style={{ color: step.done ? "var(--navy)" : "var(--text-muted)" }}>{step.label}</div>
                    {step.time && <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{new Date(step.time).toLocaleString()}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {failure.recovery_subject && (
          <div className="mx-5 sm:mx-6 mb-6 rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Bot size={15} style={{ color: "var(--blue)" }} className="shrink-0" />
                <span className="text-xs font-semibold" style={{ color: "var(--navy)" }}>AI-generated recovery message</span>
              </div>
              <button onClick={copyMessage} className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg shrink-0" style={{ color: "var(--blue)", background: "#E8EFFF" }}>
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="text-sm font-semibold mb-1.5" style={{ color: "var(--navy)" }}>{failure.recovery_subject}</div>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text)" }}>{failure.recovery_body}</p>
            {failure.next_retry_at && (
              <div className="mt-3 pt-3 border-t text-xs font-medium flex items-center gap-1.5" style={{ borderColor: "var(--border)", color: "var(--blue)" }}>
                <Clock size={12} /> Next retry: {new Date(failure.next_retry_at).toDateString()}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
}

export default function App() {
  const [tab, setTab] = useState<"dashboard" | "failures" | "recovery" | "system">("dashboard");
  const [failures, setFailures] = useState<Failure[]>([]);
  const [selected, setSelected] = useState<Failure | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState("");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  async function fetchFailures() {
    try {
      const res = await fetch("http://localhost:3000/api/failures");
      setFailures(await res.json());
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function simulateFailure() {
    setSimulating(true);
    try {
      await fetch("http://localhost:3000/api/simulate", { method: "POST" });
      setTimeout(fetchFailures, 1500);
    } catch (err) { console.error(err); }
    finally { setTimeout(() => setSimulating(false), 1500); }
  }

  useEffect(() => {
    fetchFailures();
    const t = setInterval(fetchFailures, 10000);
    return () => clearInterval(t);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const totalAtRiskPaise = failures.reduce((s, f) => s + f.amount_paise, 0);
  const counts = { hard_decline: 0, soft_decline: 0, technical_glitch: 0, unknown: 0 };
  failures.forEach((f) => { counts[f.classification ?? "unknown"]++; });
  const retryQueue = counts.soft_decline + counts.technical_glitch;
  const needsAction = counts.hard_decline;

  const pieData = Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => ({ name: CLASS_META[k].label, value: v, color: CLASS_META[k].color }));
  const pieTotal = pieData.reduce((s, e) => s + e.value, 0);

  const trendData = useMemo(() => {
    const buckets: Record<string, number> = {};
    failures.forEach((f) => {
      const day = new Date(f.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      buckets[day] = (buckets[day] || 0) + 1;
    });
    return Object.entries(buckets).map(([day, count]) => ({ day, count }));
  }, [failures]);

  const filteredFailures = failures.filter((f) => f.razorpay_payment_id.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredFailures.length / PAGE_SIZE));
  const paginatedFailures = filteredFailures.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = [
    { label: "Amount at risk", value: totalAtRiskPaise / 100, prefix: "₹", icon: IndianRupee, color: "var(--navy)", bg: "#EAF0F8", hero: true },
    { label: "Total failures", value: failures.length, prefix: "", icon: AlertTriangle, color: "var(--blue)", bg: "#E8EFFF", hero: false },
    { label: "In retry queue", value: retryQueue, prefix: "", icon: RefreshCw, color: "var(--warning)", bg: "var(--warning-bg)", hero: false },
    { label: "Needs action", value: needsAction, prefix: "", icon: ShieldAlert, color: "var(--danger)", bg: "var(--danger-bg)", hero: false },
  ];

  const NAV = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutGrid },
    { id: "failures" as const, label: "Payment Failures", icon: AlertTriangle },
    { id: "recovery" as const, label: "Recovery", icon: RefreshCw },
    { id: "system" as const, label: "System", icon: Cpu },
  ];

  const sidebarContent = (
    <>
      <div className="px-5 py-5 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2.5">
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(155deg, var(--blue), var(--violet))", boxShadow: "0 6px 16px -6px rgba(46,107,255,0.6)" }} className="flex items-center justify-center">
            <span style={{ color: "white", fontWeight: 800, fontSize: 14, fontFamily: "var(--font-display)" }}>r</span>
          </div>
          <span className="text-white text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Dunning Engine</span>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 rounded hover:bg-white/10">
          <X size={18} style={{ color: "rgba(255,255,255,0.7)" }} />
        </button>
      </div>
      <nav className="flex-1 px-3 py-4">
        {NAV.map((item) => {
          const active = tab === item.id;
          return (
            <motion.div
              key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false); }}
              whileHover={{ x: active ? 0 : 3 }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm cursor-pointer relative nav-item ${active ? "nav-active" : ""}`}
              style={{ color: active ? "var(--blue-soft)" : "rgba(255,255,255,0.55)", fontWeight: active ? 600 : 400 }}
            >
              {active && <motion.div layoutId="navActive" className="absolute inset-0 rounded-lg nav-active-pill" />}
              <item.icon size={16} className="relative z-10" /> <span className="relative z-10">{item.label}</span>
            </motion.div>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "#3ECF8E" }} className="animate-pulse" />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Test Mode</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="aurora" aria-hidden="true">
        <span className="aurora-blob aurora-blue" />
        <span className="aurora-blob aurora-gold" />
        <span className="aurora-blob aurora-violet" />
        <span className="scene-grid" />
        <span className="scene-particle particle-one" />
        <span className="scene-particle particle-two" />
        <span className="scene-particle particle-three" />
        <span className="scene-particle particle-four" />
      </div>

      <div className="min-h-screen flex app-shell">
        <aside className="hidden md:flex w-60 shrink-0 flex-col sidebar-glass">{sidebarContent}</aside>

        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div className="drawer-overlay md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} />
              <motion.aside
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 260 }}
                className="fixed top-0 left-0 h-full w-64 flex flex-col z-50 md:hidden sidebar-glass"
              >
                {sidebarContent}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="header-glass px-4 sm:px-8 py-4 sticky top-0 z-30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-black/5 shrink-0">
                  <Menu size={20} style={{ color: "var(--navy)" }} />
                </button>
                <div className="min-w-0">
                  <h1 className="text-base font-semibold truncate" style={{ color: "var(--navy)" }}>{greeting} 👋</h1>
                  <p className="text-xs mt-0.5 hidden sm:block" style={{ color: "var(--text-muted)" }}>{today}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="relative hidden lg:block">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                  <input className="search-input text-sm pl-8 pr-3 py-1.5 rounded-lg border w-48" style={{ borderColor: "var(--border)" }}
                    placeholder="Search payment ID…" value={search} onChange={(e) => { setSearch(e.target.value); setTab("failures"); setPage(1); }} />
                </div>
              </div>
            </div>
          </header>

          <div className="px-4 sm:px-8 pt-4">
            <div className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.6)", color: "var(--text-muted)" }}>
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>"Simulate Failure" sends a randomly-chosen failure event through the exact webhook pipeline — the engine independently verifies, classifies, and drafts a message for it, same as it would for a real Razorpay event.</span>
            </div>
          </div>

          <main className="px-4 sm:px-8 py-6 sm:py-8 flex-1 min-w-0">
            {tab === "dashboard" && (
              <motion.section
                className="hero-banner mb-6"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span className="live-pulse" />
                    LIVE RECOVERY CONTROL
                  </div>
                  <h2>From payment failure<br /><span>to recovery.</span></h2>
                  <p>
                    Razorpay webhook → classify the failure → choose the retry path → recover revenue.
                  </p>
                  <div className="hero-footer">
                    <button onClick={simulateFailure} disabled={simulating} className="hero-action">
                      <Zap size={14} />
                      {simulating ? "Processing event…" : "Run a live simulation"}
                      <ChevronRight size={14} />
                    </button>
                    <span className="hero-sync">
                      <Activity size={13} />
                      {lastSync ? `Synced ${lastSync}` : "Waiting for first sync"}
                    </span>
                  </div>
                </div>
                <div className="hero-visual" aria-hidden="true">
                  <EngineScene />
                  <span className="hero-float hero-float-top"><CheckCircle2 size={13} /> PAYMENT VERIFIED</span>
                  <span className="hero-float hero-float-bottom"><RefreshCw size={13} /> AUTO-RETRY</span>
                </div>
              </motion.section>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {stats.map((s, i) => (
                <TiltCard
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.35 }}
                  whileHover={{ scale: 1.03 }}
                  maxTilt={s.hero ? 6 : 9}
                  className={`card glow-card p-4 sm:p-5 min-w-0 ${s.hero ? "hero-stat" : ""}`}
                >
                  <div className="stat-icon mb-3" style={{ background: s.bg, color: s.color }}><s.icon size={17} strokeWidth={2.25} /></div>
                  <div className={`text-xl sm:text-2xl font-semibold truncate num-display ${s.hero ? "hero-value" : ""}`} style={{ color: s.hero ? undefined : "var(--navy)" }}>
                    <AnimatedNumber value={Math.round(s.value)} prefix={s.prefix} />{s.prefix === "₹" && ".00"}
                  </div>
                  <div className={`text-xs mt-1 ${s.hero ? "hero-label" : ""}`} style={{ color: s.hero ? undefined : "var(--text-muted)" }}>{s.label}</div>
                </TiltCard>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {tab === "dashboard" && (
                <motion.div key="dash" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                    <div className="card p-5 sm:p-6 md:col-span-3 min-w-0">
                      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--navy)" }}>Failures over time</h3>
                      {trendData.length === 0 ? <p className="text-xs py-12 text-center" style={{ color: "var(--text-muted)" }}>No data yet.</p> : (
                        <div style={{ height: 200 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                              <defs>
                                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#2E6BFF" stopOpacity={0.3} />
                                  <stop offset="100%" stopColor="#2E6BFF" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(6px)" }} />
                              <Area type="monotone" dataKey="count" stroke="#2E6BFF" strokeWidth={2} fill="url(#areaFill)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    <div className="card p-5 sm:p-6 md:col-span-2 min-w-0">
                      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--navy)" }}>Failure classification</h3>
                      {pieData.length === 0 ? <p className="text-xs py-12 text-center" style={{ color: "var(--text-muted)" }}>No data yet.</p> : (
                        <div style={{ height: 200 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                                {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                              </Pie>
                              <Tooltip
                                formatter={(value: number, name: string) => [`${value} · ${pieTotal > 0 ? Math.round((value / pieTotal) * 100) : 0}%`, name]}
                                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)" }}
                              />
                              <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
                                formatter={(v) => <span style={{ fontSize: 12, color: "var(--text)" }}>{v}</span>} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card overflow-hidden">
                    <div className="px-4 sm:px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                      <h2 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Recent failures</h2>
                    </div>
                    {loading ? <>{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</> : failures.length === 0 ? (
                      <div className="px-6 py-16 text-center"><CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: "var(--success)" }} />
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No failures recorded. All clear.</p></div>
                    ) : failures.slice(0, 5).map((f, i) => (
                      <FailureRow key={f.id} f={f} onClick={() => setSelected(f)} delay={i * 0.05} />
                    ))}
                  </div>
                </motion.div>
              )}

              {tab === "failures" && (
                <motion.div key="failures" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="card overflow-hidden">
                  <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                    <h2 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>All payment failures</h2>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{filteredFailures.length} entries</span>
                  </div>
                  {loading ? <>{[1, 2, 3].map((i) => <SkeletonRow key={i} />)}</> : paginatedFailures.length === 0 ? (
                    <div className="px-6 py-16 text-center"><CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: "var(--success)" }} />
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{search ? "No matches." : "No failures recorded."}</p></div>
                  ) : paginatedFailures.map((f, i) => (
                    <FailureRow key={f.id} f={f} onClick={() => setSelected(f)} delay={i * 0.03} />
                  ))}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t" style={{ borderColor: "var(--border)" }}>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Page {page} of {totalPages}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg"
                          style={{ background: page === 1 ? "rgba(20,34,74,0.05)" : "#E8EFFF", color: page === 1 ? "var(--text-muted)" : "var(--navy)", opacity: page === 1 ? 0.6 : 1 }}
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg"
                          style={{ background: page === totalPages ? "rgba(20,34,74,0.05)" : "#E8EFFF", color: page === totalPages ? "var(--text-muted)" : "var(--navy)", opacity: page === totalPages ? 0.6 : 1 }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {tab === "recovery" && (
                <motion.div key="recovery" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: "Auto-retry scheduled", desc: "Soft declines & technical glitches — system will retry automatically", count: retryQueue, icon: RefreshCw, color: "var(--warning)", bg: "var(--warning-bg)" },
                    { title: "Needs customer action", desc: "Hard declines — no auto-retry, message sent asking for payment update", count: needsAction, icon: UserCircle2, color: "var(--danger)", bg: "var(--danger-bg)" },
                    { title: "Unclassified", desc: "Insufficient signal to classify — generic recovery message sent", count: counts.unknown, icon: HelpCircle, color: "var(--text-muted)", bg: "#EEF1F8" },
                  ].map((c, i) => (
                    <TiltCard key={c.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} maxTilt={7} className="card glow-card p-6 min-w-0">
                      <div className="stat-icon mb-4" style={{ background: c.bg, color: c.color }}><c.icon size={17} /></div>
                      <div className="text-2xl font-semibold mb-1 num-display" style={{ color: "var(--navy)" }}>{c.count}</div>
                      <div className="text-sm font-medium mb-1.5" style={{ color: "var(--navy)" }}>{c.title}</div>
                      <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{c.desc}</div>
                    </TiltCard>
                  ))}
                </motion.div>
              )}

              {tab === "system" && (
                <motion.div key="system" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
                  {[
                    { icon: Webhook, color: "var(--blue)", bg: "#E8EFFF", title: "Webhook receiver", desc: "HMAC-SHA256 signature verification · endpoint: /webhooks/razorpay" },
                    { icon: Database, color: "var(--navy)", bg: "#EAF0F8", title: "Storage & queue", desc: "PostgreSQL (audit log + failure state) · Redis Streams consumer group" },
                    { icon: Bot, color: "var(--warning)", bg: "var(--warning-bg)", title: "AI recovery messages", desc: "Groq · openai/gpt-oss-20b · JSON-structured output with fallback" },
                  ].map((s) => (
                    <div key={s.title} className="card p-5 sm:p-6 flex items-start gap-4">
                      <div className="stat-icon shrink-0" style={{ background: s.bg, color: s.color }}><s.icon size={17} /></div>
                      <div className="min-w-0"><h3 className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{s.title}</h3>
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.desc}</p></div>
                    </div>
                  ))}
                  <div className="card p-5 sm:p-6">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--navy)" }}>Retry policy</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b" style={{ borderColor: "var(--border)" }}><td className="py-2" style={{ color: "var(--text-muted)" }}>Soft decline</td><td className="py-2 text-right num-display">1 → 3 → 7 days</td></tr>
                        <tr className="border-b" style={{ borderColor: "var(--border)" }}><td className="py-2" style={{ color: "var(--text-muted)" }}>Technical glitch</td><td className="py-2 text-right num-display">30 minutes</td></tr>
                        <tr><td className="py-2" style={{ color: "var(--text-muted)" }}>Hard decline</td><td className="py-2 text-right num-display">No auto-retry</td></tr>
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-center gap-2 mt-8">
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "#3ECF8E" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Smart Dunning Engine · All systems operational</p>
            </div>
          </main>
        </div>

        <AnimatePresence>
          {selected && <FailureDrawer failure={selected} onClose={() => setSelected(null)} />}
        </AnimatePresence>
      </div>
    </>
  );
}