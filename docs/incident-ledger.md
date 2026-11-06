# SANTI · Registro original y anotaciones anexas

## Alcance

La ampliación es aditiva. `/` conserva Nexus, `/global` conserva el mando y
`/demo` conserva el ejercicio táctico. `/transparencia` incorpora consulta de
catálogos públicos y expedientes autorizados con historial.

No es una certificación gubernamental, una firma electrónica avanzada ni una
integración biométrica. Todos los incidentes del escenario son ficticios.

## Referencias estadísticas

`crime_catalog.json` es compartido por Python y la API. El mapa utiliza
`catalogCode` y la etiqueta RNID exacta de ese archivo.

- RNID: manual metodológico 2026 v1.0, tabla de las páginas impresas 29–32.
  Se transcriben sus **78 renglones**. La nota institucional anuncia 71 delitos:
  se declara esa diferencia, sin eliminar filas ni afirmar que son el mismo
  nivel de agregación. `RNID2026-###` son IDs **internos**, no códigos oficiales.
- ICCS: 320 códigos/categorías, incluyendo las once secciones, de las once hojas
  de la plantilla oficial UNODC en español. Se preservan los códigos originales
  con prefijo `ICCS-`, incluidos los ceros iniciales.
- No existe un cruce RNID/ICCS inferido. Tampoco se presenta un supuesto catálogo
  de Interpol ni un inventario penal universal municipal/federal.

Fuentes y SHA-256 de los archivos importados figuran en el JSON y en la UI:

- https://www.gob.mx/cms/uploads/attachment/file/1058582/Manual_metodol_gico_RNID_V1.0_VF__2_.pdf
- https://www.unodc.org/documents/data-and-analysis/statistics/crime/ICCS/iccs_es.xlsx
- Contexto institucional:
  https://www.gob.mx/sesnsp/articulos/nueva-metodologia-para-el-registro-y-clasificacion-de-los-delitos-y-las-victimas-para-fines-estadisticos?tab

Para reproducir la importación, descargar ambos archivos como
`generated-artifacts/catalog-sources/{rnid-2026.pdf,iccs-es.xlsx}` y ejecutar
`python3 scripts/extract_crime_catalog.py`. Los archivos fuente descargados son
salidas ignoradas por Git; el catálogo JSON generado se conserva en el proyecto.
La transcripción RNID debe revisarse contra el manual antes de cambiar versión.

## Protección y conservación

Los triggers PostgreSQL rechazan `UPDATE`, `DELETE` y `TRUNCATE` en:

- `incident_reports`: expedientes Nexus existentes y nuevos.
- `tactical_demo_alerts`: originales de alertas tácticas.
- `incident_ledger`: entradas del historial.

El `INSERT` del original genera su primer asiento mediante un trigger dentro de
la misma transacción. Los registros anteriores se incorporan sin reescribir sus
columnas: su primer sello acredita únicamente el estado al incorporarlos, **no
demuestra qué ocurrió antes del sellado**.

Los informes Gemini y las rutas posteriores se anexan como versiones completas.
La API proyecta la versión más reciente para conservar la interfaz anterior,
pero ninguna versión anterior ni el folio original se reemplazan. PostgreSQL
también impide que una versión cambie la identidad o los hechos base.

Cada folio tiene secuencia y cadena SHA-256 propias. El trigger serializa los
anexos con bloqueo asesor transaccional. La lectura vuelve a comprobar secuencia,
enlaces, hashes, contenido y coincidencia con la fila original:

- `record.originalHash`: SHA-256 del `originalCanonical` entregado por la API,
  JSON con claves ordenadas producido por `canonicalJson`, codificado UTF-8.
- `entry.hash`: SHA-256 de los bytes UTF-8 de `entry.canonical`, formato
  PostgreSQL `jsonb::text`, envoltura versión 1.
- `entry.payloadHash`: SHA-256 del contenido canónico PostgreSQL de ese asiento.

Para verificar no se debe reserializar `entry.canonical`: se calcula el hash de
la cadena exacta entregada. Se conserva una separación explícita entre hash del
original y hash del asiento.

**Límite importante:** los triggers protegen las operaciones ordinarias de la
aplicación, incluido el rol director. Un propietario de PostgreSQL/servidor con
control de DDL puede quitar protecciones o reescribir toda una cadena. No hay
almacenamiento WORM, anclaje externo, firma de terceros ni sello de tiempo
certificado. Coincidencia de hashes no prueba veracidad ni legalidad del contenido.

## Permisos y enmiendas

- Ciudadanía: sin acceso al libro de expedientes.
- Oficial: sus alertas tácticas; consulta de originales Nexus heredados.
- Dirección: consulta/anotación de expedientes. Ni dirección tiene borrado.
- Para Nexus heredado no se puede derivar un titular autenticado del campo
  `agente` declarado: solo dirección puede anexar, sin atribuir retroactivamente
  identidad verificada a ese autor.
- La ingesta Nexus original conserva su contrato de demostración; no se
  transforma silenciosamente en una ingesta gubernamental autenticada.

Una aclaración o cancelación es siempre una **anotación**, nunca una modificación
del original. Se requiere justificación de 15–2000 caracteres y dos pasos:

1. Validación **simulada**, token aleatorio de un solo uso y cinco minutos.
2. Sellado del mismo folio, actor, acción, hash original y justificación.

Solo se guarda el digest del token. Su consumo y la inserción de la enmienda
ocurren en una transacción Drizzle; si falla la inserción, el consumo revierte.
Repetirlo, cambiar su intención, usar otro actor/folio o dejarlo expirar falla.
No se recopilan biométricos ni se afirma autenticación biométrica real.

## Referencias de evidencia y custodia

Dispositivos: CCTV, Android, iOS, tablet, laptop u otro. Cada referencia conserva
actor, hora de registro del servidor, folio, hash, secuencia y vínculo al original.
Acepta descripción, referencia humana, URL HTTPS opcional sin credenciales,
consulta ni fragmento, y SHA-256 **declarado** opcional.

No se suben archivos, no se descargan URLs, no se conectan cámaras y no se
autentica su contenido. El hash de archivo ingresado es una declaración, no una
medición de bytes por el servidor. La cadena documenta el registro digital de
referencias; no certifica custodia física ni transferencias fuera del sistema.
Nunca introducir claves, tokens, enlaces firmados ni material personal sensible.

## Instalación de la migración

Se agregan tablas sin borrar ni convertir las existentes:

```sh
pnpm --filter @workspace/api-spec run codegen
pnpm exec tsc --build lib/db/tsconfig.json
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run seal-ledger
```

`seal-ledger` ejecuta el SQL versionado con bloqueo de tablas y una transacción
Drizzle. Si falla, revierte. Puede repetirse: no duplica sellos históricos.
No eliminar triggers para reparar datos: registrar una enmienda.

Drizzle schema push **no instala estos triggers por sí solo**. Las nuevas
operaciones comprueban que estén habilitados y rechazan la ingesta sin protección.
La migración está aplicada a desarrollo. **No se ha modificado producción ni
publicado el proyecto**: antes de publicar debe aplicarse el esquema y esta
migración a la base de destino, con respaldo y revisión correspondientes.

## Pruebas

```sh
pnpm --filter @workspace/api-server exec node --test test/ledger-db.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Las pruebas SQL usan `ROLLBACK`, no borrado de expedientes confirmados. Si una
prueba de navegador crea un folio, este queda como muestra **ficticia de QA**:
no existe una excepción de borrado para pruebas. Se revoca la sesión y se reduce
el rol del usuario de prueba al terminar, sin quitar el historial.

Aviso obligatorio:
“Plataforma de Inteligencia Preliminar. Requiere validación humana y respeto a los Derechos Humanos.”
