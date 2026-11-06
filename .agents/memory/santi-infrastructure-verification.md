---
name: SANTI infrastructure verification
description: Proxy sampling and private workflow pitfalls observed during backend hardening.
---

Verificar el número/reemplazo de trabajadores mediante procesos del supervisor,
por separado de los sondeos HTTP.

**Why:** el proxy reutiliza conexiones hacia trabajadores supervivientes; una
muestra de respuestas HTTP puede omitir un trabajador sano o recién repuesto.
La ausencia en esa muestra no demuestra caída. En este entorno tampoco estaba
disponible el archivo procfs de hijos; `ps` sí permitía comprobarlos.

**How to apply:** comprobar procesos y salud HTTP como pruebas diferentes; no
repetir todo un flujo con Gemini para corregir una aserción de muestreo.

Los servicios internos Python deben seguir privados en loopback; configurarlos
como workflows de consola sin espera de puerto público y comprobar `/health`.

**Why:** el detector de `waitForPort` no consideró abiertos los puertos loopback
aunque Uvicorn estaba sano. Cambiar a una escucha pública solo para satisfacer
el detector expondría innecesariamente servicios internos.

**How to apply:** mantener loopback para sidecars locales, sin publicar rutas del
router; usar supervisión y sondeos internos explícitos.
