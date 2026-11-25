#!/usr/bin/env python3
"""Calcula una serie mensual reproducible de recomendaciones en asistentes de IA."""

import argparse
import csv
import io
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ASISTENTES = ("chatgpt", "gemini", "perplexity")
COLUMNAS = (
    "mes", "fecha", "asistente", "pregunta_id", "pregunta", "mencionado",
    "posicion", "competidores", "fuentes", "datos_correctos", "notas",
)
COLUMNA_ARCHIVO = "archivo_respuesta"
COLUMNA_TEXTO = "respuesta"
CAMPOS_LIBRES = (
    "mes", "fecha", "pregunta", "competidores", "fuentes", "notas",
    COLUMNA_ARCHIVO, COLUMNA_TEXTO,
)
RUBRICA_ACTUAL = """Cada pregunta puntúa de 0 a 3; P10 comprueba los datos y no puntúa. Las respuestas no obtenidas se dejan vacías y no entran en el cálculo.

| Puntos | Qué significa |
|---|---|
| 0 | El negocio no aparece en la respuesta. |
| 1 | Aparece, pero no está entre los tres primeros; también si no se puede determinar su posición. |
| 2 | Aparece en segundo o tercer lugar. |
| 3 | Aparece en primer lugar o es el único recomendado. |
"""


def normalizar_filas(filas):
    """Normaliza los valores escritos a mano antes de validarlos."""
    for fila in filas:
        for campo in CAMPOS_LIBRES:
            fila[campo] = (fila.get(campo) or "").strip()
        fila["asistente"] = (fila.get("asistente") or "").strip().lower()
        fila["pregunta_id"] = (fila.get("pregunta_id") or "").strip().upper()
        for campo in ("mencionado", "datos_correctos"):
            valor = (fila.get(campo) or "").strip().lower()
            fila[campo] = valor.replace("í", "i")
        posicion = (fila.get("posicion") or "").strip()
        coincidencia = re.fullmatch(r"\s*(\d+)\s*[º°ª.]?\s*", posicion)
        fila["posicion"] = coincidencia.group(1) if coincidencia else posicion
    return filas


def validar(filas):
    """Reúne errores de entrada antes de calcular o crear el informe."""
    errores = []
    for numero, fila in enumerate(filas, start=2):
        problemas = []
        mes = fila.get("mes", "").strip()
        if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", mes):
            problemas.append("mes debe tener formato AAAA-MM")
        fecha = fila.get("fecha", "").strip()
        try:
            date.fromisoformat(fecha)
        except ValueError:
            problemas.append("fecha debe tener formato AAAA-MM-DD")
        asistente = fila.get("asistente", "")
        if asistente not in ASISTENTES:
            problemas.append("asistente desconocido (usa chatgpt, gemini o perplexity)")
        if fila.get("pregunta_id", "") not in {f"P{i:02d}" for i in range(1, 11)}:
            problemas.append("pregunta_id debe estar entre P01 y P10")
        mencionado = fila.get("mencionado", "")
        if mencionado not in {"", "si", "no"}:
            problemas.append("mencionado debe ser si o no (o vacío si falta la respuesta)")
        posicion = fila.get("posicion", "")
        if posicion and (not posicion.isdigit() or int(posicion) < 1):
            problemas.append("posicion debe ser un entero positivo o estar vacía")
        if fila.get("datos_correctos", "") not in {"", "si", "no", "parcial"}:
            problemas.append("datos_correctos debe ser si, no o parcial")
        if problemas:
            errores.append(f"Fila {numero}: " + "; ".join(problemas))
    return errores


def _dentro_de(ruta, raiz):
    try:
        ruta.resolve().relative_to(raiz.resolve())
        return True
    except ValueError:
        return False


def ruta_archivo_respuesta(fila, base):
    """Resuelve archivo_respuesta respecto al CSV o al directorio de trabajo."""
    relativo = (fila.get(COLUMNA_ARCHIVO) or "").strip()
    if not relativo:
        return None
    bruto = Path(relativo)
    if bruto.is_absolute():
        candidato = bruto.resolve()
    else:
        por_csv = (base / relativo).resolve()
        por_cwd = (Path.cwd() / relativo).resolve()
        candidato = por_csv if por_csv.is_file() or not por_cwd.is_file() else por_cwd
    bases = (Path(base).resolve(), Path.cwd().resolve())
    if not any(_dentro_de(candidato, raiz) for raiz in bases):
        raise ValueError(
            f"La ruta de archivo_respuesta queda fuera del directorio de trabajo: {relativo}"
        )
    return candidato


def texto_respuesta(fila, base):
    """Devuelve el texto completo desde el archivo o, si no hay, desde la columna respuesta."""
    ruta = ruta_archivo_respuesta(fila, base)
    if ruta is not None:
        if not ruta.is_file():
            raise FileNotFoundError(
                f"no encuentro el archivo de respuesta {fila.get(COLUMNA_ARCHIVO)}"
            )
        return ruta.read_text(encoding="utf-8")
    return (fila.get(COLUMNA_TEXTO) or "").strip()


def fila_tiene_respuesta_obtenida(fila):
    return fila.get("mencionado", "") in {"si", "no"} or fila.get("datos_correctos", "") in {"si", "no", "parcial"}


def errores_rescore(filas, base, mes=None):
    """Exige el texto de cada respuesta obtenida para poder volver a puntuar."""
    errores = []
    for numero, fila in enumerate(filas, start=2):
        if mes and fila.get("mes") != mes:
            continue
        if not fila_tiene_respuesta_obtenida(fila):
            continue
        try:
            texto = texto_respuesta(fila, base)
        except (FileNotFoundError, ValueError, OSError, UnicodeError) as error:
            errores.append(f"Fila {numero}: {error}")
            continue
        if not texto:
            errores.append(
                f"Fila {numero}: falta el texto de la respuesta "
                f"(columna {COLUMNA_ARCHIVO} o {COLUMNA_TEXTO}) y no se puede volver a puntuar sin él"
            )
    return errores


def generar_pack_rescore(filas, negocio, mes, base):
    """Prepara un documento con la rúbrica actual y el texto de cada respuesta."""
    if mes:
        meses = [mes]
        seleccion = [fila for fila in filas if fila["mes"] == mes]
    else:
        meses = sorted({fila["mes"] for fila in filas})
        seleccion = list(filas)
    lineas = [
        f"# Re-puntuación del histórico: {negocio}",
        "",
        "Este documento sirve para volver a aplicar la rúbrica **sin repetir las consultas**.",
        "Revisa cada respuesta, actualiza en el CSV las columnas `mencionado`, `posicion`, `competidores`, `fuentes` y `datos_correctos`, y después ejecuta `scripts/puntuar.py` sin `--rescore`.",
        "",
        "## Rúbrica actual",
        "",
        RUBRICA_ACTUAL.strip(),
        "",
    ]
    for mes_actual in meses:
        lineas.extend([f"## Respuestas de {mes_actual}", ""])
        for fila in (item for item in seleccion if item["mes"] == mes_actual):
            archivo = (fila.get(COLUMNA_ARCHIVO) or "").strip() or "columna respuesta"
            lineas.extend([
                f"### {fila['asistente']} · {fila['pregunta_id']} · {fila['fecha']}",
                "",
                f"- Pregunta: {fila['pregunta']}",
            ])
            if not fila_tiene_respuesta_obtenida(fila):
                lineas.extend([
                    "- Sin respuesta obtenida en esta medición; no hay texto que volver a puntuar.",
                    "",
                ])
                continue
            texto = texto_respuesta(fila, base)
            lineas.extend([
                f"- Puntuación actual: mencionado={fila['mencionado'] or 'vacío'}, posicion={fila['posicion'] or 'vacía'}, competidores={fila['competidores'] or '—'}, fuentes={fila['fuentes'] or '—'}, datos_correctos={fila['datos_correctos'] or 'vacío'}, notas={fila['notas'] or '—'}.",
                f"- Archivo: {archivo}",
                "",
                texto.rstrip(),
                "",
            ])
    pack = "\n".join(lineas).rstrip() + "\n"
    if any("DATOS DE EJEMPLO" in (fila.get("notas") or "").upper() for fila in seleccion):
        pack = "EJEMPLO con datos inventados\n\n" + pack
    return pack


def puntos_respuesta(fila):
    if fila["pregunta_id"] == "P10" or fila["mencionado"].strip().lower() != "si":
        return 0
    posicion = fila["posicion"].strip()
    if not posicion or int(posicion) >= 4:
        return 1
    if int(posicion) in (2, 3):
        return 2
    return 3


def redondear(valor):
    """Aplica redondeo aritmético convencional a porcentajes no negativos."""
    return int(valor + 0.5)


def banda(puntuacion):
    if puntuacion < 20:
        return "Invisible"
    if puntuacion < 50:
        return "Aparece a veces"
    if puntuacion < 80:
        return "En la conversación"
    return "Referencia"


def resumir(filas, mes):
    puntuables = [f for f in filas if f["mes"] == mes and f["pregunta_id"] != "P10"]
    respondidas = [f for f in puntuables if f["mencionado"].strip().lower() in {"si", "no"}]
    puntos = sum(puntos_respuesta(f) for f in respondidas)
    puntuacion = redondear(100 * puntos / (3 * len(respondidas))) if respondidas else 0
    mencionadas = sum(f["mencionado"].strip().lower() == "si" for f in respondidas)
    posiciones = [int(f["posicion"]) for f in respondidas if f["mencionado"].strip().lower() == "si" and f["posicion"].strip()]
    por_asistente = {}
    for asistente in ASISTENTES:
        grupo = [f for f in respondidas if f["asistente"].lower() == asistente]
        subtotal = sum(puntos_respuesta(f) for f in grupo)
        por_asistente[asistente] = {
            "puntos": subtotal,
            "respuestas_obtenidas": len(grupo),
            "puntuacion": redondear(100 * subtotal / (3 * len(grupo))) if grupo else None,
            "presencia": redondear(100 * sum(f["mencionado"] == "si" for f in grupo) / len(grupo)) if grupo else None,
        }
    return {
        "mes": mes, "puntos": puntos, "respuestas_obtenidas": len(respondidas),
        "respuestas_esperadas": 27, "puntuacion": puntuacion, "banda": banda(puntuacion),
        "presencia": redondear(100 * mencionadas / len(respondidas)) if respondidas else 0,
        "posicion_media": round(sum(posiciones) / len(posiciones), 2) if posiciones else None,
        "por_asistente": por_asistente,
    }


def comparacion(filas, actual):
    meses = sorted({f["mes"] for f in filas if f["mes"] < actual})
    if not meses:
        return None, "No hay un mes anterior para comparar."
    anterior = meses[-1]
    actual_filas = [f for f in filas if f["mes"] == actual and f["pregunta_id"] != "P10"]
    anterior_filas = [f for f in filas if f["mes"] == anterior and f["pregunta_id"] != "P10"]
    textos = lambda grupo: {(f["pregunta_id"], f["pregunta"]) for f in grupo}
    asistentes = lambda grupo: {f["asistente"].lower() for f in grupo}
    if textos(actual_filas) != textos(anterior_filas) or asistentes(actual_filas) != asistentes(anterior_filas):
        return None, f"No comparable con {anterior}: cambiaron los textos de preguntas o los asistentes."
    previo = resumir(filas, anterior)
    actual_resumen = resumir(filas, actual)
    detalle = {a: actual_resumen["por_asistente"][a]["puntuacion"] - previo["por_asistente"][a]["puntuacion"]
               for a in ASISTENTES if actual_resumen["por_asistente"][a]["puntuacion"] is not None and previo["por_asistente"][a]["puntuacion"] is not None}
    return {"mes_anterior": anterior, "puntuacion_anterior": previo["puntuacion"],
            "delta": actual_resumen["puntuacion"] - previo["puntuacion"], "delta_por_asistente": detalle}, None


def generar_informe(filas, negocio, mes):
    resumen = resumir(filas, mes)
    cambio, aviso = comparacion(filas, mes)
    competidores = Counter()
    fuentes_ausencia = Counter()
    fuentes = Counter()
    for fila in filas:
        if fila["mes"] != mes:
            continue
        competidores.update(x.strip() for x in fila["competidores"].split("|") if x.strip())
        dominios = [x.strip() for x in fila["fuentes"].split("|") if x.strip()]
        fuentes.update(dominios)
        if fila["mencionado"].strip().lower() != "si":
            fuentes_ausencia.update(dominios)
    p10 = [f for f in filas if f["mes"] == mes and f["pregunta_id"] == "P10"]
    p10_respuestas = Counter(f["datos_correctos"].strip().lower() or "sin dato" for f in p10)
    lineas = [f"# Medición mensual de recomendaciones en IA: {negocio}", "", f"## Resultado — {mes}",
              f"**Nota de recomendación: {resumen['puntuacion']}/100 · {resumen['banda']}**. {resumen['respuestas_obtenidas']} de 27 respuestas puntuables obtenidas.",
              f"Presencia: {resumen['presencia']} %. Posición media cuando aparece con posición registrada: {resumen['posicion_media'] if resumen['posicion_media'] is not None else 'sin datos'}.", "",
              "## Por asistente"]
    for asistente, datos in resumen["por_asistente"].items():
        respuestas = datos["respuestas_obtenidas"]
        nota = "sin respuestas" if datos["puntuacion"] is None else f"{datos['puntuacion']}/100; presencia {datos['presencia']} % ({respuestas} {'respuesta' if respuestas == 1 else 'respuestas'})"
        lineas.append(f"- **{asistente}**: {nota}.")
    lineas.extend(["", "## Comparado con el mes anterior"])
    lineas.append(aviso or f"Cambio total: {cambio['delta']:+} puntos frente a {cambio['mes_anterior']} ({cambio['puntuacion_anterior']}/100). Cambios por asistente: " + ", ".join(f"{a} {d:+}" for a, d in cambio["delta_por_asistente"].items()) + ".")
    lineas.extend(["", "## Quién sale en tu lugar"])
    lineas.extend([f"- {nombre}: {cantidad} {'mención' if cantidad == 1 else 'menciones'}." for nombre, cantidad in competidores.most_common(5)] or ["- No se registraron competidores."])
    lineas.extend(["", "## Fuentes que citan"])
    lineas.extend([f"- {dominio}: {cantidad} {'cita' if cantidad == 1 else 'citas'}." for dominio, cantidad in fuentes.most_common(10)] or ["- No se registraron fuentes."])
    lineas.extend(["", "### Fuentes en respuestas donde no apareces"])
    lineas.extend([f"- {dominio}: {cantidad} {'cita' if cantidad == 1 else 'citas'}." for dominio, cantidad in fuentes_ausencia.most_common(10)] or ["- No se registraron fuentes en esas respuestas."])
    lineas.extend(["", "## Lo que saben de ti (P10)"])
    lineas.extend([f"- {estado}: {cantidad} {'respuesta' if cantidad == 1 else 'respuestas'}." for estado, cantidad in p10_respuestas.items()] or ["- No hay respuestas P10."])
    lineas.extend(["", "## Señales para los arreglos"])
    senales = []
    if resumen["presencia"] < 50:
        senales.append("Casi nunca sales, en ningún asistente: comprueba si la IA puede leer tu web con la skill gratuita Visibilidad en IA.")
    if competidores:
        senales.append(f"Aparecen competidores ({competidores.most_common(1)[0][0]} destaca): compara reseñas recientes y pide reseñas tras cada trabajo.")
    if fuentes_ausencia:
        senales.append(f"Se citan fuentes sin mencionarte ({fuentes_ausencia.most_common(1)[0][0]} destaca): solicita presencia en esos directorios o medios locales.")
    senales.append("Si faltan páginas que respondan a las consultas, crea una por servicio y ciudad con zona, horario e inclusiones.")
    lineas.extend(f"- {senal}" for senal in senales[:5])
    informe = "\n".join(lineas) + "\n"
    if any("DATOS DE EJEMPLO" in f["notas"].upper() for f in filas):
        informe = "EJEMPLO con datos inventados\n\n" + informe
    return resumen, informe


def leer_registro(ruta):
    try:
        contenido = ruta.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        contenido = ruta.read_text(encoding="cp1252")
    primera_linea = contenido.splitlines()[0] if contenido.splitlines() else ""
    delimitador = csv.Sniffer().sniff(primera_linea, delimiters=",;\t").delimiter
    lector = csv.DictReader(io.StringIO(contenido, newline=""), delimiter=delimitador)
    if lector.fieldnames is None or not set(COLUMNAS).issubset(lector.fieldnames):
        raise ValueError("El CSV debe incluir las columnas: " + ", ".join(COLUMNAS))
    filas = normalizar_filas(list(lector))
    if not filas:
        raise ValueError("El registro está vacío: añade una fila por asistente y pregunta (mira ejemplos/registro-ejemplo.csv) y vuelve a ejecutarlo.")
    return filas


def main(argv=None):
    parser = argparse.ArgumentParser(description="Calcula la nota de recomendación mensual en asistentes de IA.")
    parser.add_argument("csv", type=Path, help="ruta al registro CSV")
    parser.add_argument("--negocio", required=True, help="nombre exacto del negocio")
    parser.add_argument("--salida", required=True, type=Path, help="ruta del informe Markdown o, con --rescore, del documento de re-puntuación")
    parser.add_argument("--mes", help="mes AAAA-MM; por defecto, el último mes del registro (o todos, con --rescore)")
    parser.add_argument(
        "--rescore",
        action="store_true",
        help="genera un documento para volver a puntuar el histórico con la rúbrica actual, usando las respuestas guardadas, sin repetir las consultas",
    )
    args = parser.parse_args(argv)
    try:
        filas = leer_registro(args.csv)
        errores = validar(filas)
        if args.rescore:
            errores.extend(errores_rescore(filas, args.csv.parent, args.mes))
    except FileNotFoundError:
        print(f"Error: no encuentro el archivo {args.csv}", file=sys.stderr)
        return 1
    except (ValueError, OSError, UnicodeError, csv.Error) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    if errores:
        print("Error: Errores de validación:\n" + "\n".join(errores), file=sys.stderr)
        return 1
    meses = sorted({f["mes"].strip() for f in filas})
    if not meses:
        print("Error: el CSV no contiene filas.", file=sys.stderr)
        return 1
    if args.rescore:
        if args.mes:
            if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", args.mes) or args.mes not in meses:
                print(f"Error: no hay registros válidos para el mes {args.mes}.", file=sys.stderr)
                return 1
            meses_salida = [args.mes]
        else:
            meses_salida = meses
        try:
            pack = generar_pack_rescore(filas, args.negocio, args.mes, args.csv.parent)
            args.salida.parent.mkdir(parents=True, exist_ok=True)
            args.salida.write_text(pack, encoding="utf-8")
        except (ValueError, OSError, UnicodeError, FileNotFoundError) as error:
            print(f"Error: no se pudo generar el documento de re-puntuación: {error}", file=sys.stderr)
            return 1
        filas_pack = sum(1 for fila in filas if (args.mes is None or fila["mes"] == args.mes) and fila_tiene_respuesta_obtenida(fila))
        print(json.dumps({"filas": filas_pack, "meses": meses_salida, "rescore": True, "salida": str(args.salida)}, ensure_ascii=False, sort_keys=True))
        return 0
    mes = args.mes or meses[-1]
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", mes) or mes not in meses:
        print(f"Error: no hay registros válidos para el mes {mes}.", file=sys.stderr)
        return 1
    try:
        resumen, informe = generar_informe(filas, args.negocio, mes)
        args.salida.parent.mkdir(parents=True, exist_ok=True)
        args.salida.write_text(informe, encoding="utf-8")
    except (ValueError, OSError, UnicodeError) as error:
        print(f"Error: no se pudo generar el informe: {error}", file=sys.stderr)
        return 1
    print(json.dumps({"mes": resumen}, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
