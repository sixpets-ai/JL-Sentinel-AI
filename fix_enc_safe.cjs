// FIX_ENC_SAFE.cjs - Corrige doble encoding UTF-8 (Mojibake)
// Ejecutar: node fix_enc_safe.cjs
// NO usa PowerShell heredoc - evita corrupcion de caracteres
const fs   = require("fs");
const path = require("path");

function walk(dir, skip) {
  skip = skip || ["node_modules",".git","dist","artifacts"];
  var r = [];
  try {
    var items = fs.readdirSync(dir,{withFileTypes:true});
    for (var i=0;i<items.length;i++) {
      var e=items[i];
      if (skip.indexOf(e.name)>=0) continue;
      var fp=path.join(dir,e.name);
      if (e.isDirectory()) r=r.concat(walk(fp,skip));
      else if (/\.(tsx|ts|jsx|js|css)$/.test(e.name)) r.push(fp);
    }
  } catch(err){}
  return r;
}

var root = __dirname;
var files = walk(root);

// Reemplazos usando codigos de escape Unicode - NO caracteres literales
// Esto evita que PowerShell corrompa el script
var replacements = [
  // Comillas: "  "
  ["â\u0080\u009c", "“"],
  ["â\u0080\u009d", "”"],
  ["â\u0080\u0098", "‘"],
  ["â\u0080\u0099", "’"],
  ["â\u0080\u0093", "–"],
  ["â\u0080\u0094", "—"],
  // Vocales con acento espanol - usando escapes Unicode puros
  // e con acento: Ã© -> é (U+00E9)
  ["Ã©", "é"],
  // a con acento: Ã¡ -> á (U+00E1)
  ["Ã¡", "á"],
  // o con acento: Ã³ -> ó (U+00F3)
  ["Ã³", "ó"],
  // i con acento: Ã­ -> í (U+00ED)
  ["Ã­", "í"],
  // u con acento: Ãº -> ú (U+00FA)
  ["Ãº", "ú"],
  // n tilde: Ã± -> ñ (U+00F1)
  ["Ã±", "ñ"],
  // E mayuscula con acento: Ã‰ -> É (U+00C9)
  ["Ã\u0089", "É"],
  // A mayuscula con acento: Ã -> Á (U+00C1) - CUIDADO: solo 2 bytes
  // Verificar que sea realmente Ã seguido de nada util
  // O mayuscula: Ã" -> Ó (U+00D3)
  ["Ã\u0093", "Ó"],
  // U mayuscula: Ãš -> Ú (U+00DA)
  ["Ã\u009a", "Ú"],
  // N mayuscula tilde: Ã' -> Ñ (U+00D1)
  ["Ã\u0091", "Ñ"],
  // Simbolos comunes
  // grado: Â° -> ° (U+00B0)
  ["Â°", "°"],
  // punto medio: Â· -> · (U+00B7)
  ["Â·", "·"],
  // exclamacion invertida: Â¡ -> ¡ (U+00A1)
  ["Â¡", "¡"],
  // interrogacion invertida: Â¿ -> ¿ (U+00BF)
  ["Â¿", "¿"],
  // espacio no separable: Â  -> espacio normal
  ["Â ", " "]
];

var totalFixed = 0;
var iconKeywords = ["CMO","DDHH","DATA","OSINT","TAC","CV","PREV"];

for (var fi=0;fi<files.length;fi++) {
  var f=files[fi];
  try {
    var c=fs.readFileSync(f,"utf8");
    var orig=c;

    // Check si hay problema
    var hasProblem=false;
    for (var ri=0;ri<replacements.length;ri++) {
      if (c.indexOf(replacements[ri][0])>=0){hasProblem=true;break;}
    }
    if (!hasProblem) continue;

    // Aplicar
    for (var ri=0;ri<replacements.length;ri++) {
      var from=replacements[ri][0];
      var to=replacements[ri][1];
      while (c.indexOf(from)>=0) c=c.split(from).join(to);
    }

    if (c===orig) continue;

    // Proteger iconos: si el original tenia iconos, el nuevo tambien debe tenerlos
    var iconOk=true;
    if (orig.indexOf("icon:")>=0) {
      for (var ii=0;ii<iconKeywords.length;ii++) {
        if (orig.indexOf(iconKeywords[ii])>=0 && c.indexOf(iconKeywords[ii])<0) {
          iconOk=false;
          console.log("SKIP (icono perdido "+iconKeywords[ii]+"):",path.relative(root,f));
          break;
        }
      }
    }
    if (!iconOk) continue;

    fs.writeFileSync(f,c,"utf8");
    console.log("FIJO:",path.relative(root,f));
    totalFixed++;
  } catch(e) {}
}

console.log("\nTotal corregidos:",totalFixed);

// Verificar iconos en AgenteAvatar
var avFile=files.filter(function(f){return f.indexOf("AgenteAvatar")>=0&&f.indexOf("artifacts")<0;})[0];
if (avFile) {
  var ac=fs.readFileSync(avFile,"utf8");
  var iconMs=ac.match(/icon:\s*["'][^"']{1,10}["']/g)||[];
  console.log("\nIconos AgenteAvatar:");
  iconMs.forEach(function(m){console.log(" ",m);});
  console.log("Sudafrica:",(ac.indexOf("Sudafrica")>=0||ac.indexOf("Sudáfrica")>=0));
}
