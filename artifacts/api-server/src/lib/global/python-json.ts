import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export function runPythonJson(scriptName: "quantum_engine.py" | "heatmap_generator.py", args: string[], input?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const script = [path.resolve(scriptName), path.resolve("../../", scriptName)].find(existsSync);
    if (!script) { reject(new Error("No se encontró el script Python.")); return; }
    const child = spawn("python3", [script, ...args], {
      stdio: ["pipe", "pipe", "ignore"], env: { PATH: process.env.PATH },
    });
    let output = "";
    const timeout = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Tiempo de Python agotado.")); }, 5000);
    child.stdout.on("data", data => {
      output += String(data);
      if (output.length > 100000) { child.kill("SIGKILL"); reject(new Error("Salida Python demasiado grande.")); }
    });
    child.once("error", () => { clearTimeout(timeout); reject(new Error("Python no está disponible.")); });
    child.once("close", code => {
      clearTimeout(timeout);
      try {
        if (code !== 0) throw new Error("Python rechazó el cálculo.");
        resolve(JSON.parse(output));
      } catch (error) { reject(error); }
    });
    child.stdin.on("error", () => { /* Close/error handlers report failures. */ });
    child.stdin.end(input === undefined ? undefined : JSON.stringify(input));
  });
}
