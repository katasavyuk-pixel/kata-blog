/**
 * The date of the deploy a page comes from, for the footer's «Versión del …».
 *
 * next.config.ts fixes it once, when the build starts, and inlines it into the
 * server and client bundles alike (`env.FECHA_DE_VERSION`). The footer renders
 * inside a client component, and it used to print `new Date()`: a page built one
 * day and opened the next said one date on the server and another in the
 * browser, so every visit failed hydration (React #418) and React rendered the
 * page again in the browser. Madrid time, so both print the same day.
 */
export function fechaDeVersion(iso: string | undefined = process.env.FECHA_DE_VERSION): {
  anio: string;
  dia: string;
} {
  if (!iso) throw new Error("Falta FECHA_DE_VERSION: la define next.config.ts al construir.");
  const fecha = new Date(iso);
  const zona = { timeZone: "Europe/Madrid" } as const;
  return {
    anio: fecha.toLocaleDateString("es-ES", { ...zona, year: "numeric" }),
    dia: fecha.toLocaleDateString("es-ES", { ...zona, day: "numeric", month: "short", year: "numeric" }),
  };
}
