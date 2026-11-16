import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const ALERTAS = [
  {id:"A-001",nivel:"Alta",tipo:"Homicidio",sector:"Iztapalapa",tiempo:"02:14",unidad:"SSP-042",coords:[19.3550,-99.0920]},
  {id:"A-002",nivel:"Alta",tipo:"Robo a negocio",sector:"Gustavo A. M.",tiempo:"03:41",unidad:"SSPC-107",coords:[19.4800,-99.1150]},
  {id:"A-003",nivel:"Media",tipo:"Accidente vial",sector:"Tlalpan",tiempo:"01:08",unidad:"BOMB-015",coords:[19.2900,-99.1600]},
  {id:"A-004",nivel:"Media",tipo:"Codigo Violeta",sector:"Benito Juarez",tiempo:"00:32",unidad:"SSP-318",coords:[19.3980,-99.1600]},
  {id:"A-005",nivel:"Baja",tipo:"Disturbio",sector:"Coyoacan",tiempo:"04:55",unidad:"GN-201",coords:[19.3500,-99.1600]},
  {id:"A-006",nivel:"Alta",tipo:"Secuestro activo",sector:"Alvaro Obregon",tiempo:"00:12",unidad:"FGR-523",coords:[19.3600,-99.2000]}
];

const KPI = [
  {label:"Unidades activas",valor:390,icono:"🚔",color:"#00e5ff"},
  {label:"Incidentes hoy",valor:847,icono:"📋",color:"#ff6d00"},
  {label:"Alertas criticas",valor:12,icono:"🔴",color:"#ff1744"},
  {label:"Cobertura",valor:"98.6%",icono:"🛰️",color:"#00e676"},
  {label:"Sensores",valor:1248,icono:"📡",color:"#aa00ff"},
  {label:"Equipos campo",valor:24,icono:"🪖",color:"#ffd600"}
];

const C: Record<string,string> = {Alta:"#ff1744",Media:"#ff6d00",Baja:"#ffd600"};

const CSS = "@keyframes pal{0%,100%{opacity:1;transform:scale(1)}50%{opacity:1;transform:scale(1.25)}}@keyframes blk{0%,100%{opacity:1}50%{opacity:0.2}}@keyframes scn{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#00e5ff33}";

export default function CommandView() {
  const mapRef = useRef<maplibregl.Map|null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [sel, setSel] = useState<typeof ALERTAS[0]|null>(null);
  const [drone, setDrone] = useState(false);
  const [hora, setHora] = useState("");

  useEffect(() => {
    const iv = setInterval(() => setHora(new Date().toLocaleTimeString("es-MX",{hour12:false})), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let dead = false;
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          esri: {
            type: "raster",
            tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            tileSize: 256
          }
        },
        layers: [{id:"esri",type:"raster",source:"esri"}]
      },
      center: [-99.1332, 19.4326],
      zoom: 10,
      attributionControl: false
    });
    mapRef.current = map;
    map.on("load", () => {
      if (dead) return;
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      ALERTAS.forEach(a => {
        const el = document.createElement("div");
        el.style.cssText = "width:14px;height:14px;border-radius:50%;background:" + C[a.nivel] + ";border:2px solid #fff;animation:pal 1.5s ease-in-out infinite;cursor:pointer;box-shadow:0 0 8px " + C[a.nivel];
        el.onclick = () => setSel(a);
        markersRef.current.push(
          new maplibregl.Marker({element:el}).setLngLat([a.coords[1],a.coords[0]]).addTo(map)
        );
      });
    });
    return () => {
      dead = true;
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const P: React.CSSProperties = {
    background:"#060e1a",
    border:"1px solid #00e5ff22",
    borderRadius:4,
    padding:"10px 8px",
    display:"flex",
    flexDirection:"column",
    gap:6,
    overflowY:"auto"
  };
  const LB: React.CSSProperties = {
    fontSize:9,
    color:"#00e5ff99",
    textTransform:"uppercase",
    letterSpacing:1,
    marginBottom:2
  };

  return (
    <div style={{width:"100vw",height:"100vh",background:"#030810",fontFamily:"Courier New,monospace",display:"flex",flexDirection:"column",overflow:"hidden",color:"#c8e6ff"}}>
      <style>{CSS}</style>

      <div style={{background:"#060e1a",borderBottom:"1px solid #00e5ff33",padding:"6px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <div style={{fontSize:15,fontWeight:"bold",color:"#00e5ff",letterSpacing:3}}>SANTI NEXUS - MANDO ESTRATEGICO NACIONAL</div>
          <div style={{fontSize:9,color:"#00e5ff88",letterSpacing:2}}>SECRETARIA DE SEGURIDAD PUBLICA - IBM WATSONX - NIVEL ULTRA SECRETO</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:18,color:"#00e5ff",fontWeight:"bold",animation:"blk 2s infinite"}}>{hora}</div>
          <div style={{fontSize:9,color:"#ff1744",animation:"blk 3s infinite"}}>SISTEMA EN LINEA</div>
        </div>
      </div>

      <div style={{display:"flex",gap:6,padding:"6px 10px",background:"#040c16",borderBottom:"1px solid #00e5ff22",flexShrink:0}}>
        {KPI.map(k => (
          <div key={k.label} style={{flex:1,background:"#060e1a",border:"1px solid #ffffff22",borderRadius:4,padding:"5px 8px",textAlign:"center"}}>
            <div style={{fontSize:16}}>{k.icono}</div>
            <div style={{fontSize:16,fontWeight:"bold",color:k.color}}>{k.valor}</div>
            <div style={{fontSize:8,color:"#8899aa"}}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden",padding:"6px",gap:6}}>

        <div style={{...P,width:250,flexShrink:0}}>
          <div style={LB}>Alertas Activas</div>
          {ALERTAS.map(a => (
            <div key={a.id}
              onClick={() => { setSel(a); mapRef.current?.flyTo({center:[a.coords[1],a.coords[0]],zoom:14}); }}
              style={{background:sel?.id===a.id?"#00e5ff11":"#0a1628",border:"1px solid "+C[a.nivel]+"66",borderLeft:"3px solid "+C[a.nivel],borderRadius:3,padding:"5px 7px",cursor:"pointer",marginBottom:3}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:10,color:C[a.nivel],fontWeight:"bold"}}>{a.id}</span>
                <span style={{fontSize:9,color:"#aaa"}}>{a.tiempo}</span>
              </div>
              <div style={{fontSize:11,color:"#e0eeff"}}>{a.tipo}</div>
              <div style={{fontSize:9,color:"#8899aa"}}>{a.sector} - {a.unidad}</div>
            </div>
          ))}
          <div style={{marginTop:8,...LB}}>Telemetria</div>
          {[{l:"CPU Watsonx",v:67,c:"#00e5ff"},{l:"Memoria RAM",v:82,c:"#aa00ff"},{l:"Red Tactica",v:94,c:"#00e676"}].map(t => (
            <div key={t.l} style={{marginBottom:4}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#aaa",marginBottom:2}}>
                <span>{t.l}</span><span style={{color:t.c}}>{t.v}%</span>
              </div>
              <div style={{background:"#0a1628",borderRadius:2,height:4}}>
                <div style={{width:t.v+"%",height:"100%",background:t.c,borderRadius:2}}/>
              </div>
            </div>
          ))}
          <div style={{marginTop:8,...LB}}>Infraestructura</div>
          {[{l:"Camaras C5",v:342,t:400,c:"#00e5ff"},{l:"Drones",v:18,t:24,c:"#aa00ff"},{l:"Patrullas GPS",v:390,t:420,c:"#00e676"}].map(i => (
            <div key={i.l} style={{fontSize:9,color:"#aaa",marginBottom:3}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:1}}>
                <span>{i.l}</span><span style={{color:i.c}}>{i.v}/{i.t}</span>
              </div>
              <div style={{background:"#0a1628",borderRadius:2,height:3}}>
                <div style={{width:(i.v/i.t*100)+"%",height:"100%",background:i.c,borderRadius:2}}/>
              </div>
            </div>
          ))}
        </div>

        <div style={{flex:1,position:"relative",border:"1px solid #00e5ff33",borderRadius:4,overflow:"hidden"}}>
          <div ref={containerRef} style={{width:"100%",height:"100%"}}/>
          {drone && (
            <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,pointerEvents:"none",zIndex:10}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(transparent,#00e5ff88,transparent)",animation:"scn 2s linear infinite"}}/>
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:60,height:60,border:"2px solid #00e5ff88",borderRadius:"50%"}}/>
              <div style={{position:"absolute",top:8,left:8,fontSize:9,color:"#00e5ff",background:"#030810cc",padding:"2px 6px",borderRadius:2}}>MODO DRONE ACTIVO</div>
            </div>
          )}
          {sel && (
            <div style={{position:"absolute",bottom:50,left:"50%",transform:"translateX(-50%)",background:"#060e1aee",border:"1px solid "+C[sel.nivel],borderRadius:6,padding:"10px 14px",minWidth:220,zIndex:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{color:C[sel.nivel],fontWeight:"bold",fontSize:11}}>{sel.id} - {sel.nivel.toUpperCase()}</span>
                <span onClick={() => setSel(null)} style={{cursor:"pointer",color:"#aaa",fontSize:14}}>X</span>
              </div>
              <div style={{fontSize:13,color:"#e0eeff",marginBottom:4}}>{sel.tipo}</div>
              <div style={{fontSize:10,color:"#8899aa"}}>{sel.sector} - {sel.unidad}</div>
              <div style={{fontSize:10,color:"#8899aa"}}>Hace {sel.tiempo}</div>
            </div>
          )}
          <div style={{position:"absolute",top:8,right:8,display:"flex",flexDirection:"column",gap:4,zIndex:15}}>
            <button onClick={() => mapRef.current?.flyTo({center:[-99.1332,19.4326],zoom:10})} style={{background:"#060e1a",border:"1px solid #00e5ff44",color:"#00e5ff",padding:"4px 8px",borderRadius:3,cursor:"pointer",fontSize:10}}>MX</button>
            <button onClick={() => setDrone(d => !d)} style={{background:drone?"#00e5ff22":"#060e1a",border:"1px solid "+(drone?"#00e5ff":"#00e5ff44"),color:"#00e5ff",padding:"4px 8px",borderRadius:3,cursor:"pointer",fontSize:10}}>DRONE</button>
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:0,background:"#030810cc",borderTop:"1px solid #00e5ff22",padding:"4px 10px",display:"flex",gap:16,overflowX:"auto"}}>
            {ALERTAS.map(a => (
              <div key={a.id} onClick={() => { setSel(a); mapRef.current?.flyTo({center:[a.coords[1],a.coords[0]],zoom:14}); }} style={{flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:C[a.nivel],animation:"blk 1.5s infinite"}}/>
                <span style={{fontSize:9,color:"#aaa",whiteSpace:"nowrap"}}>{a.sector}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{...P,width:260,flexShrink:0}}>
          <div style={LB}>CAM-NOR-04 En Vivo</div>
          <div style={{background:"#000",borderRadius:4,height:120,position:"relative",border:"1px solid #333",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:20}}>📷</div>
              <div style={{fontSize:9,color:"#00e676",animation:"blk 1s infinite"}}>FEED EN VIVO</div>
              <div style={{fontSize:8,color:"#555"}}>Iztapalapa Norte HD</div>
            </div>
            <div style={{position:"absolute",top:4,left:4,fontSize:8,color:"#ff1744",animation:"blk 1s infinite"}}>REC</div>
            <div style={{position:"absolute",top:4,right:4,fontSize:8,color:"#00e5ff"}}>{hora}</div>
          </div>
          <div style={{marginTop:4,...LB}}>Sensores Ambientales</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
            {[{l:"Temperatura",v:"22C",c:"#ff6d00"},{l:"Humedad",v:"68%",c:"#00e5ff"},{l:"Visibilidad",v:"9.2km",c:"#00e676"},{l:"Viento",v:"14km/h",c:"#aa00ff"}].map(s => (
              <div key={s.l} style={{background:"#0a1628",borderRadius:3,padding:"5px 6px",border:"1px solid #ffffff11"}}>
                <div style={{fontSize:8,color:"#8899aa"}}>{s.l}</div>
                <div style={{fontSize:13,color:s.c,fontWeight:"bold"}}>{s.v}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:4,...LB}}>Reporte del Dia</div>
          <div style={{fontSize:9,color:"#8899aa",lineHeight:1.6}}>
            <div>Incidentes criticos: <span style={{color:"#ff1744"}}>12</span></div>
            <div>Incidentes medios: <span style={{color:"#ff6d00"}}>34</span></div>
            <div>Incidentes bajos: <span style={{color:"#00e676"}}>89</span></div>
            <div>Resueltos: <span style={{color:"#00e676"}}>847</span></div>
            <div>Codigo Violeta: <span style={{color:"#aa00ff"}}>4</span></div>
          </div>
          <div style={{marginTop:4,...LB}}>Acciones Rapidas</div>
          {[{l:"Despachar Unidad",c:"#00e5ff"},{l:"Activar Dron",c:"#aa00ff"},{l:"Alerta Masiva",c:"#ff6d00"},{l:"Cerrar Perimetro",c:"#ff1744"}].map(b => (
            <button key={b.l} style={{background:"#0a1628",border:"1px solid "+b.c+"55",color:b.c,padding:"6px 10px",borderRadius:3,cursor:"pointer",fontSize:10,textAlign:"left",marginBottom:3}}>{b.l}</button>
          ))}
          <div style={{marginTop:"auto",paddingTop:8,borderTop:"1px solid #00e5ff11",fontSize:8,color:"#334455",textAlign:"center"}}>
            <div>IBM WATSONX - SANTI NEXUS v2.0</div>
            <div>CLASIFICADO - USO GUBERNAMENTAL</div>
            <div>SSP - SSPC - FGR - GN - C5</div>
          </div>
        </div>

      </div>
    </div>
  );
}
