import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Fix Leaflet Icons
delete (L.Icon.Default.prototype as any)._getIconUro
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const queryClient = new QueryClient();

// ── ErrorBoundary — atrapa cualquier excepción de render ─────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[SANTI NEXUS] ErrorBoundary caught:", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          height:"100vh", display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          backgroundColor:"#020810", color:"#ff1744", fontFamily:"monospace",
          padding:"24px", textAlign:"center",
        }}>
          <h2 style={{ letterSpacing:"3px", marginBottom:"12px" }}>⚠ ERROR DE RENDER — SANTI NEXUS</h2>
          <pre style={{ fontSize:"11px", color:"#ff6d00", maxWidth:"700px", whiteSpace:"pre-wrap", textAlign:"left" }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              marginTop:"20px", padding:"10px 28px", background:"#ff1744",
              color:"#000", border:"none", borderRadius:"6px",
              fontFamily:"monospace", fontWeight:"bold", cursor:"pointer",
            }}
          >
            REINICIAR SISTEMA
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
