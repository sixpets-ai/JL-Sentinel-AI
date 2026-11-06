import { SimulateGlobalRouteResponse } from "@workspace/api-zod";
import { runPythonJson } from "./python-json";

export async function simulateRoute(points: { name: string; lat: number; lng: number }[], quantumDemo = false) {
  return SimulateGlobalRouteResponse.parse(await runPythonJson(
    "quantum_engine.py", [quantumDemo ? "--simulate-quantum" : "--simulate"], { points },
  ));
}
