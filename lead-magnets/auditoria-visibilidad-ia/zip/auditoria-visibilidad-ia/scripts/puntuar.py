#!/usr/bin/env python3
"""Calcula una serie mensual reproducible de visibilidad en asistentes de IA."""

import argparse
import csv
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
        asistente = fila.get("asistente", "").strip().lower()
        if asistente not in ASISTENTES:
            problemas.append("asistente desconocido (usa chatgpt, gemini o perplexity)")
        if fila.get("pregunta_id", "").strip() not in {f"P{i:02d}" for i in range(1, 11)}:
            problemas.append("pregunta_id debe estar entre P01 y P10")
        mencionado = fila.get("mencionado", "").strip().lower()
        if mencionado not in {"", "si", "no"}:
            problemas.append("mencionado debe ser si o no (o vacío si falta la respuesta)")
        posicion = fila.get("posicion", "").strip()
        if posicion and (not posicion.isdigit() or int(posicion) < 1):
            problemas.append("posicion debe ser un entero positivo o estar vacía")
        if fila.get("datos_correctos", "").strip().lower() not in {"", "si", "no", "parcial"}:
            problemas.append("datos_correctos debe ser si, no o parcial")
        if problemas:
            errores.append(f"Fila {numero}: " + "; ".join(problemas))
    return errores


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
            "presencia": round(100 * sum(f["mencionado"].strip().lower() == "si" for f in grupo) / len(grupo)) if grupo else None,
        }
    return {
        "mes": mes, "puntos": puntos, "respuestas_obtenidas": len(respondidas),
        "respuestas_esperadas": 27, "puntuacion": puntuacion, "banda": banda(puntuacion),
        "presencia": round(100 * mencionadas / len(respondidas)) if respondidas else 0,
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
    lineas = [f"# Auditoría de visibilidad en IA: {negocio}", "", f"## Resultado — {mes}",
              f"**{resumen['puntuacion']}/100 · {resumen['banda']}**. {resumen['respuestas_obtenidas']} de 27 respuestas puntuables obtenidas.",
              f"Presencia: {resumen['presencia']} %. Posición media cuando aparece con posición registrada: {resumen['posicion_media'] if resumen['posicion_media'] is not None else 'sin datos'}.", "",
              "## Por asistente"]
    for asistente, datos in resumen["por_asistente"].items():
        nota = "sin respuestas" if datos["puntuacion"] is None else f"{datos['puntuacion']}/100; presencia {datos['presencia']} % ({datos['respuestas_obtenidas']} respuestas)"
        lineas.append(f"- **{asistente}**: {nota}.")
    lineas.extend(["", "## Comparado con el mes anterior"])
    lineas.append(aviso or f"Cambio total: {cambio['delta']:+} puntos frente a {cambio['mes_anterior']} ({cambio['puntuacion_anterior']}/100). Cambios por asistente: " + ", ".join(f"{a} {d:+}" for a, d in cambio["delta_por_asistente"].items()) + ".")
    lineas.extend(["", "## Quién sale en tu lugar"])
    lineas.extend([f"- {nombre}: {cantidad} menciones." for nombre, cantidad in competidores.most_common(5)] or ["- No se registraron competidores."])
    lineas.extend(["", "## Fuentes que citan"])
    lineas.extend([f"- {dominio}: {cantidad} citas." for dominio, cantidad in fuentes.most_common(10)] or ["- No se registraron fuentes."])
    lineas.extend(["", "### Fuentes en respuestas donde no apareces"])
    lineas.extend([f"- {dominio}: {cantidad} citas." for dominio, cantidad in fuentes_ausencia.most_common(10)] or ["- No se registraron fuentes en esas respuestas."])
    lineas.extend(["", "## Lo que saben de ti (P10)"])
    lineas.extend([f"- {estado}: {cantidad} respuesta(s)." for estado, cantidad in p10_respuestas.items()] or ["- No hay respuestas P10."])
    lineas.extend(["", "## Señales para los arreglos"])
    senales = []
    if resumen["presencia"] < 50:
        senales.append("La presencia es baja: revisa Perfil de Empresa de Google y páginas citables para cada servicio y zona.")
    if any(estado in p10_respuestas for estado in ("no", "parcial")):
        senales.append("P10 contiene datos incorrectos o parciales: corrige primero la ficha de Google y los datos estructurados LocalBusiness.")
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


def main(argv=None):
    parser = argparse.ArgumentParser(description="Puntúa registros mensuales de visibilidad en IA.")
    parser.add_argument("csv", type=Path, help="ruta al registro CSV")
    parser.add_argument("--negocio", required=True, help="nombre exacto del negocio")
    parser.add_argument("--salida", required=True, type=Path, help="ruta del informe Markdown")
    parser.add_argument("--mes", help="mes AAAA-MM; por defecto usa el último mes del registro")
    args = parser.parse_args(argv)
    try:
        with args.csv.open(encoding="utf-8-sig", newline="") as archivo:
            lector = csv.DictReader(archivo)
            if lector.fieldnames is None or not set(COLUMNAS).issubset(lector.fieldnames):
                raise ValueError("El CSV debe incluir las columnas: " + ", ".join(COLUMNAS))
            filas = list(lector)
    except (OSError, csv.Error) as error:
        print(f"Error al leer el CSV: {error}", file=sys.stderr)
        return 1
    errores = validar(filas)
    if errores:
        print("Errores de validación:\n" + "\n".join(errores), file=sys.stderr)
        return 1
    meses = sorted({f["mes"].strip() for f in filas})
    if not meses:
        print("Error: el CSV no contiene filas.", file=sys.stderr)
        return 1
    mes = args.mes or meses[-1]
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", mes) or mes not in meses:
        print(f"Error: no hay registros válidos para el mes {mes}.", file=sys.stderr)
        return 1
    resumen, informe = generar_informe(filas, args.negocio, mes)
    try:
        args.salida.parent.mkdir(parents=True, exist_ok=True)
        args.salida.write_text(informe, encoding="utf-8")
    except OSError as error:
        print(f"Error al escribir el informe: {error}", file=sys.stderr)
        return 1
    print(json.dumps({"mes": resumen}, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
