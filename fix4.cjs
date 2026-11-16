const fs = require('fs');
let c = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');

// Usar split/join global - no depende de \n vs \r\n
const bq = String.fromCharCode(92) + '"';

// Contar antes
const antes = (c.match(/\\"/g) || []).length;
console.log('bq antes:' + antes);

// Reemplazar TODOS los \"word\" globalmente en el string completo
c = c.split(bq + 'graph' + bq).join('"graph"');
c = c.split(bq + 'map' + bq).join('"map"');
c = c.split(bq + 'table' + bq).join('"table"');
c = c.split(bq + 'hidden' + bq).join('"hidden"');
c = c.split(bq + 'flex' + bq).join('"flex"');
c = c.split(bq + 'column' + bq).join('"column"');
c = c.split(bq + 'row' + bq).join('"row"');
c = c.split(bq + 'bold' + bq).join('"bold"');
c = c.split(bq + 'none' + bq).join('"none"');
c = c.split(bq + 'block' + bq).join('"block"');
c = c.split(bq + 'center' + bq).join('"center"');
c = c.split(bq + 'pointer' + bq).join('"pointer"');
c = c.split(bq + 'relative' + bq).join('"relative"');
c = c.split(bq + 'absolute' + bq).join('"absolute"');
c = c.split(bq + 'nowrap' + bq).join('"nowrap"');
c = c.split(bq + 'wrap' + bq).join('"wrap"');

// Contar despues
const despues = (c.match(/\\"/g) || []).length;
console.log('bq despues:' + despues);

fs.writeFileSync('SabanaAnalyzer.tsx', c, 'utf8');
console.log('DONE len:' + c.length);

// Verificar L632
const lines = c.split('\n');
console.log('L631:' + lines[630]);
console.log('L632:' + lines[631]);
