"""Pruebas públicas del calculador de medición mensual de recomendaciones."""

import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "zip/te-recomienda-la-ia/scripts/puntuar.py"
HEADER = [
    "mes", "fecha", "asistente", "pregunta_id", "pregunta", "mencionado",
    "posicion", "competidores", "fuentes", "datos_correctos", "notas",
]


class PuntuarTest(unittest.TestCase):
    def escribir_csv(self, filas, directorio):
        ruta = Path(directorio) / "registro.csv"
        with ruta.open("w", encoding="utf-8", newline="") as archivo:
            escritor = csv.DictWriter(archivo, fieldnames=HEADER)
            escritor.writeheader()
            escritor.writerows(filas)
        return ruta

    def fila(self, mes="2026-11", asistente="chatgpt", pregunta_id="P01", pregunta="Mejor negocio", mencionado="si", posicion="1", **extra):
        fila = dict.fromkeys(HEADER, "")
        fila.update({
            "mes": mes, "fecha": f"{mes}-15", "asistente": asistente,
            "pregunta_id": pregunta_id, "pregunta": pregunta,
            "mencionado": mencionado, "posicion": posicion,
        })
        fila.update(extra)
        return fila

    def ejecutar(self, ruta, directorio, *args):
        return subprocess.run(
            [sys.executable, str(SCRIPT), str(ruta), "--negocio", "Peluquería Lúa",
             "--salida", str(Path(directorio) / "informe.md"), *args],
            capture_output=True, text=True, encoding="utf-8", check=False,
        )

    def test_rubrica_posiciones_y_redondeo(self):
        filas = [
            self.fila(posicion="1"), self.fila(pregunta_id="P02", posicion="2"),
            self.fila(pregunta_id="P03", posicion="4"), self.fila(pregunta_id="P04", mencionado="no", posicion=""),
        ]
        with tempfile.TemporaryDirectory() as directorio:
            resultado = self.ejecutar(self.escribir_csv(filas, directorio), directorio)
            resumen = json.loads(resultado.stdout)
            self.assertEqual(resultado.returncode, 0, resultado.stderr)
            self.assertEqual(resumen["mes"]["puntos"], 6)
            self.assertEqual(resumen["mes"]["respuestas_obtenidas"], 4)
            self.assertEqual(resumen["mes"]["puntuacion"], 50)

    def test_redondeo_de_medio_punto_es_alejandose_de_cero(self):
        filas = [self.fila(posicion="1")] + [
            self.fila(pregunta_id=f"P{indice:02d}", mencionado="no", posicion="")
            for indice in range(2, 9)
        ]
        with tempfile.TemporaryDirectory() as directorio:
            resultado = self.ejecutar(self.escribir_csv(filas, directorio), directorio)
            self.assertEqual(resultado.returncode, 0, resultado.stderr)
            self.assertEqual(json.loads(resultado.stdout)["mes"]["puntuacion"], 13)

    def test_limites_de_bandas(self):
        with tempfile.TemporaryDirectory() as directorio:
            for puntos, banda in [(19, "Invisible"), (20, "Aparece a veces"), (49, "Aparece a veces"), (50, "En la conversación"), (79, "En la conversación"), (80, "Referencia")]:
                with self.subTest(puntos=puntos):
                    pendientes = puntos * 3
                    filas = []
                    for indice in range(100):
                        valor = min(pendientes, 3)
                        pendientes -= valor
                        mencionado = "no" if valor == 0 else "si"
                        posicion = {3: "1", 2: "2", 1: "4", 0: ""}[valor]
                        filas.append(self.fila(pregunta_id=f"P{indice % 9 + 1:02d}", mencionado=mencionado, posicion=posicion))
                    resultado = self.ejecutar(self.escribir_csv(filas, directorio), directorio)
                    self.assertEqual(resultado.returncode, 0, resultado.stderr)
                    self.assertEqual(json.loads(resultado.stdout)["mes"]["banda"], banda)

    def test_respuestas_faltantes_no_reducen_el_score(self):
        filas = [self.fila(posicion="1"), self.fila(pregunta_id="P02", mencionado="", posicion="")]
        with tempfile.TemporaryDirectory() as directorio:
            resultado = self.ejecutar(self.escribir_csv(filas, directorio), directorio)
            mes = json.loads(resultado.stdout)["mes"]
            self.assertEqual(mes["puntuacion"], 100)
            self.assertEqual(mes["respuestas_obtenidas"], 1)
            self.assertIn("1 de 27", Path(directorio, "informe.md").read_text(encoding="utf-8"))

    def test_leeme_del_paquete_esta_en_la_raiz_de_zip(self):
        leeme = ROOT / "zip/LEEME.txt"
        self.assertTrue(leeme.is_file(), "LEEME.txt debe estar en la raíz de zip/")
        texto = leeme.read_text(encoding="utf-8").lower()
        self.assertIn("30 minutos al mes", texto)
        self.assertIn("datos inventados", texto)

    def test_cambio_de_pregunta_impide_comparar(self):
        filas = [self.fila(mes="2026-10", pregunta="Texto anterior"), self.fila(mes="2026-11", pregunta="Texto nuevo")]
        with tempfile.TemporaryDirectory() as directorio:
            resultado = self.ejecutar(self.escribir_csv(filas, directorio), directorio)
            self.assertEqual(resultado.returncode, 0, resultado.stderr)
            self.assertIn("no comparable", Path(directorio, "informe.md").read_text(encoding="utf-8").lower())

    def test_validacion_indica_filas_invalidas_y_no_escribe_informe(self):
        filas = [self.fila(asistente="otro"), self.fila(mes="noviembre"), self.fila(posicion="primero"), self.fila(mencionado="quizá")]
        with tempfile.TemporaryDirectory() as directorio:
            ruta = self.escribir_csv(filas, directorio)
            resultado = self.ejecutar(ruta, directorio)
            self.assertEqual(resultado.returncode, 1)
            for numero in (2, 3, 4, 5):
                self.assertIn(str(numero), resultado.stderr)
            self.assertFalse(Path(directorio, "informe.md").exists())

    def test_ejemplo_generado_es_inventado_y_coincide_con_sus_numeros(self):
        ejemplo = ROOT / "zip/te-recomienda-la-ia/ejemplos/registro-ejemplo.csv"
        informe = ROOT / "zip/te-recomienda-la-ia/ejemplos/informe-ejemplo.md"
        with tempfile.TemporaryDirectory() as directorio:
            resultado = self.ejecutar(ejemplo, directorio)
            self.assertEqual(resultado.returncode, 0, resultado.stderr)
            salida = json.loads(resultado.stdout)
            contenido = informe.read_text(encoding="utf-8")
            generado = Path(directorio, "informe.md").read_text(encoding="utf-8")
            self.assertIn("inventad", ejemplo.read_text(encoding="utf-8").lower())
            self.assertIn("inventad", contenido.lower())
            self.assertEqual(salida["mes"]["puntuacion"], 28)
            self.assertTrue(contenido.startswith("EJEMPLO con datos inventados\n\n"))
            self.assertIn("# Medición mensual de recomendaciones en IA: Peluquería Lúa", contenido)
            self.assertEqual(generado, contenido)

    def test_senal_de_baja_presencia_indica_comprobar_lectura_de_la_web(self):
        filas = [self.fila(mencionado="no", posicion="")]
        with tempfile.TemporaryDirectory() as directorio:
            resultado = self.ejecutar(self.escribir_csv(filas, directorio), directorio)
            self.assertEqual(resultado.returncode, 0, resultado.stderr)
            informe = Path(directorio, "informe.md").read_text(encoding="utf-8")
            self.assertIn("Casi nunca sales, en ningún asistente", informe)
            self.assertIn("Visibilidad en IA", informe)

    def test_lee_csv_separado_por_punto_y_coma(self):
        fila = self.fila()
        with tempfile.TemporaryDirectory() as directorio:
            ruta = Path(directorio, "registro.csv")
            with ruta.open("w", encoding="utf-8", newline="") as archivo:
                escritor = csv.DictWriter(archivo, fieldnames=HEADER, delimiter=";")
                escritor.writeheader()
                escritor.writerow(fila)
            resultado = self.ejecutar(ruta, directorio)
            self.assertEqual(resultado.returncode, 0, resultado.stderr)
            self.assertEqual(json.loads(resultado.stdout)["mes"]["puntuacion"], 100)

    def test_lee_csv_separado_por_tabulacion(self):
        with tempfile.TemporaryDirectory() as directorio:
            ruta = Path(directorio, "registro.csv")
            with ruta.open("w", encoding="utf-8", newline="") as archivo:
                escritor = csv.DictWriter(archivo, fieldnames=HEADER, delimiter="\t")
                escritor.writeheader()
                escritor.writerow(self.fila())
            resultado = self.ejecutar(ruta, directorio)
            self.assertEqual(resultado.returncode, 0, resultado.stderr)

    def test_lee_csv_con_bom(self):
        fila = self.fila()
        with tempfile.TemporaryDirectory() as directorio:
            ruta = self.escribir_csv([fila], directorio)
            ruta.write_bytes(ruta.read_bytes().replace(b"mes,fecha", b"\xef\xbb\xbfmes,fecha", 1))
            resultado = self.ejecutar(ruta, directorio)
            self.assertEqual(resultado.returncode, 0, resultado.stderr)

    def test_reintenta_csv_cp1252(self):
        fila = self.fila(pregunta="¿Cuál es la mejor peluquería?")
        with tempfile.TemporaryDirectory() as directorio:
            ruta = Path(directorio, "registro.csv")
            with ruta.open("w", encoding="cp1252", newline="") as archivo:
                escritor = csv.DictWriter(archivo, fieldnames=HEADER)
                escritor.writeheader()
                escritor.writerow(fila)
            resultado = self.ejecutar(ruta, directorio)
            self.assertEqual(resultado.returncode, 0, resultado.stderr)

    def test_normaliza_valores_escritos_a_mano(self):
        filas = [
            self.fila(asistente=" ChatGPT ", pregunta_id="p01", mencionado="Sí", posicion="1º"),
            self.fila(asistente="Perplexity", pregunta_id="p02", mencionado="SI", posicion="1."),
            self.fila(asistente=" Gemini ", pregunta_id="p03", mencionado="sí", posicion=" 2 "),
            self.fila(pregunta_id="p10", pregunta="¿Qué sabes?", mencionado="No", posicion="", datos_correctos="Parcial"),
        ]
        with tempfile.TemporaryDirectory() as directorio:
            resultado = self.ejecutar(self.escribir_csv(filas, directorio), directorio)
            self.assertEqual(resultado.returncode, 0, resultado.stderr)
            self.assertEqual(json.loads(resultado.stdout)["mes"]["puntuacion"], 89)

    def test_archivo_inexistente_termina_sin_traceback(self):
        with tempfile.TemporaryDirectory() as directorio:
            ruta = Path(directorio, "no-existe.csv")
            resultado = self.ejecutar(ruta, directorio)
            self.assertEqual(resultado.returncode, 1)
            self.assertIn(f"Error: no encuentro el archivo {ruta}", resultado.stderr)
            self.assertNotIn("Traceback", resultado.stderr)

    def test_plantilla_vacia_termina_sin_traceback(self):
        with tempfile.TemporaryDirectory() as directorio:
            ruta = self.escribir_csv([], directorio)
            resultado = self.ejecutar(ruta, directorio)
            self.assertEqual(resultado.returncode, 1)
            self.assertIn("El registro está vacío: añade una fila por asistente y pregunta (mira ejemplos/registro-ejemplo.csv) y vuelve a ejecutarlo.", resultado.stderr)
            self.assertNotIn("Traceback", resultado.stderr)

    def test_informe_usa_singular_para_un_elemento(self):
        fila = self.fila(competidores="Otro negocio", fuentes="ejemplo.test")
        with tempfile.TemporaryDirectory() as directorio:
            resultado = self.ejecutar(self.escribir_csv([fila], directorio), directorio)
            self.assertEqual(resultado.returncode, 0, resultado.stderr)
            informe = Path(directorio, "informe.md").read_text(encoding="utf-8")
            self.assertIn("1 respuesta)", informe)
            self.assertIn("1 mención.", informe)
            self.assertIn("1 cita.", informe)
            self.assertNotIn("1 respuesta(s)", informe)

    def test_presencia_usa_redondeo_half_up(self):
        filas = [self.fila(posicion="1")] + [
            self.fila(pregunta_id=f"P{indice:02d}", mencionado="no", posicion="")
            for indice in range(2, 9)
        ]
        with tempfile.TemporaryDirectory() as directorio:
            resultado = self.ejecutar(self.escribir_csv(filas, directorio), directorio)
            self.assertEqual(resultado.returncode, 0, resultado.stderr)
            self.assertEqual(json.loads(resultado.stdout)["mes"]["presencia"], 13)


if __name__ == "__main__":
    unittest.main()
