"""Reproducibly import statistical labels; never invent legal equivalences.

Inputs are official source files downloaded to generated-artifacts/catalog-sources.
The RNID list is transcribed from the official 2026 manual, printed pages 29–32.
ICCS codes/names are imported from UNODC's Spanish correspondence spreadsheet.
"""
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "generated-artifacts/catalog-sources"
RNID_NAMES = """Homicidio doloso
Tentativa de homicidio doloso
Homicidio culposo
Lesiones dolosas
Lesiones culposas
Feminicidio
Tentativa de feminicidio
Aborto
Otros delitos que atentan contra la vida y la integridad corporal
Secuestro extorsivo
Secuestro con calidad de rehén
Secuestro para causar daño
Secuestro exprés
Tráfico de menores
Rapto
Privación ilegal de la libertad
Retención o sustracción de menores e incapaces
Otros delitos que atentan contra la libertad personal
Abuso sexual
Acoso sexual
Hostigamiento sexual
Violación simple
Violación equiparada
Incesto
Violación a la intimidad sexual
Otros delitos que atentan contra la libertad y la seguridad sexual
Robo a casa habitación
Robo de vehículo automotor - Coche de 4 ruedas
Robo de vehículo automotor - Motocicleta
Robo de vehículo automotor - Embarcaciones pequeñas y grandes
Robo de autopartes
Robo a transportista
Robo a transeúnte en vía pública
Robo a transeúnte en espacio abierto al público
Robo en transporte público individual
Robo en transporte público colectivo
Robo en transporte individual
Robo a institución bancaria
Robo a negocio
Robo de ganado
Robo de maquinaria - Herramienta industrial o agrícola
Robo de maquinaria - Tractores
Robo de maquinaria - Cables, tubos y otros objetos destinados a servicios públicos
Fraude
Abuso de confianza
Extorsión presencial
Tentativa de extorsión presencial
Extorsión por otros medios
Tentativa de extorsión por otros medios
Daño a la propiedad
Despojo
Otros delitos contra el patrimonio
Violencia familiar
Violencia de género en todas sus modalidades distinta a la violencia familiar
Incumplimiento de obligaciones de asistencia familiar
Otros delitos contra la familia
Corrupción de menores
Trata de personas con fines de explotación sexual
Trata de personas con fines de trabajo o servicios forzados
Trata de personas con fines de tráfico de órganos
Trata de personas con otros fines
Pornografía infantil
Discriminación
Otros delitos contra la sociedad
Narcomenudeo posesión simple
Narcomenudeo con fines de venta
Amenazas
Allanamiento de morada
Evasión de presos
Falsedad
Falsificación
Contra el medio ambiente
Delitos cometidos por servidores públicos
Electorales
Delitos contra la administración de justicia
Suplantación y usurpación de identidad
Tortura
Otros delitos del Fuero Común""".splitlines()


def spreadsheet_categories(file):
    ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    result = []
    with zipfile.ZipFile(file) as archive:
        strings = ["".join(t.text or "" for t in item.findall(".//s:t", ns))
                   for item in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("s:si", ns)]
        rows = []
        for number in range(1, 12):
            sheet = ET.fromstring(archive.read(f"xl/worksheets/sheet{number}.xml"))
            rows.extend(sheet.findall(".//s:row", ns))
        for row in rows:
            cells = {}
            for cell in row.findall("s:c", ns):
                col = re.sub(r"\d", "", cell.get("r", ""))
                if col not in ("A", "B"):
                    continue
                value = cell.find("s:v", ns)
                if value is not None:
                    cells[col] = strings[int(value.text)] if cell.get("t") == "s" else value.text
            code, label = cells.get("A", "").strip(), cells.get("B", "").strip()
            root = re.fullmatch(r"(\d{2})\s+(.+)", code)
            if root and not label:
                code, label = root.groups()
            if re.fullmatch(r"\d{2,6}", code) and label:
                result.append({"code": "ICCS-" + code, "label": label, "system": "ICCS",
                               "level": {2: 1, 4: 2, 5: 3, 6: 4}[len(code)]})
    if len({entry["code"] for entry in result}) != len(result):
        raise ValueError("ICCS duplicate code in source.")
    return result


def main():
    entries = [{"code": f"RNID2026-{i:03d}", "label": label, "system": "RNID", "level": 1}
               for i, label in enumerate(RNID_NAMES, 1)]
    entries += spreadsheet_categories(SOURCES / "iccs-es.xlsx")
    catalog = {
        "version": "RNID-2026-v1.0+ICCS-1.0-es",
        "warning": (
            "Catálogos estadísticos, no determinación de culpabilidad ni código penal. "
            "RNID2026-### son identificadores INTERNOS de SANTI, no códigos oficiales. "
            "Las etiquetas RNID se transcriben de la tabla de las páginas 29–32 del manual. "
            "Su tabla contiene 78 renglones aunque la introducción institucional anuncia 71 delitos; "
            "se conserva la tabla íntegra y se declara esta discrepancia, sin inventar ni suprimir categorías. "
            "ICCS conserva sus códigos oficiales con prefijo de sistema. No hay equivalencia jurídica "
            "automática RNID/ICCS, catálogo penal municipal/federal completo ni certificación de Interpol."
        ),
        "sources": [
            {"system": "RNID", "version": "2026 · Manual v1.0 · tabla pp.29–32",
             "url": "https://www.gob.mx/cms/uploads/attachment/file/1058582/Manual_metodol_gico_RNID_V1.0_VF__2_.pdf",
             "sha256": hashlib.sha256((SOURCES / "rnid-2026.pdf").read_bytes()).hexdigest(),
             "scope": "Etiquetas de la tabla íntegra de conductas del fuero común; IDs internos, no tipificación legal."},
            {"system": "ICCS", "version": "1.0 · correspondencia en español",
             "url": "https://www.unodc.org/documents/data-and-analysis/statistics/crime/ICCS/iccs_es.xlsx",
             "sha256": hashlib.sha256((SOURCES / "iccs-es.xlsx").read_bytes()).hexdigest(),
             "scope": "Todos los códigos y nombres presentes en las once hojas de la plantilla oficial de correspondencia."},
        ], "entries": entries,
    }
    output = ROOT / "crime_catalog.json"
    output.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"RNID_table_rows": len(RNID_NAMES),
                      "ICCS_codes": sum(e["system"] == "ICCS" for e in entries)}))


if __name__ == "__main__":
    main()
