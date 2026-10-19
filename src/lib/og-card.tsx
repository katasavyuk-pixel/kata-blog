import type { ReactElement } from "react";
import { siteConfig } from "@/config/site";

/**
 * Satori (next/og) cannot read our CSS tokens, so the palette is literal here
 * and nowhere else. Same values as `@theme` in globals.css.
 */
const COLOR = {
  bg: "#0b0608",
  fg: "#f6efec",
  chrome: "#d2c8c5",
  accent: "#e11423",
  onAccent: "#ffffff",
};

const BAND_HEIGHT = 112;

/**
 * The share card of the home and of every article: flat warm black, the title,
 * and the page's one red band at the foot — the same hierarchy DESIGN.md gives
 * the site. No glow and no vignette: that was the cinematic look the design
 * system retired, and it survived here because nothing renders these images in
 * the browser where someone would notice.
 */
export function ogCard({ title, band }: { title: string; band: string }): ReactElement {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: COLOR.bg,
        color: COLOR.fg,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flexGrow: 1,
          padding: "72px 80px 56px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: COLOR.chrome,
            letterSpacing: "0.08em",
          }}
        >
          {siteConfig.name}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            maxWidth: "1000px",
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: BAND_HEIGHT,
          padding: "0 80px",
          background: COLOR.accent,
          color: COLOR.onAccent,
          fontSize: 28,
        }}
      >
        {band}
      </div>
    </div>
  );
}
