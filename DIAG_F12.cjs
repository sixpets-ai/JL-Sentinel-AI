// DIAG_F12.cjs - Diagnostico basado en errores F12
// node DIAG_F12.cjs
const fs = require("fs");
const path = require("path");

function walk(dir,skip){
  skip=skip||["node_modules",".git","dist","artifacts",".vite"];
  var r=[];
  try{
    fs.readdirSync(dir,{withFileTypes:true}).forEach(function(e){
      if(skip.indexOf(e.name)>=0)return;
      var fp=path.join(dir,e.name);
      if(e.isDirectory())r=r.concat(walk(fp,skip));
      else if(/\.(tsx|ts|jsx|js)$/.test(e.name))r.push(fp);
    });
  }catch(e){}
  return r;
}

var ROOT=__dirname;
var files=walk(ROOT);

// 1. AgenteAvatar.tsx lineas 60-120
var avFile=files.filter(function(f){return f.indexOf("AgenteAvatar")>=0&&f.indexOf("artifacts")<0;})[0];
if(avFile){
  var lines=fs.readFileSync(avFile,"utf8").split("\n");
  console.log("=== AgenteAvatar.tsx L60-L120 ===");
  lines.slice(59,120).forEach(function(l,i){console.log("L"+(i+60)+": "+l);});
  console.log("\n=== AgenteAvatar.tsx L1-L50 (definicion personas) ===");
  lines.slice(0,50).forEach(function(l,i){console.log("L"+(i+1)+": "+l);});
  // Buscar speakTextWatson
  console.log("\n=== speakTextWatson funcion ===");
  var c=lines.join("\n");
  var idx=c.indexOf("speakTextWatson");
  if(idx>=0){
    var before=c.substring(0,idx).split("\n").length;
    var block=c.substring(idx-200,idx+500);
    console.log("Encontrado en L~"+before);
    console.log(block.substring(0,700));
  }
  // Mostrar todos los iconos con sus bytes
  console.log("\n=== ICONOS (bytes hex) ===");
  var icons=c.match(/icon:\s*["'][^"']{1,30}["']/g)||[];
  icons.forEach(function(m){
    var v=m.replace(/icon:\s*["']/,"").replace(/["']$/,"");
    console.log("  "+m+" | "+Buffer.from(v,"utf8").toString("hex"));
  });
  // SANTI especificamente
  console.log("\n=== SANTI bloque completo ===");
  var sidx=c.indexOf('"SANTI"');
  if(sidx<0)sidx=c.indexOf("'SANTI'");
  if(sidx>=0)console.log(c.substring(Math.max(0,sidx-50),sidx+300));
}

// 2. App.tsx L85-L105 (donde se renderiza el titulo)
var appFile=files.filter(function(f){return /[\/\\]App\.tsx$/.test(f)&&f.indexOf("artifacts")<0;})[0];
if(appFile){
  var lines=fs.readFileSync(appFile,"utf8").split("\n");
  console.log("\n=== App.tsx L85-L105 (navbar title render) ===");
  lines.slice(84,105).forEach(function(l,i){console.log("L"+(i+85)+": "+l);});
  // Buscar donde se usa el titulo del tab activo
  var c=lines.join("\n");
  console.log("\n=== App.tsx: buscar 'title' dinamico ===");
  lines.forEach(function(l,i){
    if((l.indexOf("title")>=0||l.indexOf("label")>=0)&&l.indexOf("activeTab")>=0){
      console.log("L"+(i+1)+": "+l.trim().substring(0,120));
    }
  });
  // Buscar TABS array
  var tidx=c.indexOf("const TABS");
  if(tidx>=0){
    console.log("\n=== TABS array (primeros 800 chars) ===");
    console.log(c.substring(tidx,tidx+800));
  }
}

// 3. Verificar TTS endpoint en server.js
var srvFile=files.filter(function(f){return /[\/\\]server\.js$/.test(f)&&f.indexOf("artifacts")<0;})[0];
if(srvFile){
  var c=fs.readFileSync(srvFile,"utf8");
  var ttsIdx=c.indexOf("/tts");
  console.log("\n=== server.js: endpoint TTS (L alrededor de /tts) ===");
  if(ttsIdx>=0)console.log(c.substring(Math.max(0,ttsIdx-100),ttsIdx+400));
}

console.log("\n=== FIN DIAG_F12 ===");
