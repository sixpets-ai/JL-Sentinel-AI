---
name: Portal ciudadano y privacidad
description: Elección de evidencia real y límites de visibilidad pedidos para los roles ciudadanos y operativos.
---

El usuario eligió **archivos privados reales** para la evidencia ciudadana, no
una simulación de carga ni solo referencias a archivos.

**Why:** eligió expresamente «Archivos privados reales (recomendado)».

**How to apply:** no sustituir la recepción y acceso privado de archivos por
metadatos con apariencia de carga exitosa. Conservar originales y recibos
confirmados también cuando sean muestras QA.

El usuario pidió que Patrulla vea únicamente mapa, unidad asignada y alertas
cercanas, sin bases de datos ni análisis de redes; Ciudadano debe ver solo su
reporte, estatus y unidad asignada. Analista/Director tienen acceso ampliado.

**Why:** son límites explícitos del modelo de acceso solicitado para SANTI Nexus.

**How to apply:** mantenerlos en respuestas del backend, no solamente ocultando
controles. Solicitar un rol no debe otorgarlo sin autorización.

Cualquier futura limpieza de almacenamiento debe comprobar separación por
entorno y referencias inmutables antes de eliminar bytes.

**Why:** una base de desarrollo puede no conocer los recibos de otro entorno
que comparta almacenamiento; considerar ese archivo «huérfano» podría destruir
evidencia confirmada.

**How to apply:** no inferir ausencia de referencias consultando una sola base
sin conocer el alcance del bucket/prefijo. Ante ambigüedad, conservar el objeto.
