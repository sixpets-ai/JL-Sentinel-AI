import math
import unittest
from quantum_engine import simulate_route


class RouteSimulationTests(unittest.TestCase):
    def test_open_path_fixes_start_and_orders_by_distance(self):
        points = [
            {"name": "A", "lat": 0, "lng": 0},
            {"name": "C", "lat": 0, "lng": 2},
            {"name": "B", "lat": 0, "lng": 1},
        ]
        result = simulate_route({"points": points})
        self.assertEqual([p["name"] for p in result["points"]], ["A", "B", "C"])
        self.assertAlmostEqual(result["distanceKm"], 222.39, places=1)
        self.assertIn("no QPU", result["algorithm"])

    def test_bounds_and_non_finite_coordinates(self):
        for count in (0, 1, 9):
            with self.assertRaises(ValueError):
                simulate_route({"points": [{"name": "A", "lat": 0, "lng": 0}] * count})
        for value in (math.nan, math.inf, 91, -91, True, "0"):
            with self.assertRaises(ValueError):
                simulate_route({"points": [
                    {"name": "A", "lat": value, "lng": 0},
                    {"name": "B", "lat": 0, "lng": 0},
                ]})

    def test_duplicate_coordinates_do_not_fail(self):
        result = simulate_route({"points": [
            {"name": "A", "lat": 10, "lng": 10},
            {"name": "B", "lat": 10, "lng": 10},
        ]})
        self.assertEqual(result["distanceKm"], 0)


if __name__ == "__main__":
    unittest.main()
