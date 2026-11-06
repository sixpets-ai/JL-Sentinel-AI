"""Descriptive comparisons of synthetic incident reports, never offender attribution.

No checkpoint, road-routing, person-risk or gang inference is accepted or returned.
Only incidence counts and explainable similarity of described features are used.
"""
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from itertools import combinations
import re
import unicodedata
from zoneinfo import ZoneInfo

LOCAL = ZoneInfo("America/Mexico_City")
DAYS = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")
STOP = {"de", "en", "el", "la", "un", "una", "del", "con", "por", "al", "se", "mediante", "y", "a", "sin", "no", "ni"}


def tokens(text):
    normalized = "".join(c for c in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(c))
    return re.findall(r"[a-z]{2,}", normalized)


def features(text):
    words = tokens(text)

    def present(terms):
        return any(word in terms and not set(words[max(0, i - 3):i]) & {"sin", "no", "ninguna", "ni"}
                   for i, word in enumerate(words))

    methods = [label for label, terms in (
        ("intimidación descrita", {"amenaza", "amenazas", "intimidacion"}),
        ("forzamiento descrito", {"forzamiento", "forzado", "forzada"}),
    ) if present(terms)]
    target = "comercio" if set(words) & {"comercio", "tienda", "tiendas", "minisuper", "oxxo"} else "no especificado"
    return " + ".join(methods) or "no especificado", target, set(words) - STOP


def similarity(a, b):
    # Unknown fields never count as positive matches. Category must match.
    if a["categoryCode"] != b["categoryCode"]:
        return 0.0, []
    same_zone = a["zone"] == b["zone"]
    same_method = a["method"] == b["method"] and a["method"] != "no especificado"
    same_target = a["target"] == b["target"] and a["target"] != "no especificado"
    union = a["_words"] | b["_words"]
    lexical = len(a["_words"] & b["_words"]) / len(union) if union else 0
    value = .4 * same_zone + .3 * same_method + .2 * same_target + .1 * lexical
    reasons = [text for yes, text in (
        (same_zone, "misma zona declarada"), (same_method, "mismo rasgo descrito"),
        (same_target, "mismo tipo de objetivo descrito"),
    ) if yes]
    return round(value, 6), reasons


def analyze_patterns(events, *, source, zone, window_days, threshold, as_of, total_available):
    if as_of.tzinfo is None:
        raise ValueError("An aware server timestamp is required")
    start = as_of - timedelta(days=window_days)
    included, excluded = [], 0
    seen = set()
    for event in events:
        stamp = datetime.fromisoformat(event["timestamp"].replace("Z", "+00:00"))
        if stamp.tzinfo is None or event["id"] in seen:
            raise ValueError("Naive timestamps and duplicate event IDs are not supported")
        seen.add(event["id"])
        if not start <= stamp <= as_of or (zone != "all" and event["zone"] != zone):
            excluded += 1
            continue
        method, target, words = features(event["description"])
        included.append({k: event[k] for k in ("id", "label", "zone", "categoryCode", "lat", "lng")} |
                        {"timestamp": stamp.astimezone(LOCAL).isoformat(), "method": method, "target": target, "_words": words})
    included.sort(key=lambda item: (item["timestamp"], item["id"]), reverse=True)
    counts = Counter()
    slices = defaultdict(list)
    for event in included:
        local = datetime.fromisoformat(event["timestamp"])
        counts[local.weekday(), local.hour] += 1
        slices[event["zone"], event["categoryCode"], event["method"], event["target"]].append(local)

    parent = {event["id"]: event["id"] for event in included}

    def root(key):
        while parent[key] != key:
            parent[key] = parent[parent[key]]
            key = parent[key]
        return key

    links, pair_scores = [], {}
    for a, b in combinations(included, 2):
        score, reasons = similarity(a, b)
        pair_scores[frozenset((a["id"], b["id"]))] = score
        # A strong link needs all three explicit features; lexical overlap alone
        # is not sufficient, even with a low requested threshold.
        if score >= threshold and len(reasons) == 3:
            links.append({"source": a["id"], "target": b["id"], "similarity": score, "reasons": reasons})
            parent[root(b["id"])] = root(a["id"])
    clusters = defaultdict(list)
    for item in included:
        clusters[root(item["id"])].append(item["id"])
    groups = []
    for members in clusters.values():
        if len(members) < 2:
            continue
        members.sort()
        groups.append({"id": sha256("|".join(members).encode()).hexdigest()[:12],
                       "label": f"Similitud entre {len(members)} registros · autoría no determinada",
                       "incidentIds": members,
                       "minimumSimilarity": min(pair_scores[frozenset(pair)] for pair in combinations(members, 2))})
    groups.sort(key=lambda group: (-len(group["incidentIds"]), group["id"]))
    notices = []
    for (region, category, method, target), stamps in slices.items():
        if method == "no especificado" or target == "no especificado":
            continue
        distribution = Counter((stamp.weekday(), stamp.hour) for stamp in stamps)
        for (day, hour), count in distribution.items():
            dates = len({stamp.date() for stamp in stamps if stamp.weekday() == day and stamp.hour == hour})
            if count < 3 or dates < 3:
                continue
            notices.append({"zone": region, "day": day, "hour": hour, "count": count,
                            "groupTotal": len(stamps), "distinctDates": dates,
                            "text": f"Recurrencia observada: {count} de {len(stamps)} registros de {target}, "
                                    f"zona {region}, {DAYS[day]} a las {hour:02d}:00, en {dates} fechas distintas. "
                                    "Requiere revisión humana; no es una probabilidad de delito futuro ni orden de despliegue."})
    notices.sort(key=lambda notice: (-notice["count"], notice["zone"], notice["day"], notice["hour"]))
    links.sort(key=lambda link: (-link["similarity"], link["source"], link["target"]))
    return {
        "source": source, "timestampBasis": "ocurrencia ficticia" if source == "demo" else "registro del ejercicio, no ocurrencia del hecho",
        "generatedAt": as_of.astimezone(timezone.utc).isoformat(), "timezone": str(LOCAL),
        "windowStart": start.astimezone(LOCAL).isoformat(), "windowEnd": as_of.astimezone(LOCAL).isoformat(),
        "zone": zone, "threshold": threshold, "totalAvailable": total_available, "sampled": len(events),
        "matched": len(included), "excluded": excluded, "truncated": total_available > len(events),
        "linksTruncated": len(links) > 40,
        "method": "Similitud = 0.40 zona + 0.30 rasgo descrito + 0.20 objetivo + 0.10 Jaccard léxico. "
                  "Solo se conectan registros de la misma categoría con zona, rasgo y objetivo explícitos coincidentes. "
                  "El índice no es una probabilidad. Grupos por componentes conectados; pueden existir enlaces transitivos.",
        "warnings": [
            "Todos los datos son ejercicios ficticios. Coordenadas ilustrativas, no domicilios ni rutas transitables.",
            "Frecuencias de la muestra, sin denominador poblacional, exposición ni corrección por subregistro.",
            "No atribuye autoría, bandas, culpabilidad ni riesgo de personas; no pronostica incidentes ni optimiza evasión.",
            "Se usan hasta los 60 registros más recientes de la fuente; los filtros se aplican después del muestreo.",
            "En el portal solo se comparan los primeros 160 caracteres de cada descripción; la hora es la del registro, no la ocurrencia.",
        ],
        "incidents": [{k: v for k, v in item.items() if k != "_words"} for item in included],
        "cells": [{"day": day, "hour": hour, "count": counts[day, hour]} for day in range(7) for hour in range(24)],
        "links": links[:40], "groups": groups, "notices": notices[:10],
    }
