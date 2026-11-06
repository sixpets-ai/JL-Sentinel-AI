# SANTI · Endurecimiento operativo

Esta ampliación no cambia la interfaz ni sustituye Nexus. El backend activo es
el artefacto API TypeScript. `server.js` permanece legado, no se arranca en paralelo.
Sus seis perfiles usan el mismo módulo metodológico que el backend activo.

## Qué está funcionando en desarrollo

- Clúster Node supervisado usando `cluster` y `os`, con los **cuatro núcleos
  asignados** al contenedor actual. Se respeta afinidad y cuota cgroup, no el
  número de CPUs del host compartido.
- Reinicio de trabajadores con espera progresiva; cierre ordenado por señal.
  En este entorno cada trabajador tiene hasta cinco conexiones PostgreSQL.
  `CLUSTER_WORKERS` puede reducir trabajadores, no exceder CPUs asignadas.
- Redis compartido: caché con TTL, coordinación de refrescos, límites de
  peticiones, dos plazas para informes y exclusión por informe entre trabajadores.
  Los leases de cálculo duran 120 segundos: no son una cola durable ni una
  garantía de ejecución exactamente una vez.
- Socket.IO usa adaptador Redis, salas de usuario y desconexión distribuida al
  revocar sesión. El transporte sigue siendo WebSocket, sin introducir polling.
  Redis conserva metadatos de conexión/presencia con caducidad, **no contraseñas
  ni JWT**. Roles y versión de sesión se validan en PostgreSQL; Redis no es una
  autoridad de permisos.
- Si se pierde coordinación Redis se desconectan sockets locales; las
  operaciones compartidas no continúan fingiendo coordinación local equivalente.

El Redis de desarrollo escucha solo en loopback, tiene 128 MB, no expulsa claves
de seguridad por LRU y no conserva disco. Es caché/coordinación desechable.
**No tiene réplica ni failover.** Reiniciarlo pierde caché y conexiones efímeras,
no expedientes ni sesiones/versiones persistidas en PostgreSQL.

## Servicios Python independientes

| Proceso | Dirección privada local | Funciones |
|---|---|---|
| SANTI Heatmap | `127.0.0.1:8008` | `/health`, `/scenario`, `/heatmap` |
| SANTI Quantum | `127.0.0.1:8099` | `/health`, `/optimize` |

Los workflows se gestionan por separado. No se publica un puerto de estos
servicios al navegador. Node consulta HTTP, **no crea procesos Python por
petición**. Conserva los contratos existentes de mapa/rutas.

FastAPI valida entradas, limita cuerpo a 64 KB y admite dos cálculos simultáneos
por servicio. La entrada de rutas admite 2–8 puntos finitos; mapas, hasta 500
eventos. Node limita salida a 100 KB y tiempo a cinco segundos, con circuitos
independientes que se abren tras tres fallos y permiten reintentar a los 15 s.
No se reemplaza un fallo por un éxito ficticio.

Quantum expone únicamente optimización clásica acotada y simulación educativa
Grover ya existente. No envía trabajos a QPU, no demuestra ventaja cuántica ni
consume IBM Quantum. Se conservan las advertencias de no navegación/despacho.

Comandos de los procesos, desde la raíz:

```sh
redis-server --bind 127.0.0.1 --port 6379 --protected-mode yes --save "" --appendonly no --maxmemory 128mb --maxmemory-policy noeviction
python3 -m uvicorn services.heatmap_service:app --host 127.0.0.1 --port 8008 --limit-concurrency 8 --timeout-keep-alive 5
python3 -m uvicorn services.quantum_service:app --host 127.0.0.1 --port 8099 --limit-concurrency 8 --timeout-keep-alive 5
```

## Los seis perfiles

| Agente | Referencia metodológica pública |
|---|---|
| SANTI | Contraste de hipótesis y fuentes, FBI/CIA |
| MAXIMILIANO | Normalización documental internacional, Interpol |
| EMILIANO | Documentación preventiva y competencias, SSPC |
| SANTIAGO | Conservación y calidad RNID, CNPJ |
| LORENA | Derechos humanos, ONU |
| KATERING | Estadística y sesgos, UNODC |

No son representantes de esas agencias ni tienen acceso a sus sistemas.
CNPJ significa **Conferencia Nacional de Procuración de Justicia**. RNID e ICCS
son referencias estadísticas separadas, no acreditación ONU/Interpol.

El aprendizaje implementado es **incremental lógico**, no entrenamiento del
modelo Gemini: al confirmar una alerta de escenario ficticio se actualiza un
conteo por categoría, en la misma transacción del original. Los seis perfiles
reciben el resumen agregado con frecuencias suavizadas por Laplace y su versión.
No se aprenden conversaciones, identidades, dispositivos, atributos sensibles
ni acusaciones reales. La muestra cuenta uso de escenarios, puede repetir
incidentes y tiene sesgo de selección: no estima incidencia ni peligrosidad.

## Intentos de modificación y rollback

Los originales y su libro conservan los bloqueos existentes. Además:

- `PATCH`, `PUT` y `DELETE` autenticados sobre
  `/api/global/ledger/{kind}/{id}` rechazan alteraciones.
- Existen aliases de rechazo sobre `/api/global/tactical/alerts/:id` y
  `/api/santi/reports/:id`; no son endpoints de edición autorizada.
- La transacción Drizzle establece actor/request ID, intenta la operación y
  recibe `55000` del trigger. Incluso si faltara un trigger, se fuerza rollback:
  **este handler nunca hace commit de una alteración**.
- Después del rollback se abre **otra transacción** y se registra la tentativa
  en `incident_mutation_attempts`, tabla también protegida contra cambios.
  No se conserva el cuerpo de la petición ni se determina intención criminal.
- Si no se confirma la auditoría se responde `503` con `recorded:false`, no un
  falso “registrado”. Queda además una alerta en el log de aplicación.
- SQL directo genera `RAISE LOG` en PostgreSQL antes de rechazarlo: ese mensaje
  no depende del commit. Su retención/acceso depende del operador de PostgreSQL.
  Un cliente SQL externo no pasa por el handler HTTP ni recibe automáticamente
  su registro en la tabla de auditoría.
- Solo dirección consulta los últimos 100 intentos mediante
  `GET /api/global/mutation-attempts`.

Insertar un log en la propia transacción que falla, o usar `NOTIFY` en ella, **no
sería auditoría durable**: también se revierte. No se afirma que un propietario
de PostgreSQL no pueda quitar triggers; para eso se necesitan controles externos.

Instalación: seguir `docs/incident-ledger.md`. El instalador de sellado ahora
ejecuta ambas migraciones SQL en una transacción, después del schema push.
La comprobación de ingesta exige también los triggers de la auditoría.

## Salud y verificación

- `/api/health/live`: el trabajador responde.
- `/api/health/ready`: comprueba PostgreSQL, Redis y ambos servicios. Un fallo
  Python devuelve `200` con `status:"degraded"`: no retira la API principal sana.
  Un fallo de base/coordinación devuelve `503`. No confundir liveness con HA.
- Pruebas unitarias Python y pruebas Node de contratos, IAM y DB siguen disponibles.
- `test/industrial-contract.mjs`: una muestra sintética, aprendizaje agregado,
  rollback/auditoría, WebSockets repartidos y revocación entre procesos,
  sustitución de un trabajador. Admite UUID de muestra **propia de QA**
  para repetir infraestructura sin volver a consumir Gemini.
- `test/check-compute-isolation.mjs quantum|heatmap`: ejecutar solo con ese
  servicio detenido, restaurarlo siempre al finalizar. Comprueba `503` aislado,
  catálogo/estadísticas sanos y readiness degradada.

Los folios/intentonas de QA confirmados se conservan; no hay excepción de
borrado. Sus cuentas se restringen y sus sesiones se revocan al terminar.

## Lo que esto NO garantiza y producción pendiente

No garantiza “cero caídas”, millones de conexiones, durabilidad de trabajos en
curso ni alta disponibilidad ante pérdida del host/Redis/PostgreSQL. Una conexión
en el trabajador que muere puede cortarse; el cliente debe reconectar. Hay que
dimensionar y medir capacidad antes de anunciar cifras.

Producción necesita Redis privado autenticado y replicado (`REDIS_URL`), base
PostgreSQL con estrategia de HA/respaldos, múltiples instancias y balanceo,
supervisión de todos los procesos, observabilidad y pruebas de carga/fallos.
Configurar `HEATMAP_SERVICE_URL` y `QUANTUM_SERVICE_URL` si los servicios están
en otras máquinas; fuera de loopback se exige HTTPS.

Los procesos arrancados en este workspace no son por sí mismos una publicación
de producción. Debe configurarse y verificarse su ejecución en el destino,
incluyendo migraciones. No se cambiaron el tipo de publicación, la base de
producción, las credenciales ni se publicó el proyecto.
