# Alta, roles y portal ciudadano

Extensión modular de SANTI Nexus. Conserva `/`, `/global`, `/demo` y
`/transparencia`; no reemplaza los expedientes originales existentes.

## Pantallas

- `/acceso`: acceso, alta, consentimiento y estado de la solicitud de rol.
- `/legal/terminos`, `/legal/privacidad`, `/legal/aviso`: avisos informativos
  versionados del MVP. Requieren revisión jurídica y datos de la entidad
  responsable antes de una operación real.
- `/ciudadano`: únicamente expedientes propios, recorrido ficticio y evidencia.
- `/patrulla`: únicamente unidad y alertas asignadas, con respuesta reducida.
- `/operaciones`: expedientes ciudadanos para analista/oficial/director;
  dirección también revisa solicitudes de alta.

La categoría estadística RNID es distinta del folio generado por el servidor.
Los IDs `RNID2026-###` son referencias internas de catálogo, no folios judiciales.
El UUID completo identifica cada expediente.

## Identidad y permisos

El servidor conserva la autenticación existente con scrypt, JWT en cookie
HttpOnly y autorización contra el usuario vigente en PostgreSQL. No se confía en
un rol enviado por el cliente ni en un rol guardado solo en React.

Toda alta nueva comienza como ciudadano. Matrícula y corporación son declaraciones
no verificadas; no acreditan pertenencia institucional. Pedir Patrulla, Analista o
Director genera una solicitud pendiente. Dirección puede aprobar/rechazar con
motivo; aprobar/revisar revoca las sesiones de la cuenta objetivo y exige volver
a ingresar. No existe autoaprobación ni alta pública de directores.

`oficial` se conserva como rol legado equivalente a analista. Las cuentas
anteriores pueden completar los avisos sin perder sus permisos existentes.

La cámara opcional solo se habilita después de aceptar los avisos. La captura
permanece en memoria, se descarta y nunca forma parte del contrato de registro.
Cancelar o navegar también detiene permisos que terminen de resolverse tarde.
No se hace reconocimiento facial, cotejo de identidad ni registro biométrico.
No se afirma que existan datos biométricos almacenados/cifrados.

La cookie nueva usa `/api`; al ingresar se retira la anterior de `/api/global`.
Cerrar sesión elimina ambas. Esto permite proteger también el historial Nexus.
Las sesiones antiguas siguen sirviendo en Global hasta expirar; para acceder al
historial protegido de Nexus deben volver a ingresar. Las conversaciones de la
API Gemini legada ya no son públicas. El mapa táctico ficticio puede ser público,
pero sus nodos/conexiones requieren analista/oficial/director.

## Expedientes y simulación

`citizen_cases` conserva el original, su representación canónica PostgreSQL y
SHA-256. `citizen_case_events` agrega despacho ficticio, finalización y recibos de
evidencia en una cadena de hashes. Los triggers rechazan UPDATE/DELETE/TRUNCATE.
Las escrituras comprueban que estén instaladas las seis protecciones.

El recorrido dura 45 segundos y parte a unos 573 m de un punto fijo del ejercicio.
No usa GPS de personas ni telemetría policial. Haversine calcula la distancia
geodésica, no una ruta vial ni una ETA. A menos de 100 m se muestra el aviso y,
si se activó, se lee con voz del navegador. Todo aviso dice que es simulación.
Las posiciones, unidades y el oficial son ficticios.

El ciudadano ve solo lo propio; patrulla no recibe descripciones, propietarios,
evidencias ni trazas. No tiene acceso a los endpoints de expedientes, descarga o
grafos. Analistas y dirección acceden al contenido autorizado del ejercicio, no
a domicilios, telefonía o bases de identidad externas.

Los PATCH/PUT/DELETE contra un expediente ciudadano autorizado se rechazan:
la transacción revierte y otra transacción registra el intento. No se interpreta
ese intento como prueba de delito o intención de corrupción.

## Evidencia privada real

1. El navegador calcula SHA-256 y solicita un ticket ligado a usuario/expediente.
2. Los bytes se cargan directamente a una URL PUT temporal de App Storage.
3. El servidor comprueba tamaño (hasta 20 MB), cabecera de formato y SHA-256.
4. Copia una generación fija a un objeto distinto que nunca se firma para
   escritura del cliente. Reutilizar la URL temporal no altera evidencia.
5. Una transacción agrega el recibo inmutable y confirma el ticket.
6. La descarga exige propietario o analista/oficial/director; comprueba generación
   y tamaño. Es privada, sin caché, sin URL pública y como archivo adjunto.

Tipos: JPEG, PNG, WebP, MP4/WebM y audio MP3/WAV/Ogg/WebM/MP4. Hasta 20 recibos por
ejercicio. La verificación de cabecera **no es un antivirus** ni prueba autoría,
veracidad, legalidad o admisibilidad de una grabación.

Solo metadatos y referencias privadas se guardan en PostgreSQL. No se envían
archivos automáticamente a Gemini. No se informa éxito si falla PUT, verificación
o confirmación. El cliente puede reintentar confirmación sin repetir la carga.

Límites pendientes para producción: responsable/contacto de privacidad, fundamento
jurídico, derechos y retención; escaneo de archivos; cuotas del almacenamiento y
limpieza segura de cargas abandonadas. El límite de 20 MB se comprueba al
autorizar/confirmar, no es una cuota de bytes impuesta a la URL PUT por el proveedor.
Caducar el ticket no elimina automáticamente un objeto temporal ya recibido.
Un fallo ambiguo después de una copia puede dejar un objeto sin recibo; nunca se
borra una copia que pudiera estar confirmada. La limpieza futura debe comprobar
los recibos inmutables y todos los entornos que compartan almacenamiento.

No hay garantía WORM frente a administradores de infraestructura ni certificación
probatoria. Los permisos de la aplicación no sustituyen verificación institucional.

## Instalación y pruebas

App Storage se configura con el mecanismo administrado de Replit. No cambiar
las credenciales del cliente sidecar ni crear rutas públicas para estos archivos.
La autenticación JWT existente protege estas rutas; no se migró de proveedor.

Cambios aditivos en desarrollo:

```sh
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server exec node dist/install-ledger.mjs
```

El instalador aplica también `citizen-onboarding.sql` después de las protecciones
anteriores. No ejecutar una sincronización destructiva ni quitar triggers para
limpiar muestras. Producción no se modificó.

```sh
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/santi run typecheck
pnpm --filter @workspace/api-server exec node test/community-contract.mjs --keep-fixtures
pnpm --filter @workspace/api-server exec node test/community-evidence-contract.mjs
```

Las integraciones guardan expedientes/archivos ficticios confirmados. Revocar los
usuarios QA al terminar; no borrar originales ni bytes confirmados. Las credenciales
temporales se escriben solo bajo `/tmp`, nunca al repositorio.

La prueba de navegador verificó registro, consentimiento, solicitud pendiente,
carga/descarga reales, persistencia, aviso visual/voz a menos de 100 m, finalización
sin alterar el original, aprobación, reingreso y vistas de patrulla/analista a 390 px.
La reproducción audible y seis voces instaladas dependen del dispositivo.
