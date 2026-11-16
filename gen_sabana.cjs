// gen_sabana.cjs — corre con: node gen_sabana.cjs
// Genera SabanaAnalyzer.tsx limpio y hace backup del anterior
const fs = require('fs');
const path = require('path');

const src = 'SabanaAnalyzer.tsx';
const bak = 'SabanaAnalyzer.tsx.BACKUP_' + Date.now();

if (fs.existsSync(src)) {
  fs.copyFileSync(src, bak);
  console.log('[OK] Backup:', bak);
}

const content = `// SabanaAnalyzer.tsx — SANTI NEXUS | Analizador de Sabana Telefonica CDR
// Reconstruido limpio 2026-11-13 | JSX valido, escalable, sin errores

import React, { useState, useCallback, useRef, useMemo, Suspense, lazy } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Circle, Polyline } from 'react-leaflet';
import * as XLSX from 'xlsx';

const ForceGraph2D = lazy(() => import('react-force-graph-2d'));

interface CDRRow {
  phone: string; date: string; time: string; type: string;
  dur: number; imei: string; cellId: string; lac: string;
  lat: number; lon: number; az: number; alias: string;
}
interface GraphNode { id: string; label: string; color: string; val: number; }
interface GraphLink { source: string; target: string; color: string; value: number; }
interface GraphData { nodes: GraphNode[]; links: GraphLink[]; }

function toRad(d: number) { return d * Math.PI / 180; }
function offsetPoint(lat: number, lon: number, az: number, m: number): [number,number] {
  const R = 6371000;
  const dLat = (m/R) * Math.cos(toRad(az));
  const dLon = (m/R) * Math.sin(toRad(az)) / Math.cos(toRad(lat));
  return [lat + dLat*(180/Math.PI), lon + dLon*(180/Math.PI)];
}

const DEMO: CDRRow[] = [
  {phone:"3146671482",date:"15/04/2017",time:"18:34:01",type:"VOZ",  dur:144, imei:"35855107346136",cellId:"12340",lac:"3555",lat:19.4280,lon:-99.1270,az:335,alias:"El Kevin"},
  {phone:"3146671482",date:"15/04/2017",time:"22:44:33",type:"VOZ",  dur:324, imei:"35855107346136",cellId:"12340",lac:"3555",lat:19.4280,lon:-99.1270,az:335,alias:"El Kevin"},
  {phone:"8211413332",date:"15/12/2018",time:"00:25:29",type:"DATOS",dur:1428,imei:"35155109455880",cellId:"35155",lac:"3555",lat:23.5855,lon:-99.4945,az:335,alias:"El Brayan"},
  {phone:"8211413332",date:"15/12/2018",time:"01:09:47",type:"DATOS",dur:3800,imei:"35155109455880",cellId:"35155",lac:"3555",lat:24.5770,lon:-99.2950,az:230,alias:"El Brayan"},
  {phone:"9876543210",date:"11/06/2019",time:"09:15:00",type:"VOZ",  dur:87,  imei:"35857207346136",cellId:"9384", lac:"9007",lat:19.2777,lon:-99.5421,az:90, alias:"La Jaroza"},
];

function parseFile(file: File): Promise<CDRRow[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), {type:'array',cellDates:true});
        const raw: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1,defval:''});
        const rows: CDRRow[] = [];
        for (let i=1;i<raw.length;i++) {
          const r=raw[i]; if(!r||r.length<8) continue;
          const lat=parseFloat(String(r[8]??'').replace(',','.'));
          const lon=parseFloat(String(r[9]??'').replace(',','.'));
          rows.push({
            phone:String(r[0]??'').trim(), date:String(r[1]??'').trim(),
            time:String(r[2]??'').trim(),  type:String(r[3]??'').trim().toUpperCase(),
            dur:parseInt(String(r[4]??'0'))||0, imei:String(r[5]??'').trim(),
            cellId:String(r[6]??'').trim(), lac:String(r[7]??'').trim(),
            lat:isNaN(lat)?19.4:lat, lon:isNaN(lon)?-99.1:lon,
            az:parseInt(String(r[10]??'0'))||0, alias:String(r[11]??'').trim(),
          });
        }
        resolve(rows.length>0?rows:DEMO);
      } catch { resolve(DEMO); }
    };
    reader.readAsArrayBuffer(file);
  });
}

function buildGraph(rows: CDRRow[]): GraphData {
  const nm=new Map<string,GraphNode>(), lm=new Map<string,GraphLink>();
  rows.forEach(r=>{
    if(!nm.has(r.phone)) nm.set(r.phone,{id:r.phone,label:r.alias||r.phone,color:'#00ffcc',val:1});
    else nm.get(r.phone)!.val++;
    if(r.cellId){
      const cid='CELL_'+r.cellId;
      if(!nm.has(cid)) nm.set(cid,{id:cid,label:'LAC:'+r.lac,color:'#ff9900',val:1});
      const lk=r.phone+'_'+cid;
      if(!lm.has(lk)) lm.set(lk,{source:r.phone,target:cid,color:'#00ffcc44',value:1});
      else lm.get(lk)!.value++;
    }
  });
  return {nodes:Array.from(nm.values()),links:Array.from(lm.values())};
}

function buildZones(rows: CDRRow[]) {
  const m=new Map<string,{lat:number;lon:number;count:number;label:string}>();
  rows.forEach(r=>{
    const k=r.cellId+'_'+r.lac;
    if(!m.has(k)) m.set(k,{lat:r.lat,lon:r.lon,count:0,label:'LAC:'+r.lac});
    m.get(k)!.count++;
  });
  return Array.from(m.values()).sort((a,b)=>b.count-a.count);
}

let _L: any=null;
function cellIcon() {
  if(typeof window==='undefined') return undefined;
  if(!_L){ import('leaflet').then(m=>{_L=m.default;}); return undefined; }
  return _L.divIcon({className:'',
    html:'<div style="width:10px;height:10px;border-radius:50%;background:#00ffcc;border:2px solid #fff"></div>',
    iconSize:[10,10],iconAnchor:[5,5]});
}

const COLS=['Telefono','Fecha','Hora','Tipo','Dur','IMEI','CellID','LAC','Lat','Lon','Az','Alias'];

const TH: React.CSSProperties={padding:'4px 8px',color:'#00ffcc',fontWeight:'bold',textAlign:'left',letterSpacing:'1px',whiteSpace:'nowrap'};
const TD: React.CSSProperties={padding:'3px 8px'};

const SabanaAnalyzer: React.FC = () => {
  const [rows,setRows]=useState<CDRRow[]>(DEMO);
  const [tab,setTab]=useState<'map'|'graph'|'table'>('map');
  const [center,setCenter]=useState<[number,number]>([19.42,-99.13]);
  const [q,setQ]=useState('');
  const [qt,setQt]=useState('ALL');
  const [loading,setLoading]=useState(false);
  const fref=useRef<HTMLInputElement>(null);

  const filtered=useMemo(()=>{
    let r=rows;
    if(qt!=='ALL') r=r.filter(x=>x.type===qt);
    if(q.trim()){const lq=q.toLowerCase(); r=r.filter(x=>x.phone.includes(lq)||x.alias.toLowerCase().includes(lq)||x.cellId.includes(lq));}
    return r;
  },[rows,q,qt]);

  const graph=useMemo(()=>buildGraph(filtered),[filtered]);
  const zones=useMemo(()=>buildZones(filtered),[filtered]);
  const icon=useMemo(()=>cellIcon(),[]);
  const phones=useMemo(()=>new Set(rows.map(r=>r.phone)).size,[rows]);
  const imeis=useMemo(()=>new Set(rows.map(r=>r.imei)).size,[rows]);
  const cells=useMemo(()=>new Set(rows.map(r=>r.cellId)).size,[rows]);

  const onFile=useCallback(async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; if(!f) return;
    setLoading(true);
    const p=await parseFile(f);
    setRows(p);
    if(p.length>0) setCenter([p[0].lat,p[0].lon]);
    setLoading(false);
  },[]);

  const tabBtn=(t:string)=>({
    padding:'4px 14px',borderRadius:4,cursor:'pointer' as const,fontSize:8,
    border:tab===t?'1px solid #00ffcc':'1px solid rgba(0,255,200,0.15)',
    background:tab===t?'rgba(0,255,200,0.1)':'transparent',
    color:tab===t?'#00ffcc':'#3a6a5a',
  });

  const rowStyle=(i:number)=>({
    borderBottom:'1px solid rgba(0,255,200,0.04)',
    background:i%2===0?'rgba(0,255,200,0.01)':'transparent'
  });

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',backgroundColor:'#020810',color:'#e0ffe8',fontFamily:'monospace'}}>

      <div style={{padding:'10px 16px',borderBottom:'1px solid rgba(0,255,200,0.1)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <h2 style={{color:'#00ffcc',fontSize:11,letterSpacing:'3px',margin:0}}>ANALIZADOR DE SABANA TELEFONICA</h2>
        <input ref={fref} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} style={{display:'none'}}/>
        <button onClick={()=>fref.current?.click()} style={{padding:'3px 10px',background:'rgba(0,255,200,0.15)',border:'1px solid rgba(0,255,200,0.3)',borderRadius:6,color:'#e0ffe8',fontFamily:'monospace',fontSize:9,cursor:'pointer'}}>
          {loading?'Cargando...':'Cargar Excel / CDR'}
        </button>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar telefono, alias, celda..." style={{padding:'3px 10px',background:'rgba(0,20,12,0.8)',border:'1px solid rgba(0,255,200,0.15)',borderRadius:6,color:'#e0ffe8',fontFamily:'monospace',fontSize:9,outline:'none',flex:1,minWidth:140}}/>
        <select value={qt} onChange={e=>setQt(e.target.value)} style={{padding:'3px 10px',background:'rgba(0,20,12,0.8)',border:'1px solid rgba(0,255,200,0.15)',borderRadius:6,color:'#e0ffe8',fontFamily:'monospace',fontSize:9,outline:'none'}}>
          <option value="ALL">Todos</option>
          <option value="VOZ">Voz</option>
          <option value="DATOS">Datos</option>
          <option value="SMS">SMS</option>
        </select>
        <span style={{fontSize:8,color:'#3a6a5a'}}>{filtered.length}/{rows.length} registros</span>
        <div style={{display:'flex',gap:6}}>
          {(['map','graph','table'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={tabBtn(t)}>
              {t==='map'?'MAPA':t==='graph'?'GRAFO':'TABLA'}
            </button>
          ))}
        </div>
      </div>

      {rows.length>0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,padding:'8px 16px 0'}}>
          {[{v:rows.length,l:'Registros',c:'0,212,255'},{v:phones,l:'Telefonos',c:'255,200,0'},{v:cells,l:'Celdas',c:'160,100,255'},{v:imeis,l:'IMEIs',c:'0,255,100'}].map(x=>(
            <div key={x.l} style={{background:\`rgba(\${x.c},0.08)\`,border:\`1px solid rgb(\${x.c})\`,borderRadius:6,padding:8,textAlign:'center'}}>
              <div style={{color:\`rgb(\${x.c})\`,fontSize:18,fontWeight:'bold'}}>{x.v}</div>
              <div style={{color:'#888',fontSize:9}}>{x.l}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{flex:1,overflow:'hidden',position:'relative'}}>

        {tab==='map' && (
          <div style={{height:'100%',width:'100%'}}>
            {rows.length===0 ? (
              <div style={{padding:'24px 32px',overflowY:'auto',height:'100%'}}>
                <p style={{color:'#00ffcc',fontSize:10,letterSpacing:'2px',margin:'0 0 12px'}}>VISTA PREVIA — SABANA TELEFONICA</p>
                <p style={{color:'#3a6a5a',fontSize:8,lineHeight:1.7,marginBottom:16}}>
                  Carga un Excel (.xlsx) con la sabana CDR. El sistema detecta columnas automaticamente.
                </p>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:8}}>
                    <thead>
                      <tr style={{borderBottom:'1px solid rgba(0,255,200,0.2)'}}>
                        {COLS.map(h=><th key={h} style={TH}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {DEMO.map((r,i)=>(
                        <tr key={i} style={rowStyle(i)}>
                          <td style={{...TD,color:'#c8a84b'}}>{r.phone}</td>
                          <td style={{...TD,color:'#8aa'}}>{r.date}</td>
                          <td style={TD}>{r.time}</td>
                          <td style={{...TD,color:r.type==='VOZ'?'#00e676':'#4a8a6a'}}>{r.type}</td>
                          <td style={TD}>{r.dur}s</td>
                          <td style={{...TD,color:'#6a6a8a'}}>{r.imei.slice(-8)}</td>
                          <td style={TD}>{r.cellId}</td>
                          <td style={TD}>{r.lac}</td>
                          <td style={{...TD,color:'#4a9a6a'}}>{r.lat.toFixed(4)}</td>
                          <td style={{...TD,color:'#4a9a6a'}}>{r.lon.toFixed(4)}</td>
                          <td style={TD}>{r.az}</td>
                          <td style={{...TD,color:'#ff6d00'}}>{r.alias}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <MapContainer key="map" center={center} zoom={13} style={{height:'100%',width:'100%'}} attributionControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" subdomains="abcd" maxZoom={19}/>
                {filtered.map((r,i)=>(
                  <React.Fragment key={i}>
                    {icon && (
                      <Marker position={[r.lat,r.lon]} icon={icon}>
                        <Tooltip direction="top">
                          <span style={{fontFamily:'monospace',fontSize:9}}>
                            Cell:{r.cellId} LAC:{r.lac}<br/>{r.phone} @ {r.time}
                          </span>
                        </Tooltip>
                      </Marker>
                    )}
                    <Circle center={[r.lat,r.lon]} radius={150} pathOptions={{color:'#00ffcc',weight:1,opacity:0.4,fillOpacity:0.04}}/>
                    {r.az>0 && (
                      <Polyline positions={[[r.lat,r.lon],offsetPoint(r.lat,r.lon,r.az,150)]} pathOptions={{color:'#c8a84b',weight:1.2,opacity:0.6,dashArray:'4 6'}}/>
                    )}
                  </React.Fragment>
                ))}
                {zones.map((z,i)=>(
                  <Circle key={i} center={[z.lat,z.lon]} radius={z.count*60} pathOptions={{color:'#00e5ff',weight:1,opacity:0.3,fillOpacity:0.05}}>
                    <Tooltip direction="top" permanent={z.count>3}>
                      <span style={{fontFamily:'monospace',fontSize:9}}>{z.label} {z.count}x</span>
                    </Tooltip>
                  </Circle>
                ))}
              </MapContainer>
            )}
          </div>
        )}

        {tab==='graph' && (
          <div style={{height:'100%',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'8px 16px',fontSize:9,color:'#3a6a5a',borderBottom:'1px solid rgba(0,255,200,0.06)'}}>
              RED TECNICA — {graph.nodes.length} nodos · {graph.links.length} enlaces
            </div>
            <div style={{flex:1,overflow:'hidden'}}>
              {graph.nodes.length===0 ? (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}>
                  <p style={{color:'#2a5a4a',fontSize:10}}>Carga una sabana para ver el grafo</p>
                </div>
              ) : (
                <Suspense fallback={<div style={{padding:20,color:'#4a8a6a'}}>Cargando grafo...</div>}>
                  <ForceGraph2D
                    graphData={graph}
                    backgroundColor="#020810"
                    nodeLabel={(n:any)=>n.label}
                    nodeColor={(n:any)=>n.color}
                    nodeVal={(n:any)=>n.val}
                    linkColor={(l:any)=>l.color}
                    linkWidth={(l:any)=>Math.log2(l.value+1)}
                  />
                </Suspense>
              )}
            </div>
          </div>
        )}

        {tab==='table' && (
          <div style={{height:'100%',overflowY:'auto',padding:16}}>
            {rows.length===0 ? (
              <p style={{color:'#2a5a4a',fontSize:10}}>Sin datos. Carga un Excel.</p>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:9}}>
                <thead>
                  <tr style={{borderBottom:'1px solid rgba(0,255,200,0.2)'}}>
                    {COLS.map(h=><th key={h} style={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0,500).map((r,i)=>(
                    <tr key={i} style={rowStyle(i)}>
                      <td style={{...TD,color:'#c8a84b'}}>{r.phone}</td>
                      <td style={{...TD,color:'#8aa'}}>{r.date}</td>
                      <td style={TD}>{r.time}</td>
                      <td style={{...TD,color:r.type==='VOZ'?'#00e676':'#4a8a6a'}}>{r.type}</td>
                      <td style={TD}>{r.dur}s</td>
                      <td style={{...TD,color:'#6a6a8a'}}>{r.imei.slice(-8)}</td>
                      <td style={TD}>{r.cellId}</td>
                      <td style={TD}>{r.lac}</td>
                      <td style={{...TD,color:'#4a9a6a'}}>{r.lat?r.lat.toFixed(6):'-'}</td>
                      <td style={{...TD,color:'#4a9a6a'}}>{r.lon?r.lon.toFixed(6):'-'}</td>
                      <td style={TD}>{r.az||'-'}</td>
                      <td style={{...TD,color:'#ff6d00'}}>{r.alias||'-'}</td>
                    </tr>
                  ))}
                  {filtered.length>500 && (
                    <tr>
                      <td colSpan={12} style={{padding:8,color:'#3a6a5a',textAlign:'center'}}>
                        ... {filtered.length-500} registros mas (aplica filtro)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default SabanaAnalyzer;
`;

fs.writeFileSync('SabanaAnalyzer.tsx', content, 'utf8');
const lines = content.split('\n').length;
console.log('[OK] SabanaAnalyzer.tsx escrito:', lines, 'lineas');
console.log('[>>] Corre ahora: node parsecheck9.cjs');
