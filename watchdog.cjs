const http=require("http");const https=require("https");const fs=require("fs");const path=require("path");
const TOKEN=process.env.TELEGRAM_BOT_TOKEN||"";const CHAT=process.env.TELEGRAM_CHAT_ID||"";const PORT=process.env.PORT||3001;
const LOG=path.join(__dirname,"logs","watchdog.log");const ERRL=path.join(__dirname,"logs","errors_exact.log");
const INTERVAL=15000;const COOLDOWN=300000;const lastAlert={};const fails={};const status={};
function mklog(){try{const d=path.join(__dirname,"logs");if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true});}catch(e){}}
function log(lvl,msg){try{mklog();const t=new Date().toISOString();const l="["+t+"]["+lvl+"] "+msg+"\n";fs.appendFileSync(LOG,l,"utf8");if(lvl==="ERROR"||lvl==="CRIT")fs.appendFileSync(ERRL,l,"utf8");console.log(l.trim());}catch(e){}}
function tg(msg){return new Promise(res=>{if(!TOKEN||!CHAT){res(false);return;}try{const b=JSON.stringify({chat_id:CHAT,text:msg,parse_mode:"HTML"});const o={hostname:"api.telegram.org",path:"/bot"+TOKEN+"/sendMessage",method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(b)}};const r=https.request(o,x=>{res(x.statusCode===200);});r.on("error",()=>res(false));r.setTimeout(10000,()=>{r.destroy();res(false);});r.write(b);r.end();}catch(e){res(false);}});}
function alert(key,msg){const n=Date.now();if(!lastAlert[key]||(n-lastAlert[key])>COOLDOWN){lastAlert[key]=n;tg(msg).then(ok=>log("INFO","Telegram sent="+ok+" key="+key));}}
function check(ep){return new Promise(res=>{try{const r=http.get("http://127.0.0.1:"+PORT+ep,{timeout:8000},x=>{res({ok:x.statusCode<500,s:x.statusCode});});r.on("error",e=>res({ok:false,s:0,e:e.message}));r.on("timeout",()=>{r.destroy();res({ok:false,s:0,e:"timeout"});});}catch(e){res({ok:false,s:0,e:e.message});}});}
const SVCS=[{n:"Backend",ep:"/api/health"},{n:"IBM Watson",ep:"/api/ibm/assistant/status"},{n:"IBM Discovery",ep:"/api/ibm/discovery/status"}];
async function cycle(){for(const s of SVCS){const r=await check(s.ep);const prev=status[s.n];status[s.n]=r.ok;if(!r.ok){fails[s.n]=(fails[s.n]||0)+1;log("ERROR","CAIDO: "+s.n+" fails="+fails[s.n]);if(fails[s.n]>=2){alert(s.n,"<b>SANTI NEXUS ALERTA</b>\nServicio caido: "+s.n+"\nFallos: "+fails[s.n]+"\n"+new Date().toISOString());}}else{if(prev===false&&fails[s.n]>0){log("INFO","RECUPERADO: "+s.n);alert(s.n+"_ok","<b>SANTI NEXUS</b>\nRecuperado: "+s.n+"\n"+new Date().toISOString());}fails[s.n]=0;}}}
mklog();log("INFO","Watchdog iniciado");tg("<b>SANTI NEXUS WATCHDOG ACTIVO</b>\nMonitoreo cada 15s\n"+new Date().toISOString()).then(()=>log("INFO","Telegram OK"));
cycle();setInterval(()=>{cycle().catch(e=>log("ERROR","ciclo: "+e.message));},INTERVAL);
process.on("uncaughtException",e=>log("CRIT","uncaught: "+e.message));
process.on("unhandledRejection",r=>log("CRIT","rejection: "+String(r)));
log("INFO","Watchdog estable");
