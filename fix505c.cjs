const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
fs.writeFileSync('SabanaAnalyzer.tsx.bak_fix505c', lines.join('\n'));
// L505 (index 504): "            )) : null}" -> volver a "))" 
// L509 (index 508): "        </div>" -> "</div> : null}"  NO, JSX no funciona asi
// La estructura: {ternario ? (  <div>...</div>  ) : null}
// El ")" de cierre del true-branch esta en L509 despues del </div>
// Necesitamos encontrar donde va el ")" que cierra L457's "("
// L457: {rows.length === 0 ? (   <- abre con "("
// true branch = <div>...</div> completo (L458-L509)
// L505: )) cierra el .map y su "(" -- correcto
// Luego </tbody></table></div></div> cierran los JSX
// Despues de L509 </div> necesitamos ") : null}" 
// Revertir L505
lines[504] = lines[504].replace(' : null}', '}');
console.log('L505 revertido:', JSON.stringify(lines[504]));
// Ver L509
console.log('L509:', JSON.stringify(lines[508]));
console.log('L510:', JSON.stringify(lines[509]));
fs.writeFileSync('SabanaAnalyzer.tsx', lines.join('\n'));
