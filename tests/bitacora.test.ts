import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { bitacora } from '#site/content';
import sitemap from '@/app/sitemap';
import { ENLACE_BITACORA, PROYECTOS, PROYECTO_KEYS, TIPOS_ENTRADA, TIPO_ENTRADA_KEYS } from '@/config/bitacora';
import { navLinks, siteConfig } from '@/config/site';
import { entradasBitacora, entradasEntre, porMes, ultimaEntrada } from '@/lib/bitacora';
import { allPosts } from '@/lib/posts';

/**
 * La bitácora (2026-10-15): lo que Kata construye, fecha a fecha. Cada entrada
 * enlaza a donde se comprueba; una entrada que apunta a una página que no
 * existe es una promesa, no un registro.
 */
describe('la bitácora', () => {
  test('cada entrada enlaza a una página que existe o a una URL pública', () => {
    const paginas = new Set(sitemap().map((entry) => entry.url.replace(siteConfig.url, '') || '/'));
    for (const post of allPosts) paginas.add(post.permalink);
    for (const entrada of bitacora) {
      assert.match(entrada.enlace, ENLACE_BITACORA, entrada.slug);
      assert.doesNotMatch(entrada.enlace, /github\.com\/katasavyuk-pixel\/blog-newsletter/, `${entrada.slug}: ese repositorio es privado.`);
      if (entrada.draft || entrada.enlace.startsWith('http')) continue;
      const ruta = entrada.enlace.split('#')[0] || '/';
      assert.ok(paginas.has(ruta), `${entrada.slug} enlaza ${ruta}, que no está publicada.`);
    }
  });

  test('vocabulario cerrado, con su etiqueta y su glifo', () => {
    for (const p of PROYECTO_KEYS) assert.ok(PROYECTOS[p]);
    for (const t of TIPO_ENTRADA_KEYS) assert.ok(TIPOS_ENTRADA[t].label && TIPOS_ENTRADA[t].glifo);
  });

  test('las publicadas van de la más nueva a la más vieja, sin borradores', () => {
    assert.ok(entradasBitacora.length > 0);
    assert.ok(entradasBitacora.every((e) => !e.draft));
    for (let i = 1; i < entradasBitacora.length; i++) {
      assert.ok(entradasBitacora[i - 1].fecha >= entradasBitacora[i].fecha);
    }
    assert.equal(ultimaEntrada(), entradasBitacora[0]);
    assert.equal(ultimaEntrada()?.permalink, `/bitacora#${entradasBitacora[0].slug}`);
  });

  test('por meses, y una semana incluye su último día', () => {
    const meses = porMes(entradasBitacora).map((m) => m.mes);
    assert.deepEqual(meses, [...meses].sort().reverse());
    const dia = entradasBitacora[0].fecha.slice(0, 10);
    assert.ok(entradasEntre('2000-01-01', dia).some((e) => e.slug === entradasBitacora[0].slug));
  });

  test('está en la cabecera, antes de «Sobre mí»', () => {
    const labels: string[] = navLinks.map((l) => l.label);
    assert.equal(labels.indexOf('Bitácora') + 1, labels.indexOf('Sobre mí'));
  });
});
