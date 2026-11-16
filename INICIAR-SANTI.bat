@echo off
title SANTI NEXUS - Backend
cd C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols
:loop
echo [SANTI] Backend iniciando...
node server.js
echo [SANTI] Backend caido - reiniciando...
timeout /t 3
goto loop
