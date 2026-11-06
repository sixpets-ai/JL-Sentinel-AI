import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RotateCcw } from "lucide-react";

type State = "idle" | "requesting" | "live" | "captured" | "denied" | "unsupported" | "skipped";

/** Optional local-only preview. The image never leaves the browser and is never persisted. */
export function CameraCapture({ onDone, enabled }: { onDone: (mode: "captured" | "skipped") => void; enabled: boolean }) {
  const [state, setState] = useState<State>("idle");
  const [shot, setShot] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const shotRef = useRef<string | null>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  const consent = useRef(enabled);
  consent.current = enabled;

  const stop = () => { generation.current++; stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  const revoke = () => { if (shotRef.current) URL.revokeObjectURL(shotRef.current); shotRef.current = null; setShot(null); };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; stream.current?.getTracks().forEach((t) => t.stop()); if (shotRef.current) URL.revokeObjectURL(shotRef.current); };
  }, []);
  useEffect(() => {
    if (!enabled) { stop(); revoke(); setState("idle"); }
  }, [enabled]);

  useEffect(() => {
    if (state === "live" && video.current && stream.current) { video.current.srcObject = stream.current; void video.current.play().catch(() => undefined); }
  }, [state]);

  const start = async () => {
    if (!consent.current) return;
    if (!navigator.mediaDevices?.getUserMedia) return setState("unsupported");
    setState("requesting");
    const requestGeneration = ++generation.current;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (!mounted.current || !consent.current || generation.current !== requestGeneration) {
        s.getTracks().forEach(t => t.stop()); return;
      }
      stream.current = s;
      setState("live");
    } catch {
      if (!mounted.current || generation.current !== requestGeneration) return;
      stop();
      setState("denied");
    }
  };

  const capture = () => {
    if (!consent.current) return;
    const v = video.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 320; c.height = v.videoHeight || 240;
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    stop();
    const captureGeneration = generation.current;
    c.toBlob((b) => {
      if (!mounted.current || !consent.current || generation.current !== captureGeneration) return;
      if (!b) return setState("idle");
      revoke();
      const url = URL.createObjectURL(b);
      shotRef.current = url; setShot(url); setState("captured");
    }, "image/jpeg", 0.8);
  };

  const finish = (mode: "captured" | "skipped") => { stop(); revoke(); setState(mode === "skipped" ? "skipped" : "captured"); onDone(mode); };

  return (
    <div className="space-y-2 rounded-xl p-3" style={{ border: "1px dashed hsl(var(--gc-line) / .25)" }} data-testid="panel-camera">
      <p className="gc-label">Verificación de identidad (simulada, opcional)</p>
      <p className="text-[12px]" style={{ color: "hsl(var(--gc-dim))" }}>
        La imagen permanece solo en este navegador y se descarta al terminar. No se envía, no se almacena y no verifica tu identidad: la comprobación es una simulación.
      </p>
      {state === "live" && <video ref={video} muted playsInline className="w-full max-w-[320px] rounded-lg" aria-label="Vista previa local de cámara" />}
      {state === "captured" && shot && <img src={shot} alt="Captura local, no enviada" className="w-full max-w-[320px] rounded-lg" />}
      {(state === "denied" || state === "unsupported") && (
        <p role="alert" className="text-[12px]" style={{ color: "hsl(var(--gc-amber))" }} data-testid="text-camera-error">
          {state === "denied" ? "No se concedió acceso a la cámara. Puedes continuar con la simulación sin cámara." : "Este navegador no permite usar la cámara. Puedes continuar con la simulación sin cámara."}
        </p>
      )}
      {state === "skipped" && <p className="text-[12px]" role="status" style={{ color: "hsl(var(--gc-cyan))" }}>Continuarás con simulación sin cámara.</p>}
      <div className="flex flex-wrap gap-2">
        {(state === "idle" || state === "denied") && <button type="button" className="gc-btn gc-btn-ghost" disabled={!enabled} onClick={start} data-testid="button-camera-start"><Camera size={14} /> Activar cámara local</button>}
        {state === "requesting" && <span className="gc-mono text-[12px]" role="status">Solicitando permiso…</span>}
        {state === "live" && <button type="button" className="gc-btn" onClick={capture} data-testid="button-camera-capture"><Camera size={14} /> Capturar</button>}
        {shot && <button type="button" className="gc-btn gc-btn-ghost" onClick={() => { revoke(); void start(); }} data-testid="button-camera-retake"><RotateCcw size={14} /> Repetir</button>}
        {state === "captured" && shot && <button type="button" className="gc-btn" onClick={() => finish("captured")} data-testid="button-camera-finish">Terminar y descartar imagen</button>}
        {state !== "skipped" && <button type="button" className="gc-btn gc-btn-ghost" onClick={() => finish("skipped")} data-testid="button-camera-skip"><CameraOff size={14} /> Continuar con simulación sin cámara</button>}
      </div>
      {!enabled && <p className="text-[12px]">Acepta los avisos antes de habilitar la cámara opcional.</p>}
    </div>
  );
}
