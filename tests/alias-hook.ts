/**
 * Resuelve el alias `@/` de tsconfig para el runner de tests de Node.
 *
 * Node ejecuta los .ts con --experimental-strip-types, que borra tipos pero no
 * lee `compilerOptions.paths`. Sin esto, cualquier módulo que importe `@/lib/…`
 * —es decir, casi todos— es intestable sin meter un bundler o vitest.
 *
 * Se usa `module.registerHooks` (síncrono, en el mismo hilo) en vez de un loader
 * con `--loader`: no hace falta worker aparte y no cambia nada del build de
 * Next, que sigue resolviendo el alias por su cuenta.
 */
import * as nodeModule from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * `module.registerHooks` existe en Node 22.15+ pero todavía no en la versión de
 * @types/node que fija este proyecto. Se declara aquí en vez de subir los tipos:
 * tocar @types/node en un repo Next.js arrastra cambios en toda la superficie
 * de tipos, y esto es una utilidad de tests.
 */
type ResultadoResolve = { url: string; shortCircuit?: boolean };
type ContextoResolve = { parentURL?: string | undefined; conditions?: string[] };
type Siguiente = (especificador: string, contexto: ContextoResolve) => ResultadoResolve;

const registerHooks = (
  nodeModule as unknown as {
    registerHooks?: (h: {
      resolve: (e: string, c: ContextoResolve, n: Siguiente) => ResultadoResolve;
    }) => void;
  }
).registerHooks;

if (!registerHooks) {
  throw new Error('Node 22.15+ es necesario para los tests: module.registerHooks no está disponible.');
}

const RAIZ = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');

/** Igual que el bundler: prueba el fichero tal cual, luego .ts/.tsx, luego /index. */
function resolverAlias(especificador: string): string | null {
  if (!especificador.startsWith('@/')) return null;
  const base = resolvePath(RAIZ, 'src', especificador.slice(2));
  const candidatos = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
  for (const c of candidatos) {
    if (existsSync(c)) return pathToFileURL(c).href;
  }
  return null;
}

registerHooks({
  resolve(especificador: string, contexto: ContextoResolve, siguiente: Siguiente): ResultadoResolve {
    const url = resolverAlias(especificador);
    if (url) return { url, shortCircuit: true };
    return siguiente(especificador, contexto);
  },
});
