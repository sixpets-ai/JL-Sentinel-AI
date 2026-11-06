import { Link, Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import SantiCommand from "@/pages/santi-command";
import NotFound from "@/pages/not-found";
import { PortalEntryLink } from "@/components/portal/portal-shell";

const GlobalCommand = lazy(() => import("@/pages/global-command"));
const TacticalDemo = lazy(() => import("@/pages/tactical-demo"));
const Transparencia = lazy(() => import("@/pages/transparencia"));
const Acceso = lazy(() => import("@/pages/acceso"));
const Legal = lazy(() => import("@/pages/legal"));
const Ciudadano = lazy(() => import("@/pages/ciudadano"));
const Patrulla = lazy(() => import("@/pages/patrulla"));
const Operaciones = lazy(() => import("@/pages/operaciones"));
const demoLinkStyle = {
  position: "fixed", bottom: 14, left: 14, zIndex: 1500, padding: "7px 14px", borderRadius: 999,
  font: "600 10px 'JetBrains Mono', monospace", letterSpacing: ".14em", textTransform: "uppercase",
  color: "#ffd9a8", background: "rgba(24,14,48,.78)", border: "1px solid rgba(255,159,51,.5)",
  backdropFilter: "blur(10px)", textDecoration: "none",
} as const;
const portalLinkStyle = { ...demoLinkStyle, left: "auto", right: 14, color: "#cfeff0", borderColor: "rgba(90,220,220,.5)", background: "rgba(8,30,40,.78)" } as const;
function Loading({ label }: { label: string }) {
  return <div role="status" style={{ padding: 32, color: "#7fd8dc", background: "#081019", minHeight: "100dvh" }}>{label}</div>;
}
function DemoWithLoading() {
  return <Suspense fallback={<div role="status" style={{padding:32,color:"#ffb057",background:"#0b0918",minHeight:"100dvh"}}>Cargando demo táctica…</div>}><TacticalDemo /></Suspense>;
}
function GlobalWithLoading() {
  return <Suspense fallback={<div role="status" style={{padding:32,color:"#C8A84B",background:"#000509",minHeight:"100dvh"}}>Cargando Centro Global…</div>}><GlobalCommand /><Link href="/demo" data-testid="link-demo-global" style={demoLinkStyle}>Demo táctica</Link><Link href="/transparencia" data-testid="link-transparencia-global" style={{ ...demoLinkStyle, left: 150, color: "#bff5e4", borderColor: "rgba(80,220,180,.5)" }}>Transparencia</Link><PortalEntryLink style={portalLinkStyle} /></Suspense>;
}
function TransparenciaWithLoading() {
  return <Suspense fallback={<div role="status" style={{padding:32,color:"#7ee8c8",background:"#0b0918",minHeight:"100dvh"}}>Cargando transparencia…</div>}><Transparencia /></Suspense>;
}
function NexusWithGlobalLink() {
  return (
    <>
      <SantiCommand />
      <Link
        href="/global"
        data-testid="link-global"
        style={{
          position: "fixed", top: 6, left: "50%", transform: "translateX(-50%)", zIndex: 1500,
          padding: "5px 12px", borderRadius: 999, font: "600 10px 'JetBrains Mono', monospace", letterSpacing: ".14em",
          textTransform: "uppercase", color: "#cfeff0", background: "rgba(8,30,40,.72)",
          border: "1px solid rgba(90,220,220,.4)", backdropFilter: "blur(10px)", textDecoration: "none",
        }}
      >
        Vista global
      </Link>
      <PortalEntryLink style={{ ...portalLinkStyle, bottom: 14 }} />
    </>
  );
}
const lazyPage = (C: ComponentType, label: string) => () => <Suspense fallback={<Loading label={label} />}><C /></Suspense>;
const AccesoPage = lazyPage(Acceso, "Cargando acceso…");
const LegalPage = lazyPage(Legal, "Cargando aviso…");
const CiudadanoPage = lazyPage(Ciudadano, "Cargando portal ciudadano…");
const PatrullaPage = lazyPage(Patrulla, "Cargando portal de patrulla…");
const OperacionesPage = lazyPage(Operaciones, "Cargando operaciones…");

function App() {
  return (
    <Switch>
      <Route path="/" component={NexusWithGlobalLink} />
      <Route path="/global" component={GlobalWithLoading} />
      <Route path="/demo" component={DemoWithLoading} />
      <Route path="/transparencia" component={TransparenciaWithLoading} />
      <Route path="/acceso" component={AccesoPage} />
      <Route path="/legal/:section" component={LegalPage} />
      <Route path="/ciudadano" component={CiudadanoPage} />
      <Route path="/patrulla" component={PatrullaPage} />
      <Route path="/operaciones" component={OperacionesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
