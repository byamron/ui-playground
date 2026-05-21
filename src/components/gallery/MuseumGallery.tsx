import { Link } from "react-router-dom";
import { useState } from "react";
import { galleryDemos, roman } from "./demos";
import "./museum-themes.css";

const SERIF = `"Iowan Old Style", "Charter", "Georgia", "Times New Roman", serif`;
const MONO = `"SF Mono", "JetBrains Mono", ui-monospace, monospace`;

export type MuseumAppearance = "light" | "dark";
export type MuseumAccent =
  | "sky"
  | "table"
  | "portrait"
  | "pizza"
  | "vineyard";

export function MuseumGallery({
  appearance,
  accent,
}: {
  appearance: MuseumAppearance;
  accent: MuseumAccent;
}) {
  return (
    <div
      className="museum-root"
      data-appearance={appearance}
      data-accent={accent}
      style={{
        height: "100%",
        width: "100%",
        background: "var(--bg)",
        color: "var(--text-dark)",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        transition: "background-color 0.4s ease, color 0.4s ease",
      }}
    >
      {/* Soft vignette — subtle in light, more present in dark */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, var(--vignette-stop-1) 55%, var(--vignette-stop-2) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          maxWidth: 1280,
          margin: "0 auto",
          padding: "72px 56px 96px",
        }}
      >
        <Header />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 28,
            marginTop: 56,
          }}
        >
          {galleryDemos.map((demo, i) => (
            <SpecimenCard key={demo.path} demo={demo} index={i} />
          ))}
        </div>
        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--text-grey)",
        }}
      >
        <span>Vol. I · MMXXVI</span>
        <span>Catalogue of Interactions</span>
        <span>{galleryDemos.length} specimens</span>
      </div>
      <div style={{ height: 1, background: "var(--rule)" }} />

      {/* Swatch dot — the portfolio's signature accent indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 4,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "var(--swatch)",
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--text-grey)",
          }}
        >
          The Playground Collection
        </span>
      </div>

      <h1
        style={{
          fontFamily: SERIF,
          fontWeight: 400,
          fontSize: 56,
          lineHeight: 1.05,
          letterSpacing: "-0.015em",
          marginTop: 8,
          color: "var(--text-dark)",
        }}
      >
        A Cabinet of{" "}
        <em style={{ fontStyle: "italic" }}>Interactions</em>
      </h1>
      <p
        style={{
          fontFamily: SERIF,
          fontSize: 17,
          lineHeight: 1.55,
          color: "var(--text-medium)",
          maxWidth: 620,
          marginTop: 4,
        }}
      >
        Curated specimens of motion, gesture, and small product fictions.
        Hover the plate to bring the case lighting up.
      </p>
      <div
        style={{
          height: 1,
          background: "var(--rule-soft)",
          marginTop: 36,
        }}
      />
    </header>
  );
}

function SpecimenCard({
  demo,
  index,
}: {
  demo: (typeof galleryDemos)[number];
  index: number;
}) {
  const [hover, setHover] = useState(false);

  return (
    <Link
      to={demo.path}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        position: "relative",
      }}
    >
      {/* Case lighting — radial wash keyed to the demo's own hue */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -1,
          borderRadius: 4,
          background: `radial-gradient(120% 80% at 50% -10%, hsla(${demo.hue}, 55%, 60%, ${hover ? 0.24 : 0.08}) 0%, transparent 55%)`,
          pointerEvents: "none",
          transition: "background 0.5s ease",
          mixBlendMode: "screen",
        }}
      />
      <article
        style={{
          position: "relative",
          background: hover ? "var(--plate-bg-hover)" : "var(--plate-bg)",
          border: `1px solid ${hover ? "var(--rule)" : "var(--rule-soft)"}`,
          borderRadius: 3,
          padding: "28px 28px 24px",
          minHeight: 260,
          display: "flex",
          flexDirection: "column",
          transition:
            "border-color 0.4s ease, background-color 0.4s ease, transform 0.5s ease",
          transform: hover ? "translateY(-1px)" : "translateY(0)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        {/* Top plate row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
          }}
        >
          <span>№ {roman(index)}</span>
          <span>{demo.catalogue}</span>
        </div>

        <div
          style={{
            height: 1,
            background: "var(--rule-soft)",
            margin: "16px 0 20px",
          }}
        />

        {/* Title */}
        <h2
          style={{
            fontFamily: SERIF,
            fontWeight: 400,
            fontSize: 28,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            color: "var(--text-dark)",
            marginBottom: 10,
          }}
        >
          {demo.title}
        </h2>

        {/* Latin family — italicized */}
        <p
          style={{
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: 14,
            color: "var(--text-grey)",
            marginBottom: 22,
          }}
        >
          {demo.family}
        </p>

        {/* Description */}
        <p
          style={{
            fontFamily: SERIF,
            fontSize: 14.5,
            lineHeight: 1.55,
            color: "var(--text-medium)",
            marginTop: "auto",
          }}
        >
          {demo.description}
        </p>

        {/* Bottom plate hint */}
        <div
          style={{
            height: 1,
            background: "var(--rule-soft)",
            marginTop: 22,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
            marginTop: 12,
          }}
        >
          <span>Collected · MMXXVI</span>
          <span
            style={{
              color: hover ? "var(--text-dark)" : "var(--ink-faint)",
              transition: "color 0.3s ease",
            }}
          >
            View specimen ↗
          </span>
        </div>
      </article>
    </Link>
  );
}

function Footer() {
  return (
    <footer
      style={{
        marginTop: 64,
        paddingTop: 24,
        borderTop: "1px solid var(--rule-soft)",
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--ink-faint)",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <span>UI Playground · est. MMXXVI</span>
      <span>Hover any plate to illuminate</span>
    </footer>
  );
}
