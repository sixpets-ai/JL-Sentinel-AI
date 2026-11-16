const fs = require("fs");
const f = "App.tsx";
let c = fs.readFileSync(f, "utf8");

const v1 = `{!isAuth && view === "map3d"     && <div key="map3d-container" style={{width:'100%',height:'100%'}}><TacticalMap3D /></div>}`;
const v2 = `{!isAuth && view === "map3d"     && <TacticalMap3D />}`;
const nuevo = `{!isAuth && <div key="map3d-container" style={{width:"100%",height:"100%",display:view==="map3d"?"block":"none"}}><TacticalMap3D /></div>}`;

if (c.includes(v1)) {
  fs.writeFileSync(f, c.replace(v1, nuevo));
  console.log("FIX MAP3D CSS-HIDE OK (v1)");
} else if (c.includes(v2)) {
  fs.writeFileSync(f, c.replace(v2, nuevo));
  console.log("FIX MAP3D CSS-HIDE OK (v2)");
} else {
  c.split("\n").forEach((l,i)=>{ if(l.includes("map3d")||l.includes("TacticalMap3D")) console.log(i+1+":",l.trim()); });
}
