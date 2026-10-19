import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ACTIVOS } from '@/lib/catalogo';
import { COLORES_DE_OTRAS_MARCAS, LOGOS_DE_SKILL } from '@/config/logos';

/**
 * The marketplace's logos (2026-10-14): one colour per skill, chosen by Kata to
 * give the catalogue a face, on three conditions that a new skill could break
 * without anyone noticing — it has a logo, its white glyph reads, and its
 * colour is not another brand's (the brands do not mix).
 */

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

const luminancia = (hex: string) => {
  const [r, g, b] = rgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contraste = (a: string, b: string) => {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
};

const tono = (hex: string) => {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

const distanciaDeTono = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

describe('logos del marketplace', () => {
  test('cada skill instalable tiene su logo', () => {
    for (const activo of ACTIVOS) {
      assert.ok(LOGOS_DE_SKILL[activo.id], `«${activo.title}» no tiene logo en config/logos.ts.`);
    }
  });

  test('el glifo blanco se lee sobre cada color', () => {
    for (const [id, { color }] of Object.entries(LOGOS_DE_SKILL)) {
      assert.ok(contraste('#ffffff', color) >= 4.5, `${id}: el blanco sobre ${color} no llega a 4,5:1.`);
    }
  });

  test('ningún color se acerca al de otra marca', () => {
    for (const [id, { color }] of Object.entries(LOGOS_DE_SKILL)) {
      for (const [marca, suyo] of Object.entries(COLORES_DE_OTRAS_MARCAS)) {
        assert.ok(
          distanciaDeTono(tono(color), tono(suyo)) >= 25,
          `${id}: ${color} queda a menos de 25° del acento de ${marca} (${suyo}).`,
        );
      }
    }
  });

  test('dos skills no comparten color', () => {
    const colores = Object.values(LOGOS_DE_SKILL).map((logo) => logo.color.toLowerCase());
    assert.equal(new Set(colores).size, colores.length);
  });
});
