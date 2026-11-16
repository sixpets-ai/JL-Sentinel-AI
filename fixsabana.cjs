const fs=require('fs');
const f='SabanaAnalyzer.tsx';
let c=fs.readFileSync(f,'utf8');
c=c.replace(
  'r=r.filter(x=>x.phone.includes(lq)||x.alias.toLowerCase().includes(lq)||x.cellId.includes(lq));',
  'r=r.filter(x=>(x.phone||"").includes(lq)||(x.alias||"").toLowerCase().includes(lq)||(x.cellId||"").includes(lq)||(x.imei||"").includes(lq)||(x.type||"").toLowerCase().includes(lq));'
);
fs.writeFileSync(f,c,'utf8');
console.log('FIX SABANA SEARCH OK');
