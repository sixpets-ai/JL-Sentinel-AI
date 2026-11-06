import { Link, Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import SantiCommand from "@/pages/santi-command";
import NotFound from "@/pages/not-found";

const GlobalCommand = lazy(() => import("@/pages/global-command"));
const TacticalDemo = lazy(() => import("@/pages/tactical-demo"));
const demoLinkStyle = {
  position: "fixed", bottom: 14, left: 14, zIndex: 1500, padding: "7px 14px", borderRadius: 999,
  font: "600 10px 'JetBrains Mono', monospace", letterSpacing: ".14em", textTransform: "uppercase",
  color: "#ffd9a8", background: "rgba(24,14,48,.78)", border: "1px solid rgba(255,159,51,.5)",
  backdropFilter: "blur(10px)", textDecoration: "none",
} as const;
function DemoWithLoading() {
  return <Suspense fallback={<div role="status" style={{padding:32,color:"#ffb057",background:"#0b0918",minHeight:"100dvh"}}>Cargando demo táctica…</div>}><TacticalDemo /></Suspense>;
}
function GlobalWithLoading() {
  return <Suspense fallback={<div role="status" style={{padding:32,color:"#C8A84B",background:"#000509",minHeight:"100dvh"}}>Cargando Centro Global…</div>}><GlobalCommand /><Link href="/demo" data-testid="link-demo-global" style={demoLinkStyle}>Demo táctica</Link></Suspense>;
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
    </>
  );
}

function App() {
  return (
    <Switch>
      <Route path="/" component={NexusWithGlobalLink} />
      <Route path="/global" component={GlobalWithLoading} />
      <Route path="/demo" component={DemoWithLoading} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
