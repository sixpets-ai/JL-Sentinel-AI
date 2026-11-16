const fs = require('fs');

// Restaurar desde backup
const orig = fs.readFileSync('C:\\Users\\Wyse\\Desktop\\sabana_full.txt', 'utf8');

// Verificar posiciones
const s = orig.indexOf('{/* TARJETAS INFORMATIVAS */}');
const eSearch = orig.indexOf(') : (', s);
console.log('s:' + s + ' e:' + eSearch);

if (s < 0 || eSearch < 0) {
  console.log('ERROR: posiciones no encontradas');
  process.exit(1);
}

// Nuevo bloque - comillas dobles normales en JSX (esto es Node.js, no PowerShell)
const newBlock = '{/* TARJETAS INFORMATIVAS */}\n' +
'          {rows.length > 0 && (\n' +
'            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, margin: "8px 0" }}>\n' +
'              <div style={{ background: "rgba(0,212,255,0.08)", border: "1px solid #00d4ff", borderRadius: 6, padding: "8px", textAlign: "center" }}>\n' +
'                <div style={{ color: "#00d4ff", fontSize: 18, fontWeight: "bold" }}>{rows.length}</div>\n' +
'                <div style={{ color: "#888", fontSize: 9 }}>Registros</div>\n' +
'              </div>\n' +
'              <div style={{ background: "rgba(255,200,0,0.08)", border: "1px solid #ffc800", borderRadius: 6, padding: "8px", textAlign: "center" }}>\n' +
'                <div style={{ color: "#ffc800", fontSize: 18, fontWeight: "bold" }}>{new Set(rows.map(r => r.phone)).size}</div>\n' +
'                <div style={{ color: "#888", fontSize: 9 }}>Tel\u00e9fonos</div>\n' +
'              </div>\n' +
'              <div style={{ background: "rgba(160,100,255,0.08)", border: "1px solid #a064ff", borderRadius: 6, padding: "8px", textAlign: "center" }}>\n' +
'                <div style={{ color: "#a064ff", fontSize: 18, fontWeight: "bold" }}>{new Set(rows.map(r => r.cellId)).size}</div>\n' +
'                <div style={{ color: "#888", fontSize: 9 }}>Celdas</div>\n' +
'              </div>\n' +
'              <div style={{ background: "rgba(0,255,100,0.08)", border: "1px solid #00ff64", borderRadius: 6, padding: "8px", textAlign: "center" }}>\n' +
'                <div style={{ color: "#00ff64", fontSize: 18, fontWeight: "bold" }}>{new Set(rows.map(r => r.imei)).size}</div>\n' +
'                <div style={{ color: "#888", fontSize: 9 }}>IMEIs</div>\n' +
'              </div>\n' +
'            </div>\n' +
'          )}\n' +
'          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginTop: 8 }}>\n' +
'            {[\n' +
'              { label: "TOPOGRAF\u00cdA", desc: "Mapa de celdas", tab: "map" },\n' +
'              { label: "ZONA DE CONFORT", desc: "Zonas frecuentes", tab: "table" },\n' +
'              { label: "GRAFO DE CRUCES", desc: "Red de contactos", tab: "graph" },\n' +
'              { label: "TABLA FILTRABLE", desc: "Registros filtrados", tab: "table" },\n' +
'            ].map(f => (\n' +
'              <div key={f.label} onClick={() => setTab(f.tab as "map" | "graph" | "table")} style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(0,255,200,0.03)", border: "1px solid rgba(0,255,200,0.15)", cursor: "pointer" }}>\n' +
'                <p style={{ color: "#00ffcc", fontSize: 9, margin: "0 0 5px", fontWeight: "bold" }}>{f.label}</p>\n' +
'                <p style={{ color: "#3a6a5a", fontSize: 8, margin: 0, lineHeight: 1.5 }}>{f.desc}</p>\n' +
'              </div>\n' +
'            ))}\n' +
'          </div>';

const result = orig.slice(0, s) + newBlock + orig.slice(eSearch);
fs.writeFileSync('SabanaAnalyzer.tsx', result, 'utf8');
console.log('DONE len:' + result.length);

// Verificar que no hay \" en el resultado
const check = result.indexOf('\\"');
console.log('backslash-quote check (debe ser -1):' + check);
