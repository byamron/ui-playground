import { useState } from "react";

/**
 * AirPods Contact Noise Cancelling — Unhinged product concept.
 * iOS Settings page where you can set noise cancellation per contact.
 * "Tune out specific people in your life."
 *
 * Pixel-perfect iOS Settings mimicry: SF Pro, exact cell heights,
 * segmented controls, toggle styles.
 */

// ═══════════════════════════════════════════════════════════════
// iOS Design Tokens (matched from iOS 17 Settings)
// ═══════════════════════════════════════════════════════════════

const IOS = {
  bg: "#F2F2F7",
  cardBg: "#FFFFFF",
  separator: "#C6C6C8",
  separatorInset: "rgba(60, 60, 67, 0.29)",
  blue: "#007AFF",
  green: "#34C759",
  red: "#FF3B30",
  orange: "#FF9500",
  label: "#000000",
  secondaryLabel: "#3C3C43",
  tertiaryLabel: "rgba(60, 60, 67, 0.3)",
  groupedBg: "#F2F2F7",
  segmentBg: "rgba(118, 118, 128, 0.12)",
  segmentActive: "#FFFFFF",
  cellHeight: 44,
  headerFont: 13,
  bodyFont: 17,
  captionFont: 13,
};

const FONT = "-apple-system, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', sans-serif";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

type NCMode = "off" | "transparency" | "noise-cancellation";

interface Contact {
  name: string;
  initials: string;
  color: string;
  mode: NCMode;
  subtitle?: string;
}

// ═══════════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════════

const INITIAL_CONTACTS: Contact[] = [
  { name: "Manager", initials: "MG", color: "#FF9500", mode: "noise-cancellation" },
  { name: "Mom", initials: "MO", color: "#34C759", mode: "transparency" },
  { name: "Ex", initials: "EX", color: "#FF3B30", mode: "noise-cancellation" },
  { name: "Recruiter", initials: "RE", color: "#5856D6", mode: "noise-cancellation" },
  { name: "Roommate", initials: "RM", color: "#007AFF", mode: "off" },
  { name: "Dentist", initials: "DE", color: "#AF52DE", mode: "transparency" },
  { name: "Group Chat", initials: "GC", color: "#FF2D55", mode: "noise-cancellation" },
];

const NC_LABELS: Record<NCMode, string> = {
  "off": "Off",
  "transparency": "Transparency",
  "noise-cancellation": "Noise Cancellation",
};

// ═══════════════════════════════════════════════════════════════
// Subcomponents
// ═══════════════════════════════════════════════════════════════

function StatusBar() {
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).replace(" ", "");

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 24px 8px",
        fontFamily: FONT,
        fontSize: 15,
        fontWeight: 600,
        color: IOS.label,
      }}
    >
      <span>{time}</span>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        {/* Signal bars */}
        <svg width="17" height="12" viewBox="0 0 17 12">
          <rect x="0" y="9" width="3" height="3" rx="0.5" fill={IOS.label} />
          <rect x="4.5" y="6" width="3" height="6" rx="0.5" fill={IOS.label} />
          <rect x="9" y="3" width="3" height="9" rx="0.5" fill={IOS.label} />
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill={IOS.label} />
        </svg>
        {/* WiFi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill={IOS.label}>
          <path d="M8 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" transform="translate(0,-2)" />
          <path d="M4.94 8.06a4.5 4.5 0 016.12 0" stroke={IOS.label} strokeWidth="1.5" fill="none" strokeLinecap="round" transform="translate(0,-1)" />
          <path d="M2.1 5.22a8 8 0 0111.8 0" stroke={IOS.label} strokeWidth="1.5" fill="none" strokeLinecap="round" transform="translate(0,-1)" />
        </svg>
        {/* Battery */}
        <svg width="27" height="12" viewBox="0 0 27 12">
          <rect x="0" y="1" width="23" height="10" rx="2.5" stroke={IOS.label} strokeWidth="1" fill="none" />
          <rect x="24" y="4" width="2" height="4" rx="0.5" fill={IOS.tertiaryLabel} />
          <rect x="1.5" y="2.5" width="20" height="7" rx="1.5" fill={IOS.green} />
        </svg>
      </div>
    </div>
  );
}

function NavBar() {
  return (
    <div style={{ fontFamily: FONT }}>
      {/* Back chevron + label */}
      <div style={{ display: "flex", alignItems: "center", padding: "4px 16px 0", gap: 4, color: IOS.blue, fontSize: 17 }}>
        <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
          <path d="M9 1L1 9L9 17" stroke={IOS.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Settings</span>
      </div>
      {/* Large title */}
      <div style={{ padding: "4px 20px 8px", fontSize: 34, fontWeight: 700, color: IOS.label, letterSpacing: "-0.01em" }}>
        AirPods Pro
      </div>
    </div>
  );
}

function SettingsHeader() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 20px 16px",
        fontFamily: FONT,
      }}
    >
      {/* Centered AirPods illustration — matching iOS AirPods settings */}
      <svg width="140" height="100" viewBox="0 0 140 100" fill="none">
        {/* Left AirPod */}
        <ellipse cx="45" cy="32" rx="12" ry="16" fill="#E8E8ED" />
        <rect x="41" y="46" width="8" height="26" rx="4" fill="#E8E8ED" />
        <ellipse cx="45" cy="30" rx="4" ry="4" fill="#D1D1D6" />
        {/* Right AirPod */}
        <ellipse cx="95" cy="32" rx="12" ry="16" fill="#E8E8ED" />
        <rect x="91" y="46" width="8" height="26" rx="4" fill="#E8E8ED" />
        <ellipse cx="95" cy="30" rx="4" ry="4" fill="#D1D1D6" />
        {/* Case */}
        <rect x="30" y="78" width="80" height="18" rx="9" fill="#D1D1D6" />
        <rect x="55" y="76" width="30" height="4" rx="2" fill="#C7C7CC" />
      </svg>
      <div style={{ fontSize: 14, color: IOS.secondaryLabel, opacity: 0.6, marginTop: 4 }}>
        Connected · 87%
      </div>
    </div>
  );
}

export function NCSegmentedControl({
  value,
  onChange,
}: {
  value: NCMode;
  onChange: (v: NCMode) => void;
}) {
  return <SegmentedControl value={value} onChange={onChange} />;
}

function SegmentedControl({
  value,
  onChange,
}: {
  value: NCMode;
  onChange: (v: NCMode) => void;
}) {
  const modes: NCMode[] = ["off", "transparency", "noise-cancellation"];
  const labels = ["Off", "Transparency", "Noise Cancellation"];
  const activeIdx = modes.indexOf(value);

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        background: IOS.segmentBg,
        borderRadius: 8,
        padding: 2,
        height: 32,
      }}
    >
      {/* Sliding background */}
      <div
        style={{
          position: "absolute",
          top: 2,
          left: `calc(${(activeIdx / 3) * 100}% + 2px)`,
          width: `calc(${100 / 3}% - 4px)`,
          height: 28,
          background: IOS.segmentActive,
          borderRadius: 7,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
          transition: "left 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
      />
      {modes.map((mode, i) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          style={{
            flex: 1,
            position: "relative",
            zIndex: 1,
            background: "none",
            border: "none",
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: activeIdx === i ? 600 : 400,
            color: IOS.label,
            cursor: "pointer",
            padding: "0 4px",
            whiteSpace: "nowrap",
          }}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  );
}

const MODE_CYCLE: NCMode[] = ["off", "transparency", "noise-cancellation"];

export const NC_PREVIEW_CONTACTS = INITIAL_CONTACTS;

export function NCContactRow(props: {
  contact: Contact;
  onModeChange: (mode: NCMode) => void;
  isLast: boolean;
}) {
  return <ContactRow {...props} />;
}

function ContactRow({
  contact,
  onModeChange,
  isLast,
}: {
  contact: Contact;
  onModeChange: (mode: NCMode) => void;
  isLast: boolean;
}) {
  const cycleMode = () => {
    const currentIdx = MODE_CYCLE.indexOf(contact.mode);
    const nextMode = MODE_CYCLE[(currentIdx + 1) % MODE_CYCLE.length];
    onModeChange(nextMode);
  };

  return (
    <div>
      <div
        onClick={cycleMode}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px",
          minHeight: IOS.cellHeight,
          cursor: "pointer",
          fontFamily: FONT,
          transition: "background 0.15s",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            background: contact.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            flexShrink: 0,
            fontFamily: FONT,
          }}
        >
          {contact.initials}
        </div>

        <div style={{ flex: 1, marginLeft: 12 }}>
          <div style={{ fontSize: IOS.bodyFont, color: IOS.label, fontWeight: 400 }}>
            {contact.name}
          </div>
        </div>

        {/* Mode label — iOS disclosure cell style */}
        <div
          style={{
            fontSize: 17,
            color: contact.mode === "noise-cancellation" ? IOS.blue : "rgba(60, 60, 67, 0.6)",
            marginRight: 8,
            transition: "color 0.2s",
          }}
        >
          {NC_LABELS[contact.mode]}
        </div>

        {/* Chevron */}
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
          <path d="M1 1L6 6L1 11" stroke="rgba(60, 60, 67, 0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Separator */}
      {!isLast && (
        <div
          style={{
            height: 0.5,
            background: IOS.separatorInset,
            marginLeft: 66,
          }}
        />
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: string }) {
  return (
    <div
      style={{
        padding: "28px 20px 6px",
        fontSize: IOS.headerFont,
        fontWeight: 400,
        color: "rgba(60, 60, 67, 0.6)",
        textTransform: "uppercase",
        letterSpacing: "-0.08px",
        fontFamily: FONT,
      }}
    >
      {children}
    </div>
  );
}

function SectionFooter({ children }: { children: string }) {
  return (
    <div
      style={{
        padding: "6px 20px 0",
        fontSize: IOS.captionFont,
        color: "rgba(60, 60, 67, 0.5)",
        lineHeight: 1.35,
        fontFamily: FONT,
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

export function AirpodsNC() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);

  const updateContact = (idx: number, mode: NCMode) => {
    setContacts((prev) => prev.map((c, i) => (i === idx ? { ...c, mode } : c)));
  };

  const ncCount = contacts.filter((c) => c.mode === "noise-cancellation").length;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1C1C1E",
        fontFamily: FONT,
      }}
    >
      {/* iPhone frame */}
      <div
        style={{
          width: 393,
          height: 852,
          borderRadius: 44,
          overflow: "hidden",
          background: IOS.groupedBg,
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Dynamic Island */}
        <div
          style={{
            position: "absolute",
            top: 11,
            left: "50%",
            transform: "translateX(-50%)",
            width: 126,
            height: 37,
            borderRadius: 20,
            background: "#000",
            zIndex: 10,
          }}
        />

        <div style={{ paddingTop: 50, flex: 1, overflowY: "auto" }}>
          <StatusBar />
          <NavBar />
          <SettingsHeader />

          {/* Per-contact section — THE JOKE (moved up to be immediately visible) */}
          <SectionHeader>Per-Contact Noise Control</SectionHeader>
          <div
            style={{
              margin: "0 16px",
              background: IOS.cardBg,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {contacts.map((contact, i) => (
              <ContactRow
                key={contact.name}
                contact={contact}
                onModeChange={(mode) => updateContact(i, mode)}
                isLast={i === contacts.length - 1}
              />
            ))}
          </div>
          <SectionFooter>
            {ncCount === 0
              ? "All contacts set to default audio mode."
              : `Noise Cancellation active for ${ncCount} contact${ncCount > 1 ? "s" : ""}. Incoming audio from these contacts will be reduced by up to 97%.`}
          </SectionFooter>

          {/* Bottom padding */}
          <div style={{ height: 80 }} />
        </div>

        {/* Home indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 134,
            height: 5,
            borderRadius: 3,
            background: "rgba(0,0,0,0.2)",
          }}
        />
      </div>
    </div>
  );
}
