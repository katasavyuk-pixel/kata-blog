import { formatDate } from "@/lib/format";
import {
  COST_MODELS_OFFERED,
  COST_PRICE_SOURCES,
  COST_PRICES_CHECKED,
} from "@/lib/cost-model";

const dolares = (n: number) =>
  `${n.toLocaleString("es-ES", { minimumFractionDigits: n < 1 ? 2 : 0, maximumFractionDigits: 2 })} $`;

/**
 * The calculator's price list as a table (server component).
 *
 * It reads the same rows the calculator computes with, so an article can show
 * the prices without a second copy that goes stale on its own. The date and the
 * two sources are part of the table, not a footnote somebody may drop.
 */
export function PreciosModelos() {
  return (
    <figure>
      <div className="overflow-x-auto" tabIndex={0} role="group">
        <table>
          <thead>
            <tr>
              <th scope="col">Modelo</th>
              <th scope="col">Entrada</th>
              <th scope="col">Salida</th>
              <th scope="col">Salida ÷ entrada</th>
            </tr>
          </thead>
          <tbody>
            {COST_MODELS_OFFERED.map((m) => (
              <tr key={m.id}>
                <td>{m.label}</td>
                <td>{dolares(m.in)}</td>
                <td>{dolares(m.out)}</td>
                <td>× {m.out / m.in}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>
        Precio de lista por millón de tokens, sin caché ni descuentos, leído el{" "}
        {formatDate(COST_PRICES_CHECKED)} en las páginas de precios de{" "}
        {COST_PRICE_SOURCES.map((fuente, i) => (
          <span key={fuente.url}>
            {i > 0 ? " y " : ""}
            <a href={fuente.url} target="_blank" rel="noopener noreferrer">
              {fuente.proveedor}
            </a>
          </span>
        ))}
        . El de Claude Haiku 5.5 vale para peticiones de hasta 100.000 tokens.
      </figcaption>
    </figure>
  );
}
