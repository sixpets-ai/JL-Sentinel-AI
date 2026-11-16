const fs = require('fs');
const path = 'C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols\\server.js';
let src = fs.readFileSync(path,'utf8');

// Eliminar TODO el bloque officer-panic (puede haber quedado duplicado/roto)
// y reemplazarlo limpio
const regex = /app\.post\("\/api\/officer-panic"[\s\S]*?(?=app\.get\("\/api\/panic-state")/;

const newPanic = `app.post("/api/officer-panic", async (req, res) => {
  try {
    const { officerId = "CIUDADANO", lat = 19.4326, lng = -99.1332, message = "Alerta" } = req.body;
    if (!panicState || !Array.isArray(panicState.events)) panicState = { active: false, events: [] };
    const entry = audit("PANIC", { officerId, lat, lng, message });
    panicState.active = true; panicState.events.unshift(entry);
    try { await sendTelegram(\`CÓDIGO VIOLETA\nElemento: \${officerId}\nFolio: \${entry.folio}\`); } catch(te){}
    res.json({ ok:true, folio: entry.folio, officerId, lat, lng, timestamp: entry.timestamp });
  } catch(err) {
    console.error("[PANIC ERROR]", err.message);
    res.status(500).json({ error: err.message });
  }
});
`;

if (!regex.test(src)) { console.log("PATRON NO ENCONTRADO"); process.exit(1); }
const out = src.replace(regex, newPanic);
fs.writeFileSync(path, out, 'utf8');
console.log("FIX PANIC CLEAN OK");
