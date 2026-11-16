const fs = require('fs');

// 1. Restaurar desde backup limpio
const orig = fs.readFileSync('C:\\Users\\Wyse\\Desktop\\sabana_full.txt', 'utf8');
console.log('backup len:' + orig.length);

// 2. Encontrar posiciones exactas
const s = orig.indexOf('{/* TARJETAS INFORMATIVAS */}');
const e = orig.indexOf(') : (', s);
console.log('s:' + s + ' e:' + e);

if (s < 0 || e < 0) { console.log('ERROR pos'); process.exit(1); }

// 3. Nuevo bloque limpio (comillas dobles normales en Node.js string)
const TAB = '          ';
const lines = [
  '{/* TARJETAS INFORMATIVAS */}',
  TAB + '{rows.length > 0 && (',
  TAB + '  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, margin: "8px 0" }}>',
  TAB + '    <div style={{ background: "rgba(0,212,255,0.08)", border: "1px solid #00d4ff", borderRadius: 6, padding: "8px", textAlign: "center" }}>',
  TAB + '      <div style={{ color: "#00d4ff", fontSize: 18, fontWeight: "bold" }}>{rows.length}</div>',
  TAB + '      <div style={{ color: "#888", fontSize: 9 }}>Registros</div>',
  TAB + '    </div>',
  TAB + '    <div style={{ background: "rgba(255,200,0,0.08)", border: "1px solid #ffc800", borderRadius: 6, padding: "8px", textAlign: "center" }}>',
  TAB + '      <div style={{ color: "#ffc800", fontSize: 18, fontWeight: "bold" }}>{new Set(rows.map(r => r.phone)).size}</div>',
  TAB + '      <div style={{ color: "#888", fontSize: 9 }}>Tel\u00e9fonos</div>',
  TAB + '    </div>',
  TAB + '    <div style={{ background: "rgba(160,100,255,0.08)", border: "1px solid #a064ff", borderRadius: 6, padding: "8px", textAlign: "center" }}>',
  TAB + '      <div style={{ color: "#a064ff", fontSize: 18, fontWeight: "bold" }}>{new Set(rows.map(r => r.cellId)).size}</div>',
  TAB + '      <div style={{ color: "#888", fontSize: 9 }}>Celdas</div>',
  TAB + '    </div>',
  TAB + '    <div style={{ background: "rgba(0,255,100,0.08)", border: "1px solid #00ff64", borderRadius: 6, padding: "8px", textAlign: "center" }}>',
  TAB + '      <div style={{ color: "#00ff64", fontSize: 18, fontWeight: "bold" }}>{new Set(rows.map(r => r.imei)).size}</div>',
  TAB + '      <div style={{ color: "#888", fontSize: 9 }}>IMEIs</div>',
  TAB + '    </div>',
  TAB + '  </div>',
  TAB + ')}',
  TAB + '<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginTop: 8 }}>',
  TAB + '  {[',
  TAB + '    { label: "TOPOGRAF\u00cdA", desc: "Mapa de celdas", tab: "map" },',
  TAB + '    { label: "ZONA DE CONFORT", desc: "Zonas frecuentes", tab: "table" },',
  TAB + '    { label: "GRAFO DE CRUCES", desc: "Red de contactos", tab: "graph" },',
  TAB + '    { label: "TABLA FILTRABLE", desc: "Registros filtrados", tab: "table" },',
  TAB + '  ].map(f => (',
  TAB + '    <div key={f.label} onClick={() => setTab(f.tab as "map" | "graph" | "table")} style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(0,255,200,0.03)", border: "1px solid rgba(0,255,200,0.15)", cursor: "pointer" }}>',
  TAB + '      <p style={{ color: "#00ffcc", fontSize: 9, margin: "0 0 5px", fontWeight: "bold" }}>{f.label}</p>',
  TAB + '      <p style={{ color: "#3a6a5a", fontSize: 8, margin: 0, lineHeight: 1.5 }}>{f.desc}</p>',
  TAB + '    </div>',
  TAB + '  ))}',
  TAB + '</div>',
];
const newBlock = lines.join('\n');

// 4. Tambien fix del tab === "graph" en el archivo original (ya tiene \" alli)
let result = orig.slice(0, s) + newBlock + orig.slice(e);

// Fix backslash-quotes que ya estaban en el original
const bq = String.fromCharCode(92) + '"';
result = result.split(bq + 'graph' + bq).join('"graph"');
result = result.split(bq + 'map' + bq).join('"map"');
result = result.split(bq + 'table' + bq).join('"table"');

// 5. Verificaciones
const bqCount = (result.match(/\\"/g) || []).length;
console.log('backslash-quotes restantes:' + bqCount);
console.log('result len:' + result.length);

fs.writeFileSync('SabanaAnalyzer.tsx', result, 'utf8');
console.log('DONE');
