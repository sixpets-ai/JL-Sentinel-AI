import unittest
from heatmap_generator import build_scenario, generate_heatmap
from quantum_engine import simulate_route, simulate_quantum_route


class TacticalDemoTests(unittest.TestCase):
    def test_grid_aggregation_and_normalization(self):
        points = generate_heatmap([
            {"lat": 19.43, "lng": -99.14, "mentions": 2},
            {"lat": 19.431, "lng": -99.141, "mentions": 3},
            {"lat": 20, "lng": -99, "mentions": 1},
        ])
        self.assertEqual(len(points), 2)
        self.assertEqual(points[0]["count"], 5)
        self.assertEqual(points[0]["weight"], 1)
        self.assertAlmostEqual(points[0]["lat"], (19.43 * 2 + 19.431 * 3) / 5)
        self.assertEqual(points[1]["weight"], 0.2)

    def test_invalid_points_rejected(self):
        for event in [
            {"lat": float("nan"), "lng": 1}, {"lat": 91, "lng": 1},
            {"lat": True, "lng": 1}, {"lat": 1, "lng": 1, "mentions": -1},
        ]:
            with self.assertRaises(ValueError):
                generate_heatmap([event])
        self.assertEqual(generate_heatmap([]), [])

    def test_scenario_is_explicit_and_graph_consistent(self):
        scenario = build_scenario()
        self.assertTrue(scenario["simulation"])
        self.assertEqual(len(scenario["incidents"]), 6)
        ids = {node["id"] for node in scenario["nodes"]}
        self.assertTrue(all(edge["source"] in ids and edge["target"] in ids for edge in scenario["edges"]))
        self.assertTrue(all(node["kind"] != "person" for node in scenario["nodes"]))
        self.assertIn("Derechos Humanos", scenario["disclaimer"])

    def test_quantum_demo_keeps_baseline_and_explains_oracle(self):
        payload = {"points": [
            {"name": "A", "lat": 19.425, "lng": -99.15},
            {"name": "B", "lat": 19.432, "lng": -99.14},
            {"name": "C", "lat": 19.44, "lng": -99.135},
            {"name": "D", "lat": 19.43, "lng": -99.12},
        ]}
        result = simulate_quantum_route(payload)
        self.assertEqual(result["distanceKm"], simulate_route(payload)["distanceKm"])
        self.assertIn("Grover", result["algorithm"])
        self.assertIn("no QPU", result["algorithm"])
        self.assertIn("oráculo calculado clásicamente", result["algorithm"])
        self.assertIn("Sin ventaja cuántica", result["disclaimer"])


if __name__ == "__main__":
    unittest.main()
