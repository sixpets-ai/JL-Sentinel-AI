import os

def run_quantum_optimization():
    print("Iniciando conexión con IBM Quantum...")
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService
        # Se conecta usando los Secrets seguros de Replit
        service = QiskitRuntimeService(
            channel="ibm_quantum_platform",
            token=os.getenv("IBM_API_KEY"),
            instance=os.getenv("QUANTUM_CRN") # <-- Aquí irá el CRN cuando lo tengas
        )

        # Busca el procesador cuántico real con menos cola
        backend = service.least_busy(operational=True, simulator=False)
        print(f"✅ CONEXIÓN EXITOSA AL QPU REAL: {backend.name}")
        return backend.name
    except Exception as e:
        print(f"⚠️ Esperando CRN de IBM Quantum: {e}")
        return "Simulación local activa"

def _haversine(a, b):
    import math
    lat1, lat2 = math.radians(a["lat"]), math.radians(b["lat"])
    dlat = lat2 - lat1
    dlng = math.radians(b["lng"] - a["lng"])
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 6371.0088 * 2 * math.asin(math.sqrt(min(1, h)))


def simulate_route(payload):
    """Exact, bounded educational baseline. No IBM QPU or quantum speedup."""
    import itertools
    import math

    points = payload.get("points")
    if not isinstance(points, list) or not 2 <= len(points) <= 8:
        raise ValueError("Se requieren de 2 a 8 puntos.")
    for point in points:
        if not isinstance(point, dict) or not isinstance(point.get("name"), str):
            raise ValueError("Punto inválido.")
        lat, lng = point.get("lat"), point.get("lng")
        if (isinstance(lat, bool) or isinstance(lng, bool)
                or not isinstance(lat, (int, float)) or not isinstance(lng, (int, float))
                or not math.isfinite(lat) or not math.isfinite(lng)
                or not -90 <= lat <= 90 or not -180 <= lng <= 180):
            raise ValueError("Coordenadas inválidas.")

    matrix = [[_haversine(a, b) for b in points] for a in points]
    orders = ((0,) + order for order in itertools.permutations(range(1, len(points))))
    best = min(orders, key=lambda order: sum(matrix[a][b] for a, b in zip(order, order[1:])))
    return {
        "points": [points[i] for i in best],
        "distanceKm": round(sum(matrix[a][b] for a, b in zip(best, best[1:])), 2),
        "algorithm": "Enumeración clásica exacta · referencia para futuros experimentos cuánticos · no QPU",
        "disclaimer": "Simulación educativa por distancia geodésica. No considera carreteras, fronteras, clima, tiempos ni seguridad; no es navegación, recomendación operativa ni despacho.",
    }


def simulate_quantum_route(payload):
    """Educational Grover amplitude simulation over valid route permutations.

    The oracle is built with an exhaustive classical minimum; this demonstrates
    amplitude amplification, NOT a practical quantum optimizer or speedup.
    No IBM calls, credentials, quantum jobs or QPU credits are involved.
    """
    import itertools
    import math
    baseline = simulate_route(payload)  # Shares the existing strict validation.
    points = payload["points"]
    orders = [(0,) + order for order in itertools.permutations(range(1, len(points)))]
    costs = [sum(_haversine(points[a], points[b]) for a, b in zip(order, order[1:]))
             for order in orders]
    minimum = min(costs)
    marked = [i for i, cost in enumerate(costs) if abs(cost - minimum) < 1e-9]
    count = len(orders)
    amplitudes = [1 / math.sqrt(count)] * count
    theta = math.asin(math.sqrt(len(marked) / count))
    rounds = max(0, round(math.pi / (4 * theta) - 0.5))
    for _ in range(rounds):
        for index in marked:
            amplitudes[index] = -amplitudes[index]  # Phase oracle.
        average = sum(amplitudes) / count
        amplitudes = [2 * average - amplitude for amplitude in amplitudes]  # Diffusion.
    probability = sum(amplitudes[index] ** 2 for index in marked)
    baseline["algorithm"] = (
        f"Simulación educativa de amplitudes Grover · {count} rutas · {rounds} iteraciones · "
        f"P(mínimo)={probability:.1%} · oráculo calculado clásicamente · no QPU"
    )
    baseline["disclaimer"] += (
        " Se devuelve el mínimo de referencia clásico; la probabilidad es del modelo "
        "ideal simulado, no una medición ni rendimiento de IBM Quantum. Sin ventaja cuántica demostrada."
    )
    return baseline


if __name__ == "__main__":
    import sys
    if "--simulate" in sys.argv or "--simulate-quantum" in sys.argv:
        import json
        try:
            raw = sys.stdin.read(16000)
            runner = simulate_quantum_route if "--simulate-quantum" in sys.argv else simulate_route
            print(json.dumps(runner(json.loads(raw)), ensure_ascii=False))
        except (ValueError, TypeError, KeyError) as error:
            print(json.dumps({"error": str(error)}, ensure_ascii=False))
            sys.exit(1)
    else:
        run_quantum_optimization()