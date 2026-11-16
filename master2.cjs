const fs = require('fs');

// 1. Restaurar desde backup limpio
const orig = fs.readFileSync('C:\\Users\\Wyse\\Desktop\\sabana_full.txt', 'utf8');
console.log('backup len:' + orig.length);

// 2. Encontrar la posicion del bloque TARJETAS en el original
const MARKER_START = '{/* TARJETAS INFORMATIVAS */}';
const s = orig.indexOf(MARKER_START);
console.log('TARJETAS pos:' + s);

if (s < 0) { console.log('ERROR: no se encontro TARJETAS'); process.exit(1); }

// 3. Encontrar el fin del bloque TARJETAS - buscar el inicio del TAB DEL GRAFO
// En el original, despues de TARJETAS viene el bloque del mapa con cierre )} </> )}
// Luego viene {/* TAB DEL GRAFO (i2) */}
const MARKER_GRAFO = '{/* TAB DEL GRAFO (i2) */}';
const eGrafo = orig.indexOf(MARKER_GRAFO, s);
console.log('GRAFO pos:' + eGrafo);

if (eGrafo < 0) { console.log('ERROR: no se encontro TAB DEL GRAFO'); process.exit(1); }

// El bloque a reemplazar es desde s hasta eGrafo (sin incluir el marcador del grafo)
// Necesitamos ver que hay entre TARJETAS y TAB DEL GRAFO
const between = orig.slice(s, eGrafo);
console.log('between len:' + between.length);
console.log('between primeros 200 chars:');
console.log(JSON.stringify(between.substring(0, 200)));

// 4. Construir nuevo bloque - debe terminar igual que el original
// Usamos el mismo contenido del original EXCEPTO reemplazamos solo el bloque TARJETAS
// El original tiene la estructura:
//   {/* TARJETAS INFORMATIVAS */}  <- s
//   <TAB ... />
//   <TAB ... />    (estas son las tarjetas originales simples)
//
// Lo que queremos: reemplazar solo las tarjetas (el bloque hasta el primer </div> que cierra las tarjetas)
// y dejar intacto el resto hasta TAB DEL GRAFO

// Buscar fin del bloque de tarjetas originales: el </div> que las cierra
// En el original las tarjetas terminan con </div> seguido de newline y luego el contexto del mapa
// Vamos a ser mas precisos: buscar el primer </div> despues de TARJETAS
// que va seguido de newline+espacios+{/* Leyenda
const LEYENDA_MARKER = '{/* Leyenda de Zonas */}';
const eLeyenda = orig.indexOf(LEYENDA_MARKER, s);
console.log('LEYENDA pos:' + eLeyenda);

// Si hay leyenda, el bloque TARJETAS termina justo antes del marcador de leyenda
if (eLeyenda > s && eLeyenda < eGrafo) {
  // El bloque original de tarjetas va de s hasta antes de LEYENDA_MARKER
  // Buscar el ultimo \n antes de LEYENDA_MARKER para obtener la posicion de corte
  let eOld = eLeyenda;
  // Retroceder hasta el inicio de la linea
  while (eOld > s && orig[eOld-1] !== '\n') eOld--;
  console.log('eOld (antes de Leyenda):' + eOld);

  const TAB = '          ';
  const newCards = [
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
    TAB,  // linea vacia para separar
  ].join('\n');

  // Construir resultado: antes del bloque original + nuevo bloque + resto (desde eLeyenda en adelante)
  let result = orig.slice(0, s) + newCards + orig.slice(eOld);

  // Fix backslash-quotes en todo el archivo
  const bq = String.fromCharCode(92) + '"';
  result = result.split(bq + 'graph' + bq).join('"graph"');
  result = result.split(bq + 'map' + bq).join('"map"');
  result = result.split(bq + 'table' + bq).join('"table"');
  result = result.split(bq + 'hidden' + bq).join('"hidden"');
  result = result.split(bq + 'flex' + bq).join('"flex"');
  result = result.split(bq + 'column' + bq).join('"column"');

  const bqCount = (result.match(/\\"/g) || []).length;
  console.log('backslash-quotes restantes:' + bqCount);
  console.log('result len:' + result.length);

  fs.writeFileSync('SabanaAnalyzer.tsx', result, 'utf8');
  console.log('DONE');

} else {
  // No hay marcador de leyenda - usar el metodo original con ) : (
  console.log('FALLBACK: usando metodo ) : (');
  const e = orig.indexOf(') : (', s);
  console.log('e:' + e);
  if (e < 0) { console.log('ERROR: no se encontro ) : ('); process.exit(1); }

  const TAB = '          ';
  const newCards = [
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
  ].join('\n');

  let result = orig.slice(0, s) + newCards + orig.slice(e);

  const bq = String.fromCharCode(92) + '"';
  result = result.split(bq + 'graph' + bq).join('"graph"');
  result = result.split(bq + 'map' + bq).join('"map"');
  result = result.split(bq + 'table' + bq).join('"table"');

  const bqCount = (result.match(/\\"/g) || []).length;
  console.log('backslash-quotes restantes:' + bqCount);
  console.log('result len:' + result.length);

  fs.writeFileSync('SabanaAnalyzer.tsx', result, 'utf8');
  console.log('DONE FALLBACK');
}
