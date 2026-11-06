import json
from pathlib import Path
import unittest
from heatmap_generator import build_scenario


class CrimeCatalogTests(unittest.TestCase):
    def test_imported_scope_is_explicit_and_codes_unique(self):
        catalog = json.loads((Path(__file__).resolve().parents[1] / "crime_catalog.json").read_text())
        entries = catalog["entries"]
        self.assertEqual(len(entries), len({entry["code"] for entry in entries}))
        self.assertEqual(sum(e["system"] == "RNID" for e in entries), 78)
        self.assertEqual(sum(e["system"] == "ICCS" for e in entries), 320)
        self.assertEqual(sum(e["system"] == "ICCS" and e["level"] == 1 for e in entries), 11)
        self.assertIn("INTERNOS", catalog["warning"])
        self.assertIn("71", catalog["warning"])
        self.assertTrue(all(len(source["sha256"]) == 64 for source in catalog["sources"]))

    def test_python_scenario_uses_exact_rnid_codes_and_names(self):
        catalog = json.loads((Path(__file__).resolve().parents[1] / "crime_catalog.json").read_text())
        categories = {e["code"]: e["label"] for e in catalog["entries"] if e["system"] == "RNID"}
        for incident in build_scenario()["incidents"]:
            self.assertEqual(incident["category"], categories[incident["catalogCode"]])


if __name__ == "__main__":
    unittest.main()
