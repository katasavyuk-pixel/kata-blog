/**
 * The signup gift (Kata, 2026-10-16: «algo de alto valor que les sirva a todos,
 * tengan negocio o no»): «Recupera horas de tu semana con IA», two pieces.
 *
 * - The sheet of your week (`hoja`): a spreadsheet in the private
 *   `lead-magnets` bucket, served by /api/download like every other resource
 *   (row in supabase/seeds/resources.sql, source in lead-magnets/recupera-horas/).
 *   The first welcome email carries it to every new subscriber.
 * - Your profile for the AI (`ficha`): a page anyone can open, with the template
 *   to paste into ChatGPT, Claude or Gemini.
 *
 * The copy lives here so the page, the welcome email and the forms say the same.
 */
export const REGALO = {
  titulo: "Recupera horas de tu semana con IA",
  resumen:
    "Una hoja que te dice cuántas horas al año te come cada tarea repetitiva y cuáles le puedes pasar ya a la IA, y una ficha para que la IA trabaje a tu manera.",
  hoja: {
    /** `public.resources.slug`: the row and the file must exist before this is offered. */
    slug: "hoja-de-tu-semana",
    titulo: "La hoja de tu semana",
  },
  ficha: {
    titulo: "Tu ficha para la IA",
    href: "/herramientas/ficha-para-tu-ia",
  },
} as const;

/** The template the reader copies, fills in once and pastes. About 900 characters empty. */
export const FICHA = `Sobre mí
- Me llamo [tu nombre]. Vivo en [ciudad o país].
- Me dedico a [tu trabajo o tu negocio, en una frase].
- Trato sobre todo con [clientes, compañeros, tu jefe, proveedores...].
- Uso cada día [correo, Excel, WhatsApp, el programa de facturas...].

Para qué te voy a usar
- Las tareas que más se me repiten: [las 3 primeras de la hoja de tu semana].
- Lo que más me cuesta: [escribir, ordenar datos, resumir, decidir...].

Cómo quiero que me respondas
- En español de España, tuteando y con frases cortas.
- La conclusión primero. Los detalles, después y solo si hacen falta.
- Si te falta un dato, pregúntamelo antes de inventarlo.
- Si no estás seguro de algo, dilo. Prefiero «no lo sé» a un dato inventado.
- Cuando escribas en mi nombre, usa un tono [cercano / formal / directo].

Lo que no quiero
- [Por ejemplo: listas larguísimas, frases de relleno, palabras en inglés.]`;

/**
 * Where it goes in each assistant. Menus move: read again in each one's help
 * the day anything here is published or changed («se verifica el mismo día»).
 */
export const DONDE_SE_PEGA = {
  comprobado: "2026-10-16",
  asistentes: [
    {
      nombre: "ChatGPT",
      pasos:
        "Ajustes → Personalización → Instrucciones personalizadas. En el móvil, Ajustes → Personalizar ChatGPT. Vale para todos tus chats.",
      fuente: "https://help.openai.com/en/articles/8096356-chatgpt-custom-instructions",
    },
    {
      nombre: "Claude",
      pasos:
        "Ajustes → «Instrucciones para Claude» (en algunas versiones está dentro de Ajustes → General). Vale para todas tus conversaciones.",
      fuente: "https://support.claude.com/en/articles/10185728-understanding-claude-s-personalization-features",
    },
    {
      nombre: "Gemini",
      pasos:
        "Menú → Ajustes y ayuda → Contexto personal → «Tus instrucciones para Gemini» → Añadir. Según tu país y tu cuenta puede no aparecerte.",
      fuente: "https://support.google.com/gemini/answer/16598625?hl=es",
    },
  ],
} as const;

/** What to say to the AI about the first task of the sheet. */
export const PRIMERA_TAREA =
  "Hago esta tarea [cada cuánto]: [la tarea]. Me lleva [minutos]. Lo que me llega es [qué recibes] y lo que tiene que salir es [qué entregas]. ¿Qué parte puedes hacer tú, y cómo te lo paso cada vez para que lo hagas igual?";
