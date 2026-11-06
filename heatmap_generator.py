"""Synthetic OSINT exercise only: no live crimes, people, or predictive policing."""
import json
import math
import sys

DISCLAIMER = "Plataforma de Inteligencia Preliminar. Requiere validación humana y respeto a los Derechos Humanos."


def generate_heatmap(events):
    """Aggregate bounded geospatial observations into weighted grid cells."""
    if not isinstance(events, list) or len(events) > 500:
        raise ValueError("Se requiere una lista de hasta 500 eventos.")
    cells = {}
    for event in events:
        lat, lng = event.get("lat"), event.get("lng")
        mentions = event.get("mentions", 1)
        if (isinstance(lat, bool) or isinstance(lng, bool)
                or not isinstance(lat, (int, float)) or not isinstance(lng, (int, float))
                or not math.isfinite(lat) or not math.isfinite(lng)
                or not -90 <= lat <= 90 or not -180 <= lng <= 180
                or isinstance(mentions, bool) or not isinstance(mentions, int)
                or not 1 <= mentions <= 10000):
            raise ValueError("Coordenadas o cantidad de menciones inválidas.")
        key = (round(lat / 0.01), round(lng / 0.01))
        cell = cells.setdefault(key, {"lat": 0, "lng": 0, "count": 0})
        cell["lat"] += lat * mentions
        cell["lng"] += lng * mentions
        cell["count"] += mentions
    maximum = max((c["count"] for c in cells.values()), default=1)
    return [{"lat": c["lat"] / c["count"], "lng": c["lng"] / c["count"],
             "weight": round(c["count"] / maximum, 4), "count": c["count"]}
            for c in cells.values()]


def build_scenario():
    from pathlib import Path
    catalog = json.loads((Path(__file__).resolve().parent / "crime_catalog.json").read_text(encoding="utf-8"))
    categories = {entry["label"]: entry["code"] for entry in catalog["entries"] if entry["system"] == "RNID"}
    # Labels, source links and units are deliberately fictional.
    rows = [
        ("demo-01", "Robo a comercio · ejercicio Alfa", "Robo a negocio", "alto", 19.432, -99.140, 18, "Unidad DEMO-01"),
        ("demo-02", "Reporte de vehículo · ejercicio Beta", "Robo de vehículo automotor - Coche de 4 ruedas", "medio", 19.416, -99.162, 9, "Unidad DEMO-02"),
        ("demo-03", "Extorsión · ejercicio Gamma", "Extorsión presencial", "alto", 19.448, -99.121, 24, "Unidad DEMO-03"),
        ("demo-04", "Incidencia en vía pública · ejercicio Alfa", "Robo a transeúnte en vía pública", "bajo", 19.434, -99.142, 5, "Unidad DEMO-01"),
        ("demo-05", "Reporte a comercio · ejercicio Beta", "Robo a negocio", "medio", 19.407, -99.152, 11, "Unidad DEMO-02"),
        ("demo-06", "Señal por validar · ejercicio Gamma", "Amenazas", "bajo", 19.458, -99.136, 4, "Unidad DEMO-03"),
    ]
    keys = ("id", "title", "category", "impact", "lat", "lng", "mentions", "unit")
    incidents = [dict(zip(keys, row)) for row in rows]
    for incident in incidents:
        incident["catalogCode"] = categories[incident["category"]]
    nodes = [{"id": e["id"], "label": e["title"], "kind": "incident"} for e in incidents]
    nodes += [
        {"id": "boletin-demo", "label": "Boletín ficticio · DEMO", "kind": "source"},
        {"id": "feed-demo", "label": "Feed OSINT ficticio · DEMO", "kind": "source"},
    ]
    nodes += [{"id": "zona-" + name, "label": "Zona " + name + " · DEMO", "kind": "zone"}
              for name in ("Alfa", "Beta", "Gamma")]
    edges = []
    for i, event in enumerate(incidents):
        for target, label in [
            ("boletin-demo" if i % 2 == 0 else "feed-demo", "Mención ficticia, no corroboración"),
            ("zona-" + ("Alfa", "Beta", "Gamma")[i % 3], "Zona del ejercicio, no vínculo delictivo"),
        ]:
            edges.append({"id": event["id"] + ":" + target, "source": event["id"], "target": target, "label": label})
    # Two synthetic source references demonstrate triangulation without claiming truth.
    edges.append({"id": "demo-01:feed-demo", "source": "demo-01", "target": "feed-demo",
                  "label": "Segunda mención ficticia, no fuente independiente"})
    return {"simulation": True, "disclaimer": DISCLAIMER,
            "incidents": incidents, "heatpoints": generate_heatmap(incidents),
            "nodes": nodes, "edges": edges}


if __name__ == "__main__":
    try:
        if "--process" in sys.argv:
            print(json.dumps(generate_heatmap(json.loads(sys.stdin.read(100000))), allow_nan=False))
        else:
            print(json.dumps(build_scenario(), ensure_ascii=False, allow_nan=False))
    except (ValueError, TypeError, AttributeError) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False))
        sys.exit(1)
