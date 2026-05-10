import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════
   Color tokens
   ═══════════════════════════════════════════════════════ */

const S = {
  orange: "#FC4C02",
  bg: "#FFFFFF",
  text: "#242428",
  textSec: "#999999",
  textTer: "#BBBBBB",
  border: "#E5E5EA",
};

const D = {
  navy: "#0B1560",
  navyDeep: "#070E3D",
  red: "#C8102E",
  blue: "#003A70",
  blueLink: "#0062B8",
  bg: "#EAEAEA",
  cardBg: "#FFFFFF",
  text: "#1A1A1A",
  textSec: "#6B6B6B",
  tealBg: "#E0F0ED",
  tealText: "#006B5F",
  promoBg: "#0A2466",
};

/* ═══════════════════════════════════════════════════════
   SVG Icons
   ═══════════════════════════════════════════════════════ */

function Chevron({
  color = "#000",
  size = 20,
  direction = "left",
}: {
  color?: string;
  size?: number;
  direction?: "left" | "right";
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={direction === "right" ? { transform: "rotate(180deg)" } : undefined}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function SearchIcon({ size = 20, color = "#242428" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.5" y1="15.5" x2="20" y2="20" />
    </svg>
  );
}

function GearIcon({ size = 22, color = "#242428" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function ShareIcon({ size = 15, color = "#242428" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function EditIcon({ size = 15, color = "#242428" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function DeltaTriangle({ color = "#C8102E", size = 14 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 22" fill={color}>
      <path d="M12 0L24 22H0L12 0z" />
    </svg>
  );
}

function CheckCircle() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "#34C759",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   iOS Status Bar
   ═══════════════════════════════════════════════════════ */

function StatusBar({ dark = false }: { dark?: boolean }) {
  const c = dark ? "#FFF" : "#000";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 28px 6px",
        fontSize: 15,
        fontWeight: 600,
        color: c,
        flexShrink: 0,
      }}
    >
      <span style={{ width: 54, letterSpacing: 0.5 }}>9:41</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <svg width="17" height="12" viewBox="0 0 17 12">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 4.5} y={9 - i * 3} width="3" height={3 + i * 3} rx="0.5" fill={c} />
          ))}
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round">
          <path d="M1 4.5C4 1.5 12 1.5 15 4.5" />
          <path d="M4 7.5C6 5.5 10 5.5 12 7.5" />
          <circle cx="8" cy="10.5" r="1" fill={c} stroke="none" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="1" width="22" height="11" rx="2.5" stroke={c} strokeWidth="1" fill="none" opacity="0.35" />
          <rect x="23.5" y="4" width="2" height="5" rx="1" fill={c} opacity="0.4" />
          <rect x="2" y="2.5" width="19" height="8" rx="1.5" fill={c} />
        </svg>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Strava Profile Screen
   ═══════════════════════════════════════════════════════ */

/* ── Smooth chart helpers ── */

const PHONE_W = 393;
const PHONE_H = 852;
const CHART_W = 300;
const CHART_H = 72;

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  const t = 0.3;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${(p1[0] + (p2[0] - p0[0]) * t).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) * t).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) * t).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) * t).toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

const chartMiles = [1.8, 3.4, 2.9, 4.1, 1.2, 2.6, 1.6, 3.3, 2.4, 1.7];
const chartPts: [number, number][] = chartMiles.map((m, i) => [
  (i / (chartMiles.length - 1)) * CHART_W,
  CHART_H - (m / 5) * CHART_H,
]);
const chartLine = smoothPath(chartPts);
const chartArea = chartLine + ` L${CHART_W},${CHART_H} L0,${CHART_H} Z`;

const PHOTO_GRADIENTS = [
  "linear-gradient(160deg, #5B86E5 20%, #C2E9FB 100%)",
  "linear-gradient(160deg, #E0E5EC 0%, #94A3B8 100%)",
  "linear-gradient(160deg, #2D6A4F 0%, #74C69D 100%)",
  "linear-gradient(160deg, #E07A5F 0%, #F2CC8F 100%)",
];

const ACTIVITIES = [
  { label: "Run", selected: true },
  { label: "Nordic Ski", selected: false },
  { label: "Alpine Ski", selected: false },
  { label: "Ice", selected: false },
];

function StravaScreen({ onRedeem }: { onRedeem: () => void }) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: S.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        color: S.text,
        overflow: "hidden",
      }}
    >
      <StatusBar />

      {/* ── Nav Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 16px 10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 2, minWidth: 60 }}>
          <Chevron size={18} color={S.text} />
          <span style={{ fontSize: 16 }}>You</span>
        </div>
        <span style={{ fontSize: 17, fontWeight: 600 }}>Profile</span>
        <div style={{ display: "flex", gap: 18, alignItems: "center", minWidth: 60, justifyContent: "flex-end" }}>
          <SearchIcon size={20} />
          <GearIcon size={22} />
        </div>
      </div>

      {/* ── Photo Grid ── */}
      <div style={{ display: "flex", gap: 2, height: 86, flexShrink: 0 }}>
        {PHOTO_GRADIENTS.map((g, i) => (
          <div key={i} style={{ flex: 1, background: g, minWidth: 0 }} />
        ))}
      </div>

      {/* ── Profile Info ── */}
      <div style={{ padding: "0 16px" }}>
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #5B86E5, #36D1DC)",
            border: "3px solid white",
            marginTop: -28,
          }}
        />
        <div style={{ fontWeight: 700, fontSize: 19, marginTop: 6 }}>Ben Yamron</div>
        <div style={{ color: S.textSec, fontSize: 14, marginTop: 1 }}>Seattle, WA</div>
      </div>

      {/* ── Following / Followers + Share / Edit ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 14px" }}>
        <div style={{ display: "flex", gap: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Following</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>67</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Followers</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>68</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { icon: <ShareIcon />, label: "Share" },
            { icon: <EditIcon />, label: "Edit" },
          ].map(({ icon, label }) => (
            <button
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                padding: "7px 14px",
                borderRadius: 20,
                border: `1.5px solid ${S.border}`,
                background: "transparent",
                cursor: "default",
                fontSize: 13,
                fontWeight: 600,
                color: S.text,
                fontFamily: "inherit",
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: S.border, margin: "0 16px" }} />

      {/* ── Travel Rewards ── */}
      <div style={{ padding: "14px 16px 14px" }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>Travel rewards</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: S.textSec, marginBottom: 1 }}>Available miles</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>834</div>
          </div>
          <button
            onPointerDown={() => setPressed(true)}
            onPointerUp={() => {
              setPressed(false);
              onRedeem();
            }}
            onPointerLeave={() => setPressed(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 18px",
              borderRadius: 22,
              border: "none",
              background: S.orange,
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transform: pressed ? "scale(0.95)" : "scale(1)",
              transition: "transform 0.1s ease",
            }}
          >
            <DeltaTriangle color="white" size={11} />
            Redeem with Delta
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: S.border, margin: "0 16px" }} />

      {/* ── Activity Type Filters ── */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflow: "hidden" }}>
        {ACTIVITIES.map(({ label, selected }) => (
          <div
            key={label}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              background: selected ? S.orange : "transparent",
              color: selected ? "white" : S.text,
              border: selected ? `1.5px solid ${S.orange}` : `1.5px solid ${S.border}`,
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* ── This Week ── */}
      <div style={{ padding: "6px 16px 4px" }}>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>This week</div>
        <div style={{ display: "flex", gap: 0 }}>
          {[
            { label: "Distance", value: "0.00 mi" },
            { label: "Time", value: "0h" },
            { label: "Elevation", value: "0 ft" },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ flex: 1, borderLeft: i > 0 ? `1px solid ${S.border}` : "none", paddingLeft: i > 0 ? 16 : 0 }}>
              <div style={{ fontSize: 12, color: S.textSec, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chart ── */}
      <div style={{ padding: "14px 16px 0", flex: 1 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <svg
              width="100%"
              height="72"
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              preserveAspectRatio="none"
              style={{ display: "block", overflow: "visible" }}
            >
              <defs>
                <linearGradient id="strava-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={S.orange} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={S.orange} stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <path d={chartArea} fill="url(#strava-area)" />
              <path d={chartLine} fill="none" stroke={S.orange} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              {chartPts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="2.5" fill={S.orange} />
              ))}
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 11, color: S.textTer, paddingTop: 0, paddingBottom: 2, width: 28, textAlign: "right", flexShrink: 0 }}>
            <span>5 mi</span>
            <span>0 mi</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: S.textTer, marginTop: 4, paddingRight: 34 }}>
          <span>NOV</span>
          <span>DEC</span>
          <span>JAN</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Delta Flight Results Screen
   ═══════════════════════════════════════════════════════ */

function DeltaScreen({ showToast, onBack }: { showToast: boolean; onBack: () => void }) {
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (showToast) {
      const t = setTimeout(() => setToastVisible(true), 100);
      return () => clearTimeout(t);
    } else {
      setToastVisible(false);
    }
  }, [showToast]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: D.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        color: D.text,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div style={{ background: D.navy, flexShrink: 0 }}>
        <StatusBar dark />

        {/* ── Route Header ── */}
        <div style={{ position: "relative", padding: "0 16px 14px", textAlign: "center" }}>
          <div
            onClick={onBack}
            style={{ position: "absolute", left: 12, top: 2, cursor: "pointer", padding: 4 }}
          >
            <Chevron color="white" size={22} />
          </div>
          <div style={{ color: "white", fontWeight: 700, fontSize: 19, letterSpacing: 0.3 }}>SFO &ndash; BOS</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 3 }}>
            Mon, Jun 1 &middot; 1
          </div>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Card Member Banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: D.promoBg,
            color: "white",
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          <div
            style={{
              width: 42,
              height: 28,
              borderRadius: 3,
              background: "linear-gradient(135deg, #D4A843 0%, #A67C25 100%)",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>Get Savings on Award Travel as a Card Member</div>
          <Chevron color="white" size={16} direction="right" />
        </div>

        {/* Fare Description */}
        <div style={{ padding: "10px 16px", fontSize: 12.5, color: D.textSec, lineHeight: 1.5, background: "white" }}>
          Fares are round-trip per passenger, including taxes and fees. Additional{" "}
          <span style={{ color: D.blueLink, textDecoration: "underline" }}>baggage</span> fees may apply.
          Delta flights may be listed first.
        </div>

        {/* Currency Tabs */}
        <div style={{ display: "flex", background: "white", padding: "0 16px" }}>
          {["USD", "Miles", "Miles + Cash"].map((tab, i) => (
            <div
              key={tab}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "11px 0 9px",
                fontSize: 14,
                fontWeight: i === 1 ? 700 : 400,
                color: i === 1 ? D.text : D.textSec,
                borderBottom: i === 1 ? `2.5px solid ${D.blue}` : "2.5px solid transparent",
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Cabin Class Pills */}
        <div style={{ display: "flex", gap: 8, padding: "12px 16px", background: "white" }}>
          {["Main", "Comfort", "First", "Delta One\u00AE"].map((cabin, i) => (
            <div
              key={cabin}
              style={{
                padding: "7px 12px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                background: i === 0 ? D.blue : "transparent",
                color: i === 0 ? "white" : D.blue,
                border: `1.5px solid ${D.blue}`,
                whiteSpace: "nowrap",
              }}
            >
              {cabin}
            </div>
          ))}
        </div>

        {/* Compare Link */}
        <div style={{ padding: "4px 16px 12px", background: "white" }}>
          <span style={{ color: D.blueLink, fontSize: 14, fontWeight: 500 }}>
            Compare Our Cabin Experiences{" "}
            <span style={{ fontSize: 16 }}>&equiv;</span>
          </span>
        </div>

        <div style={{ height: 6, background: D.bg }} />

        {/* ── Flight Card 1 ── */}
        <div style={{ background: "white" }}>
          {/* Badges */}
          <div style={{ display: "flex", gap: 6, padding: "12px 16px 8px", flexWrap: "wrap" }}>
            {["Nonstop", "Free Wi-Fi for SkyMiles Members"].map((badge) => (
              <span
                key={badge}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: D.tealText,
                  background: D.tealBg,
                  padding: "3px 8px",
                  borderRadius: 3,
                }}
              >
                {badge}
              </span>
            ))}
          </div>

          {/* Flight Number */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 16px 6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <DeltaTriangle color={D.red} size={14} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>DL400</span>
            </div>
            <span style={{ fontSize: 13, color: D.textSec }}>5h 56m</span>
          </div>

          {/* Times */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 2px" }}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>7:05 AM</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={D.textSec} style={{ flexShrink: 0 }}>
              <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0011.5 2 1.5 1.5 0 0010 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.3 }}>4:01 PM</span>
          </div>

          {/* Route */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 16px 14px", fontSize: 14, color: D.textSec }}>
            <span style={{ fontWeight: 600, color: D.text }}>SFO</span>
            <span>Nonstop</span>
            <span style={{ fontWeight: 600, color: D.text }}>BOS</span>
          </div>

          {/* Card Members Save */}
          <div
            style={{
              margin: "0 16px 8px",
              padding: "10px 14px",
              background: "#E3EDF8",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                <rect x="0.5" y="0.5" width="17" height="13" rx="2" stroke={D.blue} strokeWidth="1" />
                <rect x="0" y="4" width="18" height="2.5" fill={D.blue} />
              </svg>
              <span style={{ fontWeight: 600, fontSize: 13, color: D.blue }}>Card Members Save 15%</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, color: D.blue }}>37,700+$11</span>
          </div>

          {/* Main Price Card */}
          <div
            style={{
              margin: "0 16px 12px",
              padding: "12px 14px",
              border: `1.5px solid ${D.blue}`,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Delta Main</div>
              <div style={{ fontSize: 12, color: D.textSec }}>Round Trip From</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>44,500 miles</div>
                <div style={{ fontSize: 12, color: D.textSec }}>+$12</div>
              </div>
              <svg width="12" height="8" viewBox="0 0 12 8" fill={D.blue}>
                <path d="M1 1l5 5 5-5" stroke={D.blue} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Details / Seats */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 16px 14px" }}>
            <span style={{ color: D.blueLink, fontSize: 14, fontWeight: 600 }}>Details</span>
            <span style={{ color: D.blueLink, fontSize: 14, fontWeight: 600 }}>Seats</span>
          </div>
        </div>

        <div style={{ height: 6, background: D.bg }} />

        {/* ── Flight Card 2 (partial) ── */}
        <div style={{ background: "white", padding: "12px 16px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {["Nonstop", "Free Wi-Fi for SkyMiles Members"].map((badge) => (
              <span
                key={badge}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: D.tealText,
                  background: D.tealBg,
                  padding: "3px 8px",
                  borderRadius: 3,
                }}
              >
                {badge}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <DeltaTriangle color={D.red} size={14} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>DL977</span>
            <span style={{ fontSize: 13, color: D.textSec, marginLeft: "auto" }}>5h 50m</span>
          </div>
        </div>
      </div>

      {/* ── Bottom Navigation ── */}
      <div
        style={{
          display: "flex",
          background: "white",
          borderTop: "1px solid #D5D5D5",
          padding: "8px 0 28px",
          flexShrink: 0,
        }}
      >
        {[
          {
            label: "Explore",
            selected: false,
            icon: (c: string) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5">
                <path d="M3 12h4l3-9 4 18 3-9h4" />
              </svg>
            ),
          },
          {
            label: "Book",
            selected: true,
            icon: (c: string) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round">
                <circle cx="10" cy="10" r="7" />
                <line x1="15.5" y1="15.5" x2="21" y2="21" />
              </svg>
            ),
          },
          {
            label: "Trips",
            selected: false,
            icon: (c: string) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            ),
          },
          {
            label: "Account",
            selected: false,
            icon: (c: string) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-1a6 6 0 0112 0v1" />
              </svg>
            ),
          },
          {
            label: "More",
            selected: false,
            icon: (c: string) => (
              <svg width="22" height="22" viewBox="0 0 24 24" fill={c}>
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            ),
          },
        ].map(({ label, selected, icon }) => {
          const c = selected ? D.blue : "#8E8E93";
          return (
            <div
              key={label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                fontSize: 10,
                fontWeight: selected ? 600 : 400,
                color: c,
              }}
            >
              {icon(c)}
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {/* ── Toast ── */}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: 16,
          right: 16,
          padding: "14px 16px",
          background: D.navyDeep,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: "white",
          transform: toastVisible ? "translateY(0)" : "translateY(120px)",
          opacity: toastVisible ? 1 : 0,
          transition: "transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease",
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
          zIndex: 10,
        }}
      >
        <CheckCircle />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>
            834 miles transferred from Strava
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>Added to your SkyMiles balance</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */

export function StravaDelta() {
  const [screen, setScreen] = useState<"strava" | "delta">("strava");
  const [showToast, setShowToast] = useState(false);
  const [scale, setScale] = useState(1);
  const outerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const pad = 60;
      const sw = (window.innerWidth - pad) / (PHONE_W + 24);
      const sh = (window.innerHeight - pad) / (PHONE_H + 24);
      setScale(Math.min(sw, sh));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleRedeem = useCallback(() => {
    setScreen("delta");
    setTimeout(() => setShowToast(true), 600);
  }, []);

  const handleBack = useCallback(() => {
    setShowToast(false);
    setTimeout(() => setScreen("strava"), 100);
  }, []);

  return (
    <div ref={outerRef} className="demo-page" style={{ background: "#0E0E0E" }}>
      <style>{`
        .sd-phone {
          width: ${PHONE_W}px;
          height: ${PHONE_H}px;
          border-radius: 52px;
          overflow: hidden;
          position: relative;
          box-shadow:
            0 0 0 10px #1c1c1e,
            0 0 0 12px rgba(255,255,255,0.08),
            0 40px 100px rgba(0,0,0,0.6);
        }
        .sd-layer {
          position: absolute;
          inset: 0;
          transition: opacity 0.4s ease, transform 0.4s ease;
          will-change: opacity, transform;
        }
      `}</style>

      <div style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}>
        <div className="sd-phone">
          {/* Strava */}
          <div
            className="sd-layer"
            style={{
              opacity: screen === "strava" ? 1 : 0,
              transform: screen === "strava" ? "scale(1)" : "scale(0.92)",
              pointerEvents: screen === "strava" ? "auto" : "none",
            }}
          >
            <StravaScreen onRedeem={handleRedeem} />
          </div>

          {/* Delta */}
          <div
            className="sd-layer"
            style={{
              opacity: screen === "delta" ? 1 : 0,
              transform: screen === "delta" ? "scale(1)" : "scale(1.08)",
              pointerEvents: screen === "delta" ? "auto" : "none",
            }}
          >
            <DeltaScreen showToast={showToast} onBack={handleBack} />
          </div>
        </div>
      </div>
    </div>
  );
}
