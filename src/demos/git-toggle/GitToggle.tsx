import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DevPanel,
  DevButtonGroup,
  DevSlider,
  DevDivider,
  DevButton,
} from "../../components/DevPanel";

// ═══════════════════════════════════════════════════════════════
// Tokens — GitHub dark + Conductor purple + iOS Settings
// ═══════════════════════════════════════════════════════════════

const GH = {
  bg: "#0d1117",
  surface: "#161b22",
  surface2: "#21262d",
  border: "#30363d",
  borderMuted: "#21262d",
  text: "#e6edf3",
  textSec: "#7d8590",
  textMuted: "#6e7681",
  green: "#2ea043",
  greenBtn: "#238636",
  greenBtnHover: "#2ea043",
  red: "#f85149",
  blue: "#79c0ff",
  blueBtn: "#1f6feb",
  yellow: "#d29922",
  diffAddBg: "rgba(46, 160, 67, 0.15)",
  diffAddGutter: "rgba(46, 160, 67, 0.3)",
  diffRemoveBg: "rgba(248, 81, 73, 0.15)",
  diffRemoveGutter: "rgba(248, 81, 73, 0.3)",
};

const CONDUCTOR = {
  purple: "#a78bfa",
  purpleDeep: "#8b5cf6",
  purpleBg: "rgba(167, 139, 250, 0.08)",
  purpleBorder: "rgba(167, 139, 250, 0.4)",
};

const IOS = {
  green: "#34c759",
  trackOff: "rgba(120, 120, 128, 0.16)",
  trackInner: "rgba(120, 120, 128, 0.32)",
  pendingTrack: "#f0b429", // amber — CI-pending convention, readable at video distance
  cardBg: "#ffffff",
  cardBorder: "rgba(60, 60, 67, 0.12)",
  text: "#000",
  textSec: "rgba(60, 60, 67, 0.6)",
};

const FONT_UI =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif";
const FONT_MONO =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

// ═══════════════════════════════════════════════════════════════
// State machine
// ═══════════════════════════════════════════════════════════════

type Stage =
  | "idle"
  | "modified"
  | "staged"
  | "committed"
  | "pushing"
  | "pushed"
  | "pr_drafting"
  | "pr_open"
  | "ci_passed"
  | "reviewed"
  | "merging"
  | "merged";

type Direction = "on" | "off";

interface DemoState {
  stage: Stage;
  direction: Direction;
  toggleOn: boolean;
  prNumber: number;
  commitMessage: string;
  ciChecksPassed: number;
  reviewTyped: number;
  pushLines: number;
  hasConflict: boolean;
}

const INITIAL_STATE: DemoState = {
  stage: "idle",
  // Notifications start ON by default — the satirical core is that turning OFF
  // a default-on setting requires this entire bureaucratic process.
  direction: "off",
  toggleOn: true,
  prNumber: 0,
  commitMessage: "",
  ciChecksPassed: 0,
  reviewTyped: 0,
  pushLines: 0,
  hasConflict: false,
};

// ═══════════════════════════════════════════════════════════════
// Direction-aware copy — every string flips cleanly between on/off
// ═══════════════════════════════════════════════════════════════

const valueFor = (d: Direction) => (d === "on" ? "true" : "false");
const oppositeValueFor = (d: Direction) => (d === "on" ? "false" : "true");
const oppositeWordFor = (d: Direction) => (d === "on" ? "off" : "on");
// With notifications-on as the default, the primary branch turns the toggle OFF.
// The "on" direction is now the revert.
const branchFor = (d: Direction) =>
  d === "off" ? "turn-toggle-off" : "revert-1-turn-toggle-off";
const changesetFileFor = (d: Direction) =>
  d === "off" ? ".changeset/turn-toggle-off.md" : ".changeset/revert-turn-toggle-off.md";
const prTitleFor = (d: Direction) =>
  d === "off" ? "Turn toggle off" : 'Revert "Turn toggle off"';
const branchCommitShaFor = (d: Direction) => (d === "off" ? "a3f1c92" : "7b2d1f8");
const mergeCommitShaFor = (d: Direction) => (d === "off" ? "ef0ba31" : "1c4e0a9");
const adrFileFor = (d: Direction) =>
  d === "off"
    ? "docs/ADRs/0042-disable-default-notifs.md"
    : "docs/ADRs/0043-restore-default-notifs.md";

const prDescriptionFor = (d: Direction) => {
  const isRevert = d === "on";
  const revertPrefix = isRevert
    ? `This reverts commit ${mergeCommitShaFor("off")}.\n\n`
    : "";
  return `${revertPrefix}Turns the toggle ${d}.

## Summary
- Sets \`allowNotifications\` to \`${valueFor(d)}\`

## Changes
- \`src/settings.ts\`                       1 line changed
- \`src/settings.test.ts\`                  87 lines added
- \`src/settings.integration.test.ts\`      42 lines added
- \`e2e/notifications.spec.ts\`             28 lines added
- \`docs/CHANGELOG.md\`                     6 lines added
- \`${adrFileFor(d)}\`     34 lines added
- \`${changesetFileFor(d)}\`        5 lines added

## Tests
- [x] Unit tests (47)
- [x] Integration tests (3)
- [x] E2E test (Playwright)
- [x] Snapshot test
- [x] Accessibility audit (axe-core, 0 violations)
- [x] Visual regression (Chromatic)
- [x] Performance benchmark — no regression
- [x] Manual QA across iOS 17, iOS 18, iPadOS, macOS
- [ ] Localization (deferred to follow-up PR)

## Risks
- The toggle is now ${d}. Users ${
    d === "on"
      ? "will once again receive notifications"
      : "will no longer receive notifications by default"
  }.
- If this is wrong, can be reverted by going through this
  entire process again in the other direction.`;
};

const reviewCommentFor = (d: Direction) =>
  d === "off"
    ? `This branch turns the toggle off. Implementation looks clean and well-tested — coverage is exemplary for a change of this scope.

A few thoughts for future consideration:
• Consider extracting \`false\` into a named constant (e.g. \`TOGGLE_OFF_VALUE = false\`) to avoid magic values.
• A corresponding \`turn-toggle-on\` flow would improve symmetry across the codebase.
• The variable name \`allowNotifications\` is clear, but \`userHasOptedIntoNotificationDelivery\` would be more descriptive.
• Should we add a Storybook story for the "off" state of the toggle component?
• Consider adding a snapshot test for the "on" state as well for completeness.

LGTM 🚢`
    : `This branch turns the toggle back on. Confirmed the revert applies cleanly and ADR-0043 properly supersedes ADR-0042.

A few thoughts:
• The variable name \`allowNotifications\` is clear, but \`userHasOptedIntoNotificationDelivery\` would still be more descriptive.
• A small follow-up: consider ADR-0044 documenting the lessons learned from the ADR-0042 → ADR-0043 cycle.
• Nice work backing this out.

LGTM 🚢`;

const testFileContentFor = (d: Direction) => {
  const v = valueFor(d);
  const ov = oppositeValueFor(d);
  return `describe('allowNotifications', () => {
  it('should be ${v}', () => {
    expect(allowNotifications).toBe(${v})
  })

  it('should not be ${ov}', () => {
    expect(allowNotifications).not.toBe(${ov})
  })

  it('should be a boolean', () => {
    expect(typeof allowNotifications).toBe('boolean')
  })

  it('should not be undefined', () => {
    expect(allowNotifications).not.toBeUndefined()
  })

  it('should not be null', () => {
    expect(allowNotifications).not.toBeNull()
  })

  describe('edge cases', () => {
    it('handles being read multiple times', () => {
      expect(allowNotifications).toBe(${v})
      expect(allowNotifications).toBe(${v})
      expect(allowNotifications).toBe(${v})
    })

    it('handles concurrent reads', async () => {
      const reads = await Promise.all([
        Promise.resolve(allowNotifications),
        Promise.resolve(allowNotifications),
        Promise.resolve(allowNotifications),
      ])
      expect(reads).toEqual([${v}, ${v}, ${v}])
    })

    it('survives JSON round-trip', () => {
      expect(JSON.parse(JSON.stringify(allowNotifications))).toBe(${v})
    })
  })

  describe('regression tests', () => {
    it('is not ${ov} (regression for #1)', () => {
      expect(allowNotifications).not.toBe(${ov})
    })
  })
})`;
};

const adrContentFor = (d: Direction) =>
  d === "off"
    ? `# ADR-0042: Disable Default Notifications

## Status
Accepted

## Context
The \`allowNotifications\` flag has been \`true\` by default since
project inception. Stakeholders have determined that notifications
should no longer be enabled by default.

## Decision
Set \`allowNotifications\` to \`false\`.

## Consequences
- Users will no longer receive notifications by default.
- A follow-up ADR will be required if the team decides to
  restore default notifications.

## Alternatives considered
- Leaving \`allowNotifications\` as \`true\` (rejected: stakeholders
  have determined notifications should be off by default).`
    : `# ADR-0043: Restore Default Notifications

## Status
Accepted (supersedes ADR-0042)

## Context
ADR-0042 set \`allowNotifications\` to \`false\` by default. The
team has since determined that disabling default notifications
was the wrong call and that the previous behavior should be
restored.

## Decision
Set \`allowNotifications\` back to \`true\`.

## Consequences
- Users will once again receive notifications by default.
- ADR-0042 is hereby superseded.

## Alternatives considered
- Leaving \`allowNotifications\` as \`false\` (rejected: see
  business case in the linked PR).`;

const changelogFor = (d: Direction) =>
  d === "off"
    ? "## [1.0.1] - 2026-05-21\n\n### Changed\n- `allowNotifications` default is now `false`."
    : "## [1.0.2] - 2026-05-21\n\n### Changed\n- `allowNotifications` default is now `true` again (reverts 1.0.1).";

const changesetContentFor = (d: Direction) =>
  d === "off"
    ? '---\n"notifications": patch\n---\n\nTurns the toggle off.'
    : '---\n"notifications": patch\n---\n\nRestores the toggle on (reverts previous change).';

const integrationTestContentFor = (d: Direction) =>
  `// Integration tests for allowNotifications being ${valueFor(d)}.\n// (42 lines of integration tests omitted for brevity.)`;

const e2eTestContentFor = (d: Direction) =>
  `// Playwright E2E test verifying the notification toggle ends in the ${d} state.\n// (28 lines omitted for brevity.)`;

const pushLinesFor = (d: Direction) => {
  const branch = branchFor(d);
  return [
    "Enumerating objects: 17, done.",
    "Counting objects: 100% (17/17), done.",
    "Delta compression using up to 10 threads",
    "Compressing objects: 100% (12/12), done.",
    "Writing objects: 100% (12/12), 2.41 KiB | 2.41 MiB/s, done.",
    "Total 12 (delta 5), reused 0 (delta 0), pack-reused 0",
    "remote: Resolving deltas: 100% (5/5), completed with 4 local objects.",
    "To github.com:user/notifications.git",
    ` * [new branch]      ${branch} -> ${branch}`,
    `branch '${branch}' set up to track 'origin/${branch}'.`,
  ];
};

// ═══════════════════════════════════════════════════════════════
// Tiny icons
// ═══════════════════════════════════════════════════════════════

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    style={{
      transform: open ? "rotate(90deg)" : "rotate(0deg)",
      transition: "transform 0.18s",
      flexShrink: 0,
    }}
  >
    <path
      d="M4 2.5L7.5 6L4 9.5"
      stroke="currentColor"
      strokeWidth="1.4"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GitBranchIcon = ({ size = 14, color = GH.textSec }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
  </svg>
);

const Spinner = ({ size = 14 }: { size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    style={{ flexShrink: 0 }}
  >
    <circle
      cx="8"
      cy="8"
      r="6"
      stroke={GH.yellow}
      strokeWidth="2"
      fill="none"
      strokeDasharray="28"
      strokeDashoffset="14"
      strokeLinecap="round"
    />
  </motion.svg>
);

const CheckCircle = ({ size = 14, color = GH.green }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
  </svg>
);

const PendingDot = () => (
  <motion.div
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    style={{
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: GH.yellow,
      flexShrink: 0,
    }}
  />
);

// ═══════════════════════════════════════════════════════════════
// Apple iOS Settings card with the hero toggle
// ═══════════════════════════════════════════════════════════════

interface AppleToggleProps {
  on: boolean;
  pending: boolean;
  prNumber: number;
  onSwitchClick: () => void;
  switchDisabled: boolean;
}

function AppleToggleCard({ on, pending, prNumber, onSwitchClick, switchDisabled }: AppleToggleProps) {
  // iOS toggle: 51×31 track, 27 handle. off x=2, on x=22.
  // Pending state: handle stays in current position; track becomes amber to signal
  // a pending change (matches CI's yellow-pending convention; cleaner than a midpoint).
  const handleX = on ? 22 : 2;
  const trackBg = pending
    ? IOS.pendingTrack
    : on
    ? IOS.green
    : IOS.trackOff;

  return (
    <div
      style={{
        background: IOS.cardBg,
        borderRadius: 12,
        boxShadow: "0 2px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
        width: "100%",
        maxWidth: 480,
        overflow: "hidden",
        fontFamily: FONT_UI,
      }}
    >
      <div
        style={{
          padding: "11px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 44,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: 17,
              color: IOS.text,
              letterSpacing: "-0.4px",
              fontWeight: 400,
            }}
          >
            Allow Notifications
          </span>
          {pending && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: GH.yellow,
                fontFamily: FONT_MONO,
                background: "rgba(210, 153, 34, 0.1)",
                border: "1px solid rgba(210, 153, 34, 0.25)",
                padding: "1px 6px",
                borderRadius: 4,
              }}
              title={prNumber ? `Pending merge of #${prNumber}` : "Pending"}
            >
              <PendingDot />
              {prNumber > 0 ? `#${prNumber}` : "pending"}
            </motion.span>
          )}
        </div>
        {/* The iOS switch — the only clickable element in the card */}
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!switchDisabled) onSwitchClick();
          }}
          aria-label="Allow Notifications"
          aria-checked={on}
          role="switch"
          disabled={switchDisabled}
          animate={
            pending
              ? { boxShadow: ["0 0 0 0 rgba(240, 180, 41, 0)", "0 0 0 4px rgba(240, 180, 41, 0.18)", "0 0 0 0 rgba(240, 180, 41, 0)"] }
              : { boxShadow: "0 0 0 0 rgba(240, 180, 41, 0)" }
          }
          transition={
            pending
              ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.2 }
          }
          style={{
            width: 51,
            height: 31,
            borderRadius: 31,
            background: trackBg,
            position: "relative",
            cursor: switchDisabled ? "default" : "pointer",
            flexShrink: 0,
            transition: "background 0.25s",
            border: "none",
            padding: 0,
          }}
        >
          {/* Directional arrow in the empty side of the track when pending */}
          {pending && (
            <motion.div
              key={on ? "going-off" : "going-on"}
              initial={{ opacity: 0, x: on ? 4 : -4 }}
              animate={{ opacity: [0.65, 1, 0.65], x: 0 }}
              transition={{
                opacity: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
                x: { duration: 0.18 },
              }}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: on ? 6 : "auto",
                right: on ? "auto" : 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                pointerEvents: "none",
              }}
              aria-hidden
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                {on ? (
                  <path
                    d="M6.5 2.5L3 5.5L6.5 8.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M4.5 2.5L8 5.5L4.5 8.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </motion.div>
          )}
          <motion.div
            animate={{ x: handleX }}
            transition={{ type: "spring", stiffness: 700, damping: 38, mass: 0.5 }}
            style={{
              width: 27,
              height: 27,
              borderRadius: "50%",
              background: "#ffffff",
              position: "absolute",
              top: 2,
              left: 0,
              boxShadow: "0 3px 8px rgba(0,0,0,0.15), 0 3px 1px rgba(0,0,0,0.06)",
              zIndex: 1,
            }}
          />
        </motion.button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GitHub-zone primitives
// ═══════════════════════════════════════════════════════════════

function GHCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: GH.surface,
        border: `1px solid ${GH.border}`,
        borderRadius: 6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function GHButton({
  children,
  onClick,
  variant = "default",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "ghost";
  disabled?: boolean;
}) {
  const bg =
    variant === "primary"
      ? GH.greenBtn
      : variant === "danger"
      ? "transparent"
      : variant === "ghost"
      ? "transparent"
      : GH.surface2;
  const border =
    variant === "primary"
      ? "rgba(240, 246, 252, 0.1)"
      : variant === "danger"
      ? GH.border
      : GH.border;
  const color =
    variant === "primary"
      ? "#ffffff"
      : variant === "danger"
      ? GH.red
      : variant === "ghost"
      ? GH.text
      : GH.text;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { y: -1 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      style={{
        padding: "5px 14px",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 6,
        color,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: FONT_UI,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 28,
      }}
    >
      {children}
    </motion.button>
  );
}

function BranchChip({ name }: { name: string }) {
  return (
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: 12,
        color: GH.blue,
        background: "rgba(56, 139, 253, 0.15)",
        padding: "1px 7px",
        borderRadius: 4,
      }}
    >
      {name}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// Diff hunk
// ═══════════════════════════════════════════════════════════════

interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
  expandable?: boolean;
  content?: string;
  language?: string;
  primary?: boolean; // shown expanded by default
  primaryLines?: { type: "add" | "remove" | "context"; text: string }[];
}

const getDiffFiles = (d: Direction): DiffFile[] => [
  {
    path: "src/settings.ts",
    additions: 1,
    deletions: 1,
    primary: true,
    primaryLines: [
      { type: "context", text: "export const config = {" },
      { type: "remove", text: `  allowNotifications: ${oppositeValueFor(d)},` },
      { type: "add", text: `  allowNotifications: ${valueFor(d)},` },
      { type: "context", text: "};" },
    ],
  },
  {
    path: "src/settings.test.ts",
    additions: 87,
    deletions: 0,
    expandable: true,
    content: testFileContentFor(d),
    language: "ts",
  },
  {
    path: "src/settings.integration.test.ts",
    additions: 42,
    deletions: 0,
    expandable: true,
    content: integrationTestContentFor(d),
  },
  {
    path: "e2e/notifications.spec.ts",
    additions: 28,
    deletions: 0,
    expandable: true,
    content: e2eTestContentFor(d),
  },
  {
    path: "docs/CHANGELOG.md",
    additions: 6,
    deletions: 0,
    expandable: true,
    content: changelogFor(d),
  },
  {
    path: adrFileFor(d),
    additions: 34,
    deletions: 0,
    expandable: true,
    content: adrContentFor(d),
    language: "md",
  },
  {
    path: changesetFileFor(d),
    additions: 5,
    deletions: 0,
    expandable: true,
    content: changesetContentFor(d),
  },
];

function DiffFileBlock({
  file,
  staged,
}: {
  file: DiffFile;
  staged: boolean;
}) {
  const [open, setOpen] = useState(!!file.primary);

  const addBg = staged ? GH.diffAddBg : "rgba(46, 160, 67, 0.08)";
  const removeBg = staged ? GH.diffRemoveBg : "rgba(248, 81, 73, 0.08)";

  const primaryLines = file.primary ? file.primaryLines ?? null : null;

  return (
    <div
      style={{
        borderTop: `1px solid ${GH.borderMuted}`,
      }}
    >
      <button
        onClick={() => file.expandable && setOpen(!open)}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "transparent",
          border: "none",
          color: GH.text,
          fontFamily: FONT_MONO,
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: file.expandable ? "pointer" : "default",
          textAlign: "left",
        }}
      >
        {file.expandable ? (
          <Chevron open={open} />
        ) : (
          <span style={{ width: 12, display: "inline-block" }} />
        )}
        <span style={{ flex: 1, color: GH.text }}>{file.path}</span>
        <span style={{ color: GH.green, fontSize: 11 }}>+{file.additions}</span>
        {file.deletions > 0 && (
          <span style={{ color: GH.red, fontSize: 11 }}>−{file.deletions}</span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            style={{ overflow: "hidden" }}
          >
            {primaryLines ? (
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 12,
                  lineHeight: 1.5,
                  borderTop: `1px solid ${GH.borderMuted}`,
                }}
              >
                {primaryLines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      background:
                        line.type === "add"
                          ? addBg
                          : line.type === "remove"
                          ? removeBg
                          : "transparent",
                      borderLeft: `2px solid ${
                        line.type === "add"
                          ? GH.diffAddGutter
                          : line.type === "remove"
                          ? GH.diffRemoveGutter
                          : "transparent"
                      }`,
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        textAlign: "center",
                        color: GH.textMuted,
                        userSelect: "none",
                        flexShrink: 0,
                      }}
                    >
                      {line.type === "add"
                        ? "+"
                        : line.type === "remove"
                        ? "−"
                        : " "}
                    </span>
                    <span
                      style={{
                        padding: "1px 8px 1px 0",
                        color: GH.text,
                        whiteSpace: "pre",
                      }}
                    >
                      {line.text}
                    </span>
                  </div>
                ))}
              </div>
            ) : file.content ? (
              <pre
                style={{
                  margin: 0,
                  padding: "10px 14px",
                  fontFamily: FONT_MONO,
                  fontSize: 11.5,
                  color: GH.text,
                  background: "rgba(46, 160, 67, 0.04)",
                  borderTop: `1px solid ${GH.borderMuted}`,
                  borderLeft: `2px solid ${GH.diffAddGutter}`,
                  whiteSpace: "pre",
                  overflowX: "auto",
                  lineHeight: 1.55,
                }}
              >
                {file.content}
              </pre>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DiffHunk({ staged, direction }: { staged: boolean; direction: Direction }) {
  const files = getDiffFiles(direction);
  const totalAdditions = files.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = files.reduce((s, f) => s + f.deletions, 0);

  return (
    <GHCard style={{ overflow: "hidden" }}>
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: FONT_UI,
          fontSize: 12,
          color: GH.textSec,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GitBranchIcon color={GH.textSec} size={12} />
          <span style={{ fontFamily: FONT_MONO, color: GH.text }}>
            {branchFor(direction)}
          </span>
          <span style={{ color: GH.textMuted }}>·</span>
          <span>{files.length} files changed</span>
          <span style={{ color: GH.green }}>+{totalAdditions}</span>
          <span style={{ color: GH.red }}>−{totalDeletions}</span>
        </div>
        {staged && (
          <span style={{ color: GH.green, fontSize: 11, fontWeight: 600 }}>
            STAGED
          </span>
        )}
      </div>
      {files.map((f) => (
        <DiffFileBlock key={f.path} file={f} staged={staged} />
      ))}
    </GHCard>
  );
}

// ═══════════════════════════════════════════════════════════════
// Streaming git output (after Push)
// ═══════════════════════════════════════════════════════════════

function StreamingPushOutput({
  lines,
  direction,
}: {
  lines: number;
  direction: Direction;
}) {
  const allLines = pushLinesFor(direction);
  return (
    <pre
      style={{
        margin: 0,
        padding: "12px 14px",
        background: "#010409",
        color: GH.text,
        fontFamily: FONT_MONO,
        fontSize: 12,
        borderRadius: 6,
        border: `1px solid ${GH.border}`,
        lineHeight: 1.55,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {allLines.slice(0, lines).map((l, i) => (
        <div key={i}>{l}</div>
      ))}
      {lines < allLines.length && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{ display: "inline-block", color: GH.textSec }}
        >
          ▍
        </motion.span>
      )}
    </pre>
  );
}

// ═══════════════════════════════════════════════════════════════
// PR card with CI checks and review-bot comment
// ═══════════════════════════════════════════════════════════════

interface CICheck {
  name: string;
  detail: string;
}

const CI_CHECKS: CICheck[] = [
  { name: "lint", detail: "passed in 4s" },
  { name: "test", detail: "47 tests · passed in 12.4s" },
  { name: "e2e", detail: "1 test · passed in 31.2s" },
  { name: "build", detail: "passed in 8s" },
];

function CIRow({
  check,
  passed,
}: {
  check: CICheck;
  passed: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        borderTop: `1px solid ${GH.borderMuted}`,
        fontSize: 12,
        fontFamily: FONT_UI,
      }}
    >
      {passed ? <CheckCircle size={14} /> : <Spinner size={14} />}
      <span style={{ color: GH.text, fontWeight: 500 }}>{check.name}</span>
      <span style={{ color: GH.textSec, marginLeft: "auto", fontFamily: FONT_MONO, fontSize: 11 }}>
        {passed ? check.detail : "running…"}
      </span>
    </div>
  );
}

function ReviewBotLoading() {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderTop: `1px solid ${GH.borderMuted}`,
        display: "flex",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: CONDUCTOR.purple,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: FONT_UI,
          flexShrink: 0,
        }}
      >
        R
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: GH.textSec,
          fontFamily: FONT_UI,
        }}
      >
        <Spinner size={12} />
        <span>review-bot is reviewing…</span>
      </div>
    </div>
  );
}

function ReviewBotComment({
  text,
  charsShown,
}: {
  text: string;
  charsShown: number;
}) {
  const shown = text.slice(0, charsShown);
  const isTyping = charsShown < text.length;
  return (
    <div
      style={{
        padding: "12px 14px",
        borderTop: `1px solid ${GH.borderMuted}`,
        display: "flex",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: CONDUCTOR.purple,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: FONT_UI,
          flexShrink: 0,
        }}
      >
        R
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            color: GH.text,
            fontFamily: FONT_UI,
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontWeight: 600 }}>review-bot</span>
          <span style={{ color: GH.textMuted }}>reviewed · just now</span>
          {!isTyping && (
            <span
              style={{
                marginLeft: "auto",
                color: GH.green,
                fontSize: 11,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <CheckCircle size={12} /> Approved
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 13,
            color: GH.text,
            fontFamily: FONT_UI,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {shown}
          {isTyping && (
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
              style={{ display: "inline-block", color: GH.textSec, marginLeft: 1 }}
            >
              ▍
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Merged banner — matches user's GitHub screenshot
// ═══════════════════════════════════════════════════════════════

function MergedBanner({ direction }: { direction: Direction }) {
  const branchName = branchFor(direction);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: CONDUCTOR.purpleDeep,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 12,
        }}
      >
        <GitBranchIcon size={16} color="#fff" />
      </div>
      <div
        style={{
          flex: 1,
          padding: "16px 18px",
          border: `1px dashed ${CONDUCTOR.purpleBorder}`,
          borderRadius: 8,
          background: CONDUCTOR.purpleBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: GH.text,
              fontFamily: FONT_UI,
              marginBottom: 4,
            }}
          >
            Pull request successfully merged and closed
          </div>
          <div
            style={{
              fontSize: 13,
              color: GH.textSec,
              fontFamily: FONT_UI,
            }}
          >
            You're all set — the <BranchChip name={branchName} /> branch can be safely deleted.
          </div>
        </div>
        <GHButton variant="default">Delete branch</GHButton>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Commit timeline row (final state)
// ═══════════════════════════════════════════════════════════════

function CommitTimelineRow({
  direction,
  onRevert,
}: {
  direction: Direction;
  onRevert: () => void;
}) {
  const sha = mergeCommitShaFor(direction);
  const title = prTitleFor(direction);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: CONDUCTOR.purpleDeep,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <GitBranchIcon size={16} color="#fff" />
      </div>
      <div
        style={{
          flex: 1,
          color: GH.text,
          fontSize: 13,
          fontFamily: FONT_UI,
        }}
      >
        <span style={{ fontWeight: 600 }}>user</span>{" "}
        <span style={{ color: GH.textSec }}>
          merged commit{" "}
          <span style={{ fontFamily: FONT_MONO, color: GH.text }}>{sha}</span> into{" "}
        </span>
        <BranchChip name="main" />
        <span style={{ color: GH.textSec }}> · just now</span>
        <div style={{ marginTop: 4, color: GH.textMuted, fontSize: 12, fontFamily: FONT_MONO }}>
          {title}
        </div>
      </div>
      <GHButton onClick={onRevert}>Revert</GHButton>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PR draft — inline card that matches the rest of the cascade
// ═══════════════════════════════════════════════════════════════

function PRDraftCard({
  description,
  onChange,
  onCancel,
  onSubmit,
  title,
}: {
  description: string;
  onChange: (s: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  title: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
    >
      <GHCard style={{ overflow: "hidden", fontFamily: FONT_UI }}>
        <div
          style={{
            padding: "12px 14px",
            borderBottom: `1px solid ${GH.borderMuted}`,
            color: GH.text,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Open a pull request
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 12,
                color: GH.textSec,
                marginBottom: 6,
              }}
            >
              Title
            </div>
            <div
              style={{
                background: GH.bg,
                border: `1px solid ${GH.border}`,
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 13,
                color: GH.text,
                fontFamily: FONT_UI,
              }}
            >
              {title}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: GH.textSec, marginBottom: 6 }}>
              Description
            </div>
            <textarea
              value={description}
              onChange={(e) => onChange(e.target.value)}
              spellCheck={false}
              rows={10}
              style={{
                width: "100%",
                maxHeight: 320,
                background: GH.bg,
                border: `1px solid ${GH.border}`,
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 12.5,
                color: GH.text,
                fontFamily: FONT_MONO,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                lineHeight: 1.55,
                overflowY: "auto",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = GH.blueBtn)}
              onBlur={(e) => (e.currentTarget.style.borderColor = GH.border)}
            />
          </div>
        </div>
        <div
          style={{
            padding: "12px 14px",
            borderTop: `1px solid ${GH.borderMuted}`,
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "5px 14px",
              background: "transparent",
              border: `1px dashed ${CONDUCTOR.purpleBorder}`,
              borderRadius: 6,
              color: CONDUCTOR.purple,
              fontSize: 13,
              fontFamily: FONT_UI,
              cursor: "pointer",
              fontWeight: 500,
              height: 28,
            }}
          >
            Cancel
          </button>
          <GHButton variant="primary" onClick={onSubmit}>
            Create pull request
          </GHButton>
        </div>
      </GHCard>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Conflict panel — lives inside the PR card footer
// ═══════════════════════════════════════════════════════════════

function PRConflictPanel({
  direction,
  editorOpen,
  onOpenEditor,
  onResolve,
}: {
  direction: Direction;
  editorOpen: boolean;
  onOpenEditor: () => void;
  onResolve: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        borderTop: `1px solid ${GH.borderMuted}`,
        background: "rgba(248, 81, 73, 0.04)",
      }}
    >
      <div
        style={{
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: GH.red,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: GH.text }}>
              This branch has conflicts that must be resolved
            </div>
            <div
              style={{
                fontSize: 12,
                color: GH.textSec,
                fontFamily: FONT_MONO,
              }}
            >
              Conflicting file: src/settings.ts
            </div>
          </div>
        </div>
        {!editorOpen && (
          <button
            onClick={onOpenEditor}
            style={{
              padding: "5px 14px",
              background: GH.surface2,
              border: `1px solid ${GH.border}`,
              borderRadius: 6,
              color: GH.text,
              fontSize: 13,
              fontFamily: FONT_UI,
              cursor: "pointer",
              fontWeight: 500,
              height: 28,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Resolve conflicts
          </button>
        )}
      </div>
      <AnimatePresence>
        {editorOpen && (
          <ConflictEditorInline direction={direction} onResolve={onResolve} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ConflictEditorInline({
  direction,
  onResolve,
}: {
  direction: Direction;
  onResolve: () => void;
}) {
  // Lines for the editor view; conflict lines get the codelens-style action row.
  const winningLine = direction === "on" ? "  allowNotifications: true," : "  allowNotifications: false,";
  const losingLine = direction === "on" ? "  allowNotifications: false," : "  allowNotifications: true,";

  const actionBtn: React.CSSProperties = {
    padding: "3px 10px",
    background: "rgba(31, 111, 235, 0.15)",
    border: "1px solid rgba(56, 139, 253, 0.4)",
    borderRadius: 6,
    color: "#79c0ff",
    cursor: "pointer",
    fontFamily: FONT_UI,
    fontSize: 11.5,
    fontWeight: 500,
    height: 22,
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  };
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      style={{ overflow: "hidden" }}
    >
      <div
        style={{
          background: "#1e1e1e",
          margin: "0 14px 14px",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #2d2d2d",
          fontFamily: FONT_UI,
        }}
      >
        {/* Tab bar (no chrome title bar — we're inside a PR card, not a fake window) */}
        <div
          style={{
            background: "#252526",
            borderBottom: "1px solid #1e1e1e",
            padding: "0 8px",
            fontSize: 12,
            display: "flex",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              padding: "7px 12px",
              background: "#1e1e1e",
              color: "#fff",
              borderTop: "1px solid #f48771",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: FONT_MONO,
              fontSize: 12,
            }}
          >
            <span style={{ color: "#f48771" }}>●</span> settings.ts
          </div>
        </div>
        {/* Editor body */}
        <div
          style={{
            background: "#1e1e1e",
            color: "#d4d4d4",
            fontFamily: FONT_MONO,
            fontSize: 13,
            lineHeight: 1.6,
            padding: "12px 0 14px",
          }}
        >
          {/* Action toolbar — proper buttons, GitHub-conflict-editor style */}
          <div
            style={{
              padding: "0 16px 10px 60px",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button onClick={onResolve} style={actionBtn}>
              Use current change
            </button>
            <button onClick={onResolve} style={actionBtn}>
              Use incoming change
            </button>
            <button onClick={onResolve} style={actionBtn}>
              Use both changes
            </button>
            <button onClick={onResolve} style={actionBtn}>
              Mark as resolved
            </button>
          </div>
          <EditorLine n={1} text="export const config = {" />
          <EditorLine n={2} text="<<<<<<< HEAD (Current Change)" mark="current-header" />
          <EditorLine n={3} text={winningLine} mark="current" />
          <EditorLine n={4} text="=======" mark="sep" />
          <EditorLine n={5} text={losingLine} mark="incoming" />
          <EditorLine n={6} text=">>>>>>> incoming change" mark="incoming-header" />
          <EditorLine n={7} text="};" />
        </div>
        {/* Status bar */}
        <div
          style={{
            background: "#007acc",
            color: "#fff",
            padding: "3px 12px",
            fontSize: 11,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: FONT_UI,
          }}
        >
          <span>⚠ 1 conflict</span>
          <span>Ln 3, Col 1 · TypeScript</span>
        </div>
      </div>
    </motion.div>
  );
}

function EditorLine({
  n,
  text,
  mark,
}: {
  n: number;
  text: string;
  mark?: "current-header" | "current" | "sep" | "incoming" | "incoming-header";
}) {
  const bg =
    mark === "current-header" || mark === "current"
      ? "rgba(50, 122, 168, 0.18)"
      : mark === "incoming-header" || mark === "incoming"
      ? "rgba(80, 156, 80, 0.18)"
      : "transparent";
  return (
    <div
      style={{
        display: "flex",
        background: bg,
        padding: "0 16px",
      }}
    >
      <span
        style={{
          width: 36,
          textAlign: "right",
          color: "#858585",
          flexShrink: 0,
          userSelect: "none",
          paddingRight: 12,
        }}
      >
        {n}
      </span>
      <span style={{ whiteSpace: "pre", color: mark?.endsWith("header") ? "#858585" : "#d4d4d4" }}>
        {text}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Merge flow — authentic GitHub split-button + commit-message editor
// ═══════════════════════════════════════════════════════════════

type MergeMethod = "merge" | "squash" | "rebase";

const MERGE_METHODS: { v: MergeMethod; main: string; confirm: string; desc: string }[] = [
  {
    v: "merge",
    main: "Create a merge commit",
    confirm: "Confirm merge",
    desc: "All commits from this branch will be added to the base branch via a merge commit.",
  },
  {
    v: "squash",
    main: "Squash and merge",
    confirm: "Confirm squash and merge",
    desc: "The 1 commit from this branch will be combined into one commit in the base branch.",
  },
  {
    v: "rebase",
    main: "Rebase and merge",
    confirm: "Confirm rebase and merge",
    desc: "The 1 commit from this branch will be rebased and added to the base branch.",
  },
];

function MergeSplitButton({
  method,
  onMethodChange,
  onClickMain,
  disabled,
}: {
  method: MergeMethod;
  onMethodChange: (m: MergeMethod) => void;
  onClickMain: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const current = MERGE_METHODS.find((m) => m.v === method)!;

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        display: "inline-flex",
        height: 28,
      }}
    >
      <motion.button
        type="button"
        onClick={onClickMain}
        disabled={disabled}
        whileHover={disabled ? {} : { y: -1 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
        style={{
          padding: "5px 14px",
          background: GH.greenBtn,
          border: `1px solid rgba(240, 246, 252, 0.1)`,
          borderRight: "none",
          borderRadius: "6px 0 0 6px",
          color: "#fff",
          fontSize: 13,
          fontWeight: 500,
          fontFamily: FONT_UI,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          whiteSpace: "nowrap",
          height: 28,
        }}
      >
        {current.main}
      </motion.button>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-label="Choose merge method"
        aria-expanded={open}
        style={{
          padding: "0 8px",
          background: GH.greenBtn,
          border: `1px solid rgba(240, 246, 252, 0.1)`,
          borderLeft: "1px solid rgba(0,0,0,0.18)",
          borderRadius: "0 6px 6px 0",
          color: "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          height: 28,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path
            d="M2 4L5 7L8 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.2, 0, 0, 1] }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              right: 0,
              minWidth: 280,
              background: GH.surface,
              border: `1px solid ${GH.border}`,
              borderRadius: 8,
              boxShadow: "0 16px 48px rgba(1, 4, 9, 0.6)",
              padding: 6,
              zIndex: 50,
              fontFamily: FONT_UI,
            }}
          >
            {MERGE_METHODS.map((opt) => {
              const active = opt.v === method;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => {
                    onMethodChange(opt.v);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    width: "100%",
                    padding: "8px 10px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    color: GH.text,
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontFamily: FONT_UI,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(177, 186, 196, 0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: `1px solid ${active ? GH.blueBtn : GH.border}`,
                      background: active ? GH.blueBtn : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {active && (
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#fff",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: GH.text, marginBottom: 2 }}>
                      {opt.main}
                    </div>
                    <div style={{ color: GH.textSec, fontSize: 11.5, lineHeight: 1.4 }}>
                      {opt.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MergeCommitEditor({
  method,
  prTitle,
  prNumber,
  branch,
  onCancel,
  onConfirm,
}: {
  method: MergeMethod;
  prTitle: string;
  prNumber: number;
  branch: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const defaultTitle =
    method === "merge"
      ? `Merge pull request #${prNumber} from user/${branch}`
      : `${prTitle} (#${prNumber})`;
  const defaultBody = method === "merge" ? prTitle : "";

  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const confirmLabel = MERGE_METHODS.find((m) => m.v === method)!.confirm;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        padding: 14,
        borderTop: `1px solid ${GH.borderMuted}`,
        background: "rgba(46, 160, 67, 0.04)",
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Commit title"
          style={{
            width: "100%",
            background: GH.bg,
            border: `1px solid ${GH.border}`,
            borderRadius: 6,
            padding: "6px 10px",
            color: GH.text,
            fontSize: 13,
            fontFamily: FONT_UI,
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = GH.blueBtn)}
          onBlur={(e) => (e.currentTarget.style.borderColor = GH.border)}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Commit description (optional)"
          placeholder="Add an optional extended description…"
          rows={3}
          style={{
            width: "100%",
            maxHeight: 160,
            background: GH.bg,
            border: `1px solid ${GH.border}`,
            borderRadius: 6,
            padding: "6px 10px",
            color: GH.text,
            fontSize: 12.5,
            fontFamily: FONT_UI,
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
            lineHeight: 1.5,
            overflowY: "auto",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = GH.blueBtn)}
          onBlur={(e) => (e.currentTarget.style.borderColor = GH.border)}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <GHButton variant="primary" onClick={onConfirm}>
          {confirmLabel}
        </GHButton>
        <button
          onClick={onCancel}
          style={{
            padding: "5px 14px",
            background: "transparent",
            border: `1px dashed ${CONDUCTOR.purpleBorder}`,
            borderRadius: 6,
            color: CONDUCTOR.purple,
            fontSize: 13,
            fontFamily: FONT_UI,
            cursor: "pointer",
            height: 28,
          }}
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main demo
// ═══════════════════════════════════════════════════════════════

export function GitToggle() {
  const [s, setS] = useState<DemoState>(INITIAL_STATE);
  const [speed, setSpeed] = useState(1);
  const [ciTotal, setCiTotal] = useState(3); // default 3 of 4 checks
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [showConflictEditor, setShowConflictEditor] = useState(false);
  const [mergeMethod, setMergeMethod] = useState<MergeMethod>("merge");
  const [draftDescription, setDraftDescription] = useState(prDescriptionFor("off"));
  const cascadeRef = useRef<HTMLDivElement>(null);

  // Helpers
  const updateS = (patch: Partial<DemoState>) =>
    setS((prev) => ({ ...prev, ...patch }));

  const reset = () => {
    setS(INITIAL_STATE);
    setShowMergeConfirm(false);
    setShowConflictEditor(false);
    setMergeMethod("merge");
    setDraftDescription(prDescriptionFor("off"));
  };

  // Auto-scroll on any content growth — ResizeObserver on the scroll element
  // catches every height change (stage, CI ticks, review typing, push streaming,
  // conflict banner, ADR expansion, etc.) without needing each as an effect dep.
  const innerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = cascadeRef.current;
    const inner = innerRef.current;
    if (!root || !inner) return;
    let lastHeight = inner.scrollHeight;
    let rafId = 0;
    const ro = new ResizeObserver(() => {
      const h = inner.scrollHeight;
      if (h > lastHeight + 1) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          root.scrollTo({ top: root.scrollHeight, behavior: "smooth" });
        });
      }
      lastHeight = h;
    });
    ro.observe(inner);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  // --- automated background steps ---

  // Push streaming
  const pushLines = pushLinesFor(s.direction);
  useEffect(() => {
    if (s.stage !== "pushing") return;
    if (s.pushLines >= pushLines.length) {
      const t = setTimeout(() => updateS({ stage: "pushed" }), 400 / speed);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => updateS({ pushLines: s.pushLines + 1 }),
      90 / speed
    );
    return () => clearTimeout(t);
  }, [s.stage, s.pushLines, speed, pushLines.length]);

  // CI progresses
  const ciChecks = CI_CHECKS.slice(0, ciTotal);
  useEffect(() => {
    if (s.stage !== "pr_open") return;
    if (s.ciChecksPassed >= ciChecks.length) {
      const t = setTimeout(() => updateS({ stage: "ci_passed" }), 400 / speed);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => updateS({ ciChecksPassed: s.ciChecksPassed + 1 }),
      700 / speed
    );
    return () => clearTimeout(t);
  }, [s.stage, s.ciChecksPassed, ciChecks.length, speed]);

  // Review-bot typing — ~900ms "reviewing" delay before the first character lands.
  const reviewText = reviewCommentFor(s.direction);
  useEffect(() => {
    if (s.stage !== "ci_passed") return;
    if (s.reviewTyped >= reviewText.length) {
      const t = setTimeout(() => updateS({ stage: "reviewed" }), 400 / speed);
      return () => clearTimeout(t);
    }
    const interval = s.reviewTyped === 0 ? 900 / speed : 18 / speed;
    const t = setTimeout(
      () => updateS({ reviewTyped: Math.min(reviewText.length, s.reviewTyped + 2) }),
      interval
    );
    return () => clearTimeout(t);
  }, [s.stage, s.reviewTyped, reviewText, speed]);

  // --- user actions ---

  const onAppleToggleClick = () => {
    if (s.stage === "idle") {
      updateS({
        stage: "modified",
        direction: s.toggleOn ? "off" : "on",
      });
      return;
    }
    // Mid-flow click → a competing change to the same setting lands on main →
    // this PR is now stale. Conflicts can only arise once the PR exists.
    const prOpenStages: Stage[] = ["pr_open", "ci_passed", "reviewed"];
    if (prOpenStages.includes(s.stage) && !s.hasConflict) {
      updateS({ hasConflict: true });
    }
  };

  const onResolveConflict = () => {
    updateS({ hasConflict: false });
    setShowConflictEditor(false);
  };

  const onStage = () => updateS({ stage: "staged" });
  const onCommit = () => updateS({ stage: "committed" });
  const onPush = () => updateS({ stage: "pushing", pushLines: 0 });

  const onOpenPRDraft = () => {
    setDraftDescription(prDescriptionFor(s.direction));
    updateS({ stage: "pr_drafting" });
  };

  const onCreatePR = () => {
    // PR #1 is the primary (turn-off); revert is #2
    const num = s.direction === "off" ? 1 : 2;
    updateS({
      stage: "pr_open",
      prNumber: num,
      ciChecksPassed: 0,
      reviewTyped: 0,
    });
  };

  const onCancelPR = () => {
    updateS({ stage: "pushed" });
  };

  const onClickMerge = () => setShowMergeConfirm(true);

  const onConfirmMerge = () => {
    setShowMergeConfirm(false);
    updateS({ stage: "merging", hasConflict: false });
    setTimeout(() => {
      setS((prev) => ({
        ...prev,
        stage: "merged",
        toggleOn: prev.direction === "on",
        hasConflict: false,
      }));
    }, 600 / speed);
  };

  const onCancelMerge = () => setShowMergeConfirm(false);

  const onRevert = () => {
    // Start a new PR in the opposite direction
    setS({
      ...INITIAL_STATE,
      toggleOn: s.toggleOn,
      direction: s.toggleOn ? "off" : "on",
      stage: "modified",
    });
  };

  // --- derived UI flags ---

  const pending =
    s.stage !== "idle" && s.stage !== "merged";
  const showGitHubZone = s.stage !== "idle";
  const showDiff = ["modified", "staged", "committed", "pushing", "pushed", "pr_drafting"].includes(s.stage);
  const diffStaged = s.stage !== "modified";
  const showCommitInput = s.stage === "staged";
  const showCommitRow = ["committed", "pushing", "pushed", "pr_drafting"].includes(s.stage);
  const showPushOutput = ["pushing", "pushed", "pr_drafting"].includes(s.stage);
  const showPRCard = ["pr_open", "ci_passed", "reviewed", "merging"].includes(s.stage);
  const showMergedBanner = s.stage === "merged";
  const showReview = ["ci_passed", "reviewed", "merging"].includes(s.stage);

  return (
    <DevPanel
      label="Git Toggle"
      defaultOpen={false}
      background={GH.bg}
      controls={
        <>
          <DevSlider
            label="Speed"
            value={speed}
            onChange={setSpeed}
            min={0.5}
            max={2}
            step={0.1}
            format={(v) => `${v.toFixed(1)}x`}
          />
          <DevSlider
            label="CI checks"
            value={ciTotal}
            onChange={(v) => setCiTotal(Math.round(v))}
            min={1}
            max={4}
            step={1}
          />
          <DevDivider />
          <DevButton label="Reset" onClick={reset} variant="primary" />
        </>
      }
    >
      <div
        ref={cascadeRef}
        className="git-toggle-root"
        style={{
          width: "100%",
          height: "100%",
          background: GH.bg,
          color: GH.text,
          fontFamily: FONT_UI,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <style>{`
          .git-toggle-root *::-webkit-scrollbar { width: 8px; height: 8px; }
          .git-toggle-root *::-webkit-scrollbar-track { background: transparent; }
          .git-toggle-root *::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.08); border-radius: 4px;
          }
          .git-toggle-root *::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.16);
          }
        `}</style>

        {/* Apple zone — sticky top */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            padding: "32px 20px 18px",
            position: "sticky",
            top: 0,
            background: `linear-gradient(to bottom, ${GH.bg} 70%, transparent)`,
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          <AppleToggleCard
            on={s.toggleOn}
            pending={pending}
            prNumber={s.prNumber}
            onSwitchClick={onAppleToggleClick}
            switchDisabled={s.stage === "merged" || s.stage === "merging"}
          />
        </div>

        {/* GitHub cascade — flows naturally; whole root scrolls */}
        <div
          style={{
            width: "100%",
            padding: "0 20px 60px",
            display: "flex",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div ref={innerRef} style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>
            <AnimatePresence>
              {showGitHubZone && (
                <motion.div
                  key="zone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  {/* Diff hunk */}
                  {showDiff && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <DiffHunk staged={diffStaged} direction={s.direction} />
                    </motion.div>
                  )}

                  {/* Stage button */}
                  {s.stage === "modified" && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
                    >
                      <GHButton onClick={onStage} variant="primary">
                        Stage changes
                      </GHButton>
                    </motion.div>
                  )}

                  {/* Commit input */}
                  {showCommitInput && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <GHCard style={{ padding: 14 }}>
                        <div style={{ fontSize: 12, color: GH.textSec, marginBottom: 6 }}>
                          Commit message
                        </div>
                        <input
                          type="text"
                          value={s.commitMessage}
                          onChange={(e) => updateS({ commitMessage: e.target.value })}
                          placeholder={prTitleFor(s.direction)}
                          style={{
                            width: "100%",
                            background: GH.bg,
                            border: `1px solid ${GH.border}`,
                            borderRadius: 6,
                            padding: "6px 10px",
                            color: GH.text,
                            fontSize: 13,
                            fontFamily: FONT_MONO,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = GH.blueBtn)}
                          onBlur={(e) => (e.currentTarget.style.borderColor = GH.border)}
                        />
                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <GHButton onClick={onCommit} variant="primary">
                            Commit
                          </GHButton>
                        </div>
                      </GHCard>
                    </motion.div>
                  )}

                  {/* Commit row */}
                  {showCommitRow && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <GHCard style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            border: `2px solid ${CONDUCTOR.purple}`,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: GH.blue }}>
                          {branchCommitShaFor(s.direction)}
                        </span>
                        <span style={{ fontFamily: FONT_UI, fontSize: 13, color: GH.text }}>
                          {s.commitMessage || prTitleFor(s.direction)}
                        </span>
                        <span style={{ color: GH.textMuted, fontSize: 12, marginLeft: "auto" }}>
                          just now
                        </span>
                      </GHCard>
                    </motion.div>
                  )}

                  {/* Push button */}
                  {s.stage === "committed" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                      <GHButton onClick={onPush} variant="primary">
                        Push to origin
                      </GHButton>
                    </motion.div>
                  )}

                  {/* Push output */}
                  {showPushOutput && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <StreamingPushOutput lines={s.pushLines} direction={s.direction} />
                    </motion.div>
                  )}

                  {/* Create PR button */}
                  {s.stage === "pushed" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                      <GHButton onClick={onOpenPRDraft} variant="primary">
                        Create pull request
                      </GHButton>
                    </motion.div>
                  )}

                  {/* PR draft — inline editor */}
                  <AnimatePresence>
                    {s.stage === "pr_drafting" && (
                      <PRDraftCard
                        title={prTitleFor(s.direction)}
                        description={draftDescription}
                        onChange={setDraftDescription}
                        onCancel={onCancelPR}
                        onSubmit={onCreatePR}
                      />
                    )}
                  </AnimatePresence>

                  {/* PR card */}
                  {showPRCard && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <GHCard>
                        <div style={{ padding: "14px 16px" }}>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 600,
                              color: GH.text,
                              marginBottom: 4,
                            }}
                          >
                            {prTitleFor(s.direction)}{" "}
                            <span style={{ color: GH.textMuted, fontWeight: 400 }}>#{s.prNumber}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, color: GH.textSec }}>
                            <span
                              style={{
                                background: s.stage === "merging" ? CONDUCTOR.purpleDeep : GH.greenBtn,
                                color: "#fff",
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontWeight: 500,
                                fontSize: 11,
                              }}
                            >
                              {s.stage === "merging" ? "Merging…" : "Open"}
                            </span>
                            <span><strong style={{ color: GH.text }}>user</strong> wants to merge 1 commit into</span>
                            <BranchChip name="main" />
                            <span>from</span>
                            <BranchChip name={branchFor(s.direction)} />
                          </div>
                        </div>

                        {/* CI checks */}
                        {ciChecks.map((c, i) => (
                          <CIRow
                            key={c.name}
                            check={c}
                            passed={i < s.ciChecksPassed || s.stage === "ci_passed" || s.stage === "reviewed" || s.stage === "merging"}
                          />
                        ))}

                        {/* Review — short loading state, then typed-in comment */}
                        {showReview && s.reviewTyped === 0 ? (
                          <ReviewBotLoading />
                        ) : showReview ? (
                          <ReviewBotComment text={reviewText} charsShown={s.reviewTyped} />
                        ) : null}

                        {/* Footer: conflict UI > merge editor > normal action row */}
                        <AnimatePresence mode="wait">
                          {s.hasConflict ? (
                            <PRConflictPanel
                              key="conflict"
                              direction={s.direction}
                              editorOpen={showConflictEditor}
                              onOpenEditor={() => setShowConflictEditor(true)}
                              onResolve={onResolveConflict}
                            />
                          ) : showMergeConfirm ? (
                            <MergeCommitEditor
                              key="merge-editor"
                              method={mergeMethod}
                              prTitle={prTitleFor(s.direction)}
                              prNumber={s.prNumber}
                              branch={branchFor(s.direction)}
                              onCancel={onCancelMerge}
                              onConfirm={onConfirmMerge}
                            />
                          ) : s.stage !== "merging" ? (
                            <motion.div
                              key="action-row"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              style={{
                                padding: 14,
                                borderTop: `1px solid ${GH.borderMuted}`,
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                justifyContent: "space-between",
                                background:
                                  s.stage === "reviewed"
                                    ? "rgba(46, 160, 67, 0.04)"
                                    : "transparent",
                              }}
                            >
                              <span style={{ fontSize: 12, color: GH.textSec }}>
                                {s.stage === "pr_open"
                                  ? "Waiting on CI to pass…"
                                  : s.stage === "ci_passed"
                                  ? "Waiting on review…"
                                  : s.stage === "reviewed"
                                  ? "All checks passed · 1 approval"
                                  : ""}
                              </span>
                              <MergeSplitButton
                                method={mergeMethod}
                                onMethodChange={setMergeMethod}
                                onClickMain={onClickMerge}
                                disabled={s.stage !== "reviewed"}
                              />
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </GHCard>
                    </motion.div>
                  )}

                  {/* Merged banner */}
                  {showMergedBanner && <MergedBanner direction={s.direction} />}

                  {/* Commit timeline + revert */}
                  {showMergedBanner && (
                    <CommitTimelineRow direction={s.direction} onRevert={onRevert} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </DevPanel>
  );
}
