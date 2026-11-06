import copy
import json
from datetime import datetime, timezone
from pathlib import Path
import unittest

from pattern_analyzer import analyze_patterns, features


class PatternAnalysisTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.events = json.loads((Path(__file__).resolve().parents[1] / "data/pattern-incidents.json").read_text())

    def analyze(self, events=None, **kwargs):
        events = copy.deepcopy(self.events if events is None else events)
        return analyze_patterns(events, **({"source": "demo", "zone": "all", "window_days": 90,
            "threshold": .8, "as_of": datetime(2026, 11, 6, tzinfo=timezone.utc),
            "total_available": len(events)} | kwargs))

    def test_counts_and_observed_recurrence(self):
        result = self.analyze()
        self.assertEqual(result["matched"], 18)
        self.assertEqual(sum(cell["count"] for cell in result["cells"]), 18)
        self.assertEqual(len(result["cells"]), 7 * 24)
        north = next(item for item in result["notices"] if item["zone"] == "norte")
        self.assertEqual((north["day"], north["hour"], north["count"], north["groupTotal"], north["distinctDates"]),
                         (4, 22, 6, 8, 6))
        self.assertIn("no es una probabilidad", north["text"])
        self.assertEqual(len(result["groups"]), 2)

    def test_filter_and_threshold_are_real(self):
        north = self.analyze(zone="norte")
        self.assertEqual(north["matched"], 9)
        self.assertEqual(sum(cell["count"] for cell in north["cells"]), 9)
        self.assertTrue(all(row["zone"] == "norte" for row in north["incidents"]))
        strict = self.analyze(threshold=1)
        self.assertLess(len(strict["links"]), len(self.analyze()["links"]))
        self.assertTrue(all(link["similarity"] == 1 for link in strict["links"]))
        self.assertLess(self.analyze(window_days=30)["matched"], 18)

    def test_timezone_future_exclusion_and_no_mutation(self):
        original = copy.deepcopy(self.events)
        event = dict(self.events[0], timestamp="2026-10-03T04:05:00Z")
        result = self.analyze([event])
        self.assertEqual(next(c["count"] for c in result["cells"] if c["day"] == 4 and c["hour"] == 22), 1)
        future = dict(event, timestamp="2026-12-01T04:05:00Z")
        self.assertEqual(self.analyze([future])["matched"], 0)
        analyze_patterns(self.events, source="demo", zone="all", window_days=90, threshold=.8,
                         as_of=datetime(2026, 11, 6, tzinfo=timezone.utc), total_available=18)
        self.assertEqual(original, self.events)

    def test_unknown_negated_features_and_category_guard(self):
        self.assertEqual(features("Tienda: no hubo amenazas ni forzamiento.")[0], "no especificado")
        self.assertEqual(features("Tienda sin amenazas ni forzamiento.")[0], "no especificado")
        a = dict(self.events[0], description="Registro en zona norte.")
        b = dict(a, id="other")
        self.assertEqual(self.analyze([a, b])["links"], [])
        a = self.events[0]
        b = dict(a, id="different-category", categoryCode="RNID2026-004")
        self.assertEqual(self.analyze([a, b])["links"], [])

    def test_empty_duplicate_naive_and_truncation(self):
        empty = self.analyze([])
        self.assertEqual((empty["matched"], empty["links"], empty["groups"], empty["notices"]), (0, [], [], []))
        with self.assertRaises(ValueError):
            self.analyze([self.events[0], self.events[0]])
        with self.assertRaises(ValueError):
            self.analyze([dict(self.events[0], timestamp="2026-10-03T04:05:00")])
        self.assertTrue(self.analyze(total_available=100)["truncated"])
        self.assertIn("registro", self.analyze(source="portal")["timestampBasis"])
        dense = [dict(self.events[0], id=f"event-{i:02}") for i in range(60)]
        output = self.analyze(dense)
        self.assertTrue(output["linksTruncated"])
        self.assertEqual(len(output["links"]), 40)
        self.assertEqual(len(output["groups"][0]["incidentIds"]), 60)
        self.assertLess(len(json.dumps(output).encode()), 100000)


if __name__ == "__main__":
    unittest.main()
