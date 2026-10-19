"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  hue: number; // index into the sprite palette
};

/**
 * Ember palette — crimson family only, brand discipline (one color).
 *
 * Read from the @theme tokens at runtime instead of hardcoded: a canvas cannot
 * use Tailwind classes, so when the palette moved to the video identity these
 * literals were the one surface that silently kept painting the retired red.
 * Order is load-bearing — index 3 is the pale highlight (see `hue` below).
 */
const PALETTE_TOKENS = [
  "--color-accent",
  "--color-accent-ink",
  "--color-accent-strong",
  "--color-muted",
];

/** Mirrors globals.css; used only if a token is missing or is not plain hex. */
const PALETTE_FALLBACK = ["#e11423", "#ff3b4e", "#7a0c18", "#c2a7ac"];

/** The sprite gradient appends alpha as hex, so any other notation is unusable. */
const HEX6 = /^#[0-9a-f]{6}$/i;

function readPalette(): string[] {
  const styles = getComputedStyle(document.documentElement);
  return PALETTE_TOKENS.map((token, i) => {
    const value = styles.getPropertyValue(token).trim();
    return HEX6.test(value) ? value : PALETTE_FALLBACK[i];
  });
}

const DPR_CAP = 2;
const BURST_DAMPING = 0.965; // initial explosion settles into drift in ~2s

/** Pre-render one glowing dot per palette color — shadowBlur per frame is too slow. */
function makeSprites(palette: string[]): HTMLCanvasElement[] {
  return palette.map((color) => {
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const ctx = sprite.getContext("2d")!;
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color + "aa");
    g.addColorStop(1, color + "00");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return sprite;
  });
}

/**
 * Site-wide ember field — the "explosión del universo" storyboard made
 * ambient: red particles burst from a spark on load, then settle into a slow
 * drifting, twinkling field. Fixed overlay below the vignette/grain layers
 * (z-30 < 40/41), pointer-events none. Renders nothing under reduced motion
 * (the static grain + vignette remain as the calm fallback).
 */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sprites = makeSprites(readPalette());
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = () => {
      // Density scales with viewport; capped for perf (~60 mobile / ~140 desktop).
      const count = Math.min(140, Math.max(50, Math.floor((width * height) / 11000)));
      const cx = width * 0.5;
      const cy = height * 0.35;
      particles = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const burst = 2 + Math.random() * 9; // initial radial burst velocity
        return {
          x: cx,
          y: cy,
          vx: Math.cos(angle) * burst,
          vy: Math.sin(angle) * burst,
          size: 0.6 + Math.random() * 1.9 + (Math.random() < 0.06 ? 1.6 : 0),
          alpha: 0.25 + Math.random() * 0.5,
          twinkleSpeed: 0.4 + Math.random() * 1.4,
          twinklePhase: Math.random() * Math.PI * 2,
          hue: Math.random() < 0.08 ? 3 : Math.floor(Math.random() * 3),
        };
      });
    };

    const tick = (t: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      const time = t / 1000;
      for (const p of particles) {
        // Burst velocity damps into an ember drift (slight upward bias).
        p.vx = p.vx * BURST_DAMPING + (Math.random() - 0.5) * 0.02;
        p.vy = p.vy * BURST_DAMPING + (Math.random() - 0.52) * 0.02;
        p.x += p.vx;
        p.y += p.vy;
        // Wrap around edges so the field never empties.
        if (p.x < -8) p.x = width + 8;
        if (p.x > width + 8) p.x = -8;
        if (p.y < -8) p.y = height + 8;
        if (p.y > height + 8) p.y = -8;

        const twinkle = 0.6 + 0.4 * Math.sin(time * p.twinkleSpeed + p.twinklePhase);
        ctx.globalAlpha = p.alpha * twinkle;
        const d = p.size * 6;
        ctx.drawImage(sprites[p.hue], p.x - d / 2, p.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running) raf = requestAnimationFrame(tick);
      else cancelAnimationFrame(raf);
    };

    resize();
    spawn();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30"
    />
  );
}
