# MVP táctico de Hackathon — capa adicional

La ruta **`/demo`** presenta el escenario sintético sin sustituir `/` (Nexus)
ni `/global` (fuentes públicas y acceso). La consulta del escenario es pública;
la creación de alertas y sus informes requiere sesión de oficial/director.
No se asignan unidades reales, se envían notificaciones ni se despachan recursos.

- `heatmap_generator.py` genera seis incidentes ficticios y procesa sus menciones
  por celdas geográficas ponderadas. El frontend dibuja puntos de calor suaves en
  Leaflet. No representa delitos reales, probabilidades, predicción criminal ni
  información sobre personas.
- Cytoscape muestra relaciones de demostración entre incidentes, zonas y fuentes
  ficticias. Dos menciones no implican corroboración independiente, culpabilidad
  ni pertenencia a una organización. No hay nodos de personas.
- Una alerta simulada de **alto** impacto invoca
  `quantum_engine.py --simulate-quantum`. Se simulan amplitudes de Grover sobre
  permutaciones válidas de rutas. El oráculo se construye con un mínimo clásico
  exhaustivo y el resultado mostrado es ese mínimo de referencia: es didáctico,
  no una optimización cuántica práctica, ventaja demostrada ni medición QPU.
  No se consumen créditos IBM Quantum. El modo anterior `--simulate` permanece.
- Al crear cualquier alerta, Gemini `gemini-2.5-flash` redacta el resumen OSINT.
  El backend incorpora ficha técnica, folio único, fecha y unidad **DEMO**:
  estos campos no se dejan a la generación del modelo. La alerta se guarda
  antes de llamar a Python/Gemini. Si Gemini falla, se conserva y permite
  reintentar únicamente el informe propio; jamás se sustituye por un éxito
  inventado. El historial sobrevive a recargas y está aislado por cuenta.
- `src/lib/global/ibm-iam.ts` centraliza el transporte autenticado para REST IBM:
  solicita un token IAM nuevo en cada operación, agrupa intercambios simultáneos
  y reintenta una sola vez ante un 401. No reintenta un 404/403 ni transforma
  errores en éxito. La simulación local no requiere IAM. Un cliente Quantum
  REST futuro puede usar este transporte; el antiguo acceso Qiskit sigue
  separado y el SDK administra su propia autenticación. **No garantiza que
  IBM nunca falle**: siguen aplicando permisos, región, límites y disponibilidad.

Endpoints adicionales bajo `/api/global/tactical`:

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/` | Escenario público Python, explícitamente sintético |
| GET | `/alerts` | Últimas 30 alertas propias, oficial/director |
| POST | `/alerts` | Crear alerta del escenario y generar ruta/informe |
| POST | `/alerts/:id/report` | Reintentar informe propio pendiente/fallido |

El cliente no decide el folio, impacto, coordenadas o unidad; envía un ID del
escenario fijo. Se aplican origen, JWT, roles, límites por usuario, concurrencia
y tiempo máximo de Python. Los informes se guardan en la tabla adicional
`tactical_demo_alerts` sin reemplazar datos de Nexus. En varias réplicas, los
límites en memoria y exclusión de generación deben trasladarse a un almacén
compartido antes de utilizarse fuera de un MVP.

Aviso visible en el escenario y los informes:

> Plataforma de Inteligencia Preliminar. Requiere validación humana y respeto a los Derechos Humanos.

Archivos nuevos principales: `heatmap_generator.py`,
`artifacts/api-server/src/lib/global/{ibm-iam,python-json,tactical}.ts`,
`artifacts/api-server/src/routes/global/tactical.ts`,
`lib/db/src/schema/tactical-alerts.ts`, página y componentes frontend de `/demo`.
Contratos y clientes se generan desde `lib/api-spec/openapi.yaml`.
Dependencia visual añadida: `cytoscape` (incluye tipos; no requiere SDK IBM).

Comprobaciones locales sin llamadas reales a IBM:

```sh
python3 -m unittest discover -s tests -p 'test_*.py' -v
cd artifacts/api-server && node --test test/ibm-iam.test.mjs
```

# SANTI Nexus + Centro Global

El panel original permanece en `/`. La vista adicional `/global` consulta
fuentes públicas para análisis informativo de desastres y asuntos humanitarios.
No es un sistema oficial de emergencias: no rastrea personas, no triangula
dispositivos, no asigna unidades y no envía alertas reales.

## Arquitectura aditiva

- **Frontend:** React, Vite, TanStack Query y Leaflet. El centro global tiene
  componentes y estilos propios. Se conserva el proveedor QueryClient de Nexus.
- **API:** Express en `artifacts/api-server`; las rutas existentes `/api/santi`
  y `/api/gemini` permanecen. El nuevo dominio está en `/api/global`.
- **Datos:** PostgreSQL/Drizzle conserva las tablas existentes y añade
  `global_command_users` y `global_command_briefs`.
- **Contrato:** `lib/api-spec/openapi.yaml`; Orval genera validadores Zod,
  tipos y hooks. Se fijaron explícitamente los destinos Zod 3 y React Query 5
  para evitar que la detección de versiones cambie el código generado.
- **Tiempo real:** Socket.io sobre `/api/global/socket.io`, registrado en el
  enrutamiento del servicio. Exige la misma sesión que REST, mantiene presencia
  y notifica nuevas instantáneas. No simula movimientos de unidades.
- **IA:** los informes usan exclusivamente `gemini-2.5-flash` mediante la
  integración Gemini existente de Replit. Las solicitudes consumen créditos.
  Se resumen titulares/metadatos, no el texto completo de los artículos.
- **Simulación:** el backend ejecuta `quantum_engine.py --simulate` en un
  proceso con límite de cinco segundos y un máximo de ocho puntos.

`server.js` es una versión anterior y **no es el servicio activo**. Se conserva
sin sustituirla ni arrancarla en otro puerto. No se debe usar su respuesta de
fallback como evidencia de que una unidad real esté en camino.

## Fuentes públicas y sus límites

1. **GDELT DOC:** consulta temas predefinidos y conserva títulos, enlaces,
   fuente y fecha de observación. Un titular no demuestra un evento.
   Las noticias sin coordenadas permanecen sin ubicación; no se geocodifican
   personas ni se inventan coordenadas.
2. **USGS:** GeoJSON oficial de sismos M2.5+ de las últimas 24 horas.
   Estos datos pueden ser revisados por el proveedor.
3. **NewsAPI:** adaptador opcional. Requiere `NEWS_API_KEY` y un plan cuya
   licencia permita el uso previsto. Sin configuración se indica expresamente.
4. **Bluesky:** API oficial de lectura de publicaciones públicas de una cuenta
   institucional configurada en `BLUESKY_PUBLIC_ACTOR`. El propietario debe
   verificar la identidad de esa cuenta. No se recopilan perfiles, seguidores
   ni mensajes privados. El filtro por tema es literal en inglés.
5. **Nexus local:** los registros existentes se identifican como demostración;
   no se presentan como confirmados por las fuentes externas.

Solo se usan APIs; no se eluden accesos, paywalls ni restricciones.
No se descarga el cuerpo de las noticias. La disponibilidad pública no elimina
licencias, condiciones de servicio ni obligaciones de protección de datos.
La capa de intensidad representa cantidad de menciones, **no riesgo**.
No se promete legalidad universal: el operador debe revisar su jurisdicción,
licencias, finalidad y retención antes de un uso institucional.

## Acceso y roles

El centro nuevo usa JWT HS256 de una hora en cookie HttpOnly, SameSite Strict,
Secure en producción. No hay tokens en localStorage.
El proxy de vista previa puede reescribir SameSite a None y añadir Secure para
su iframe; por eso los controles de origen se comprueban de forma independiente.
Las contraseñas se almacenan con scrypt y salt aleatorio.
Se comprueba el usuario y su versión de sesión en PostgreSQL en cada petición;
el cliente no decide sus privilegios.

| Rol | Permisos nuevos |
| --- | --- |
| ciudadano | Consultar fuentes públicas, mapa y sala |
| oficial | Además generar informes, simular conexiones y solicitar evaluación IBM |
| director | Además consultar el monitor IBM y administrar roles |

Las cuentas nuevas siempre son `ciudadano`, incluso si alguien envía un campo
`role` manipulado. No existe “primer usuario = director”, contraseña por defecto
ni endpoint público de ascenso. Para establecer el primer director:

1. Registra una cuenta desde `/global`.
2. Desde la consola del propietario, después de compilar la API:

```sh
pnpm --filter @workspace/api-server run grant-role -- nombre_de_usuario director
```

3. Vuelve a iniciar sesión. Posteriores cambios pueden hacerse desde la vista
   de gestión del director. No se permite cambiar el propio rol desde la API.

Logout revoca las sesiones del usuario. Los cambios de rol revocan sus tokens
y desconectan sus sockets en el proceso actual; las sesiones de sockets se
revalidan cada minuto. No se añadió recuperación por correo, MFA ni SSO:
no deben darse por existentes.

## IBM watsonx.governance: conexión real, no certificación

El adaptador usa IBM IAM y las operaciones REST documentadas de OpenScale:
consulta del monitor, registro de scoring payload y solicitud de ejecución
del monitor. No sustituye Governance por un prompt de watsonx.ai.

Configuración necesaria, **sin poner secretos en el repositorio**:

| Variable | Uso |
| --- | --- |
| `IBM_API_KEY` | Secret existente para IAM; necesita permisos del servicio |
| `WATSONX_GOVERNANCE_URL` | URL base HTTPS oficial de la región IBM |
| `WATSONX_SERVICE_INSTANCE_ID` | Instancia OpenScale/Governance |
| `WATSONX_MONITOR_INSTANCE_ID` | Monitor previamente provisionado |
| `WATSONX_DATA_SET_ID` | Dataset de payload logging del mismo despliegue |
| `WATSONX_PROJECT_ID` | Proyecto existente, cuando el despliegue lo requiere |
| `WATSONX_INPUT_FIELD` | Campo de entrada del dataset; defecto `input_text` |
| `WATSONX_OUTPUT_FIELD` | Campo de salida; defecto `generated_text` |

El dataset, sus campos, suscripciones y métricas deben haberse configurado en
IBM para ese despliegue. El envío se hace **solo con una acción y consentimiento
explícitos** del usuario; comparte el texto con IBM. No ingreses datos sensibles.
Si falta configuración se devuelve `not_configured`, no un aprobado ficticio.
La URL se restringe a hosts oficiales IBM para evitar SSRF y exfiltración de claves.

`connected` solo acredita acceso al monitor. `submitted` solo significa que IBM
aceptó una solicitud de ejecución: no es un dictamen individual sobre el informe.
Un monitor puede evaluar registros acumulados y exigir un tamaño mínimo de muestra.
Este módulo no espera ni interpreta métricas finales del run: deben revisarse
en IBM. Si falla el segundo paso, el texto puede haberse registrado sin que se
haya iniciado la evaluación; revisa IBM antes de reintentar.
Ninguna tecnología garantiza cero sesgos ni cero alucinaciones.
Orchestrate no se presenta como conectado: no se proporcionó un flujo de ese servicio.

Documentación: <https://cloud.ibm.com/apidocs/ai-openscale>

## Simulación y Quantum

El script conserva su función anterior de conexión a IBM Quantum, con import
diferido para que la simulación no dependa de Qiskit ni de credenciales.
La nueva opción `--simulate` busca exactamente el camino abierto más corto,
con el primer punto fijo, entre dos y ocho ubicaciones por distancia Haversine.

Es una **referencia clásica**, no ejecución cuántica, mejora cuántica ni
optimización de respuesta real. No considera carreteras, fronteras, tiempos,
clima ni seguridad. No sirve para navegación ni decisiones de emergencia.
No se ejecutan trabajos QPU desde el dashboard ni se consumen créditos Quantum.
Para futuros trabajos IBM reales hacen falta Qiskit Runtime, `QUANTUM_CRN`,
acceso autorizado al backend y un algoritmo cuántico; el script anterior por
sí solo únicamente selecciona un backend.

## Seguridad, capacidad y operación

- Helmet y controles de origen para el dominio nuevo.
- Rate limiting general y de login; límites por usuario para IA y cálculos.
- Validación generada desde OpenAPI, tamaños de entrada limitados y salida
  externa validada. Contenido externo se muestra como texto, no HTML.
- Caché en memoria: cinco minutos si hay una fuente disponible, un minuto
  para fallos, máximo cuatro temas; solicitudes simultáneas del mismo tema se
  agrupan. Intervalo global mínimo de quince segundos entre consultas nuevas.
- Timeouts y tamaño máximo de respuestas externas; dos cálculos/solicitudes
  de IA simultáneos como máximo en este proceso.
- Lecturas periódicas de instantáneas cada minuto mientras haya usuarios en sala;
  los proveedores no son un stream de emergencias en tiempo real.

**Límites reales:** esta es una arquitectura de un solo proceso con caché y
rate limiting locales. No está certificada para escala mundial ni cero caídas.
Para múltiples réplicas se requieren almacenamiento compartido de cuotas/caché,
adaptador Redis de Socket.io, revocación distribuida, observabilidad y pruebas
de carga con objetivos concretos. El proxy debe establecer correctamente la
cadena de IPs; se confía en un salto de proxy.

## Dependencias y comprobaciones

Ya instaladas en los paquetes correspondientes:

```sh
pnpm --filter @workspace/api-server add helmet express-rate-limit socket.io jsonwebtoken zod
pnpm --filter @workspace/api-server add -D @types/jsonwebtoken
pnpm --filter @workspace/santi add -D socket.io-client
```

No ejecutes `npm install` en paralelo a pnpm ni el `server.js` antiguo.
La simulación utiliza Python 3 y solo su biblioteca estándar.

```sh
pnpm --filter @workspace/api-spec run codegen
pnpm exec tsc --build lib/db/tsconfig.json
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/santi run typecheck
pnpm --filter @workspace/db run push  # solo desarrollo; cambios aditivos
python3 -m unittest discover -s tests
node --test artifacts/api-server/test/global-contract.test.mjs
```

La prueba de contrato requiere la API de desarrollo en ejecución y usa cuentas
temporales propias que elimina al terminar. Los servicios se arrancan con los
workflows existentes de Replit. Publicar requiere aprobación del propietario;
este cambio no publica ni modifica la inscripción o enlaces del concurso.
