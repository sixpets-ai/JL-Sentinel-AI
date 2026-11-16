/**
 * test-telegram.js — SANTI NEXUS · Módulo ESM
 * ─────────────────────────────────────────────
 * Ejecutar:  node test-telegram.js
 *
 * Diagnóstico en 3 fases:
 *   1. Valida que el token sea correcto (llama a getMe)
 *   2. Llama a getUpdates para detectar el Chat ID real desde los últimos mensajes
 *   3. Envía el mensaje de prueba
 *
 * package.json tiene "type":"module" → sintaxis ESM obligatoria (import).
 */

import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const token  = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const LINE = "══════════════════════════════════════════";

console.log(LINE);
console.log("  🛰️  SANTI NEXUS · TEST TELEGRAM v2");
console.log(LINE);
console.log(`  TELEGRAM_BOT_TOKEN : ${token  ? `✅ ${token.slice(0,10)}…`  : "❌ FALTA"}`);
console.log(`  TELEGRAM_CHAT_ID   : ${chatId ? `✅ ${chatId}`              : "❌ FALTA"}`);
console.log(LINE);

if (!token) {
  console.error("\n❌ TELEGRAM_BOT_TOKEN no encontrado en .env. Abortando.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

// ── FASE 1: Verificar el token con getMe ──────────────────────────────────────
console.log("\n🔍 FASE 1: Verificando token con getMe…");
let botInfo;
try {
  botInfo = await bot.getMe();
  console.log(`  ✅ Bot válido: @${botInfo.username} (id: ${botInfo.id})`);
} catch (err) {
  console.error(`  ❌ Token inválido o sin conexión: ${err.message}`);
  console.error("     Genera un token nuevo con @BotFather en Telegram.");
  process.exit(1);
}

// ── FASE 2: getUpdates para encontrar Chat IDs reales ─────────────────────────
console.log("\n🔍 FASE 2: Buscando Chat IDs reales con getUpdates…");
let detectedChatId = null;
try {
  const updates = await bot.getUpdates({ limit: 20, timeout: 0 });
  if (updates.length === 0) {
    console.log("  ⚠️  Sin mensajes recientes. Para que getUpdates funcione:");
    console.log(`     1. Abre Telegram y busca @${botInfo.username}`);
    console.log("     2. Envíale el comando /start");
    console.log("     3. Vuelve a ejecutar este script");
  } else {
    console.log(`  ✅ ${updates.length} actualización(es) encontrada(s):`);
    const seen = new Set();
    for (const u of updates) {
      const chat = u.message?.chat ?? u.channel_post?.chat ?? u.edited_message?.chat;
      if (!chat || seen.has(chat.id)) continue;
      seen.add(chat.id);
      const tipo    = chat.type;
      const nombre  = chat.title ?? `${chat.first_name ?? ""} ${chat.last_name ?? ""}`.trim();
      console.log(`     • Chat ID: ${chat.id}  tipo: ${tipo}  nombre: "${nombre}"`);
      if (!detectedChatId) detectedChatId = String(chat.id);
    }
  }
} catch (err) {
  console.error(`  ❌ Error en getUpdates: ${err.message}`);
}

// ── FASE 3: Enviar mensaje de prueba ──────────────────────────────────────────
// Usa el chatId del .env; si no existe, usa el detectado en getUpdates.
const targetId = chatId || detectedChatId;

if (!targetId) {
  console.error("\n❌ FASE 3: No se pudo determinar un Chat ID.");
  console.error("   Solución: Envía /start al bot en Telegram y re-ejecuta el script.");
  process.exit(1);
}

if (!chatId && detectedChatId) {
  console.log(`\n  ⚠️  TELEGRAM_CHAT_ID no definido en .env.`);
  console.log(`     Usando Chat ID detectado automáticamente: ${detectedChatId}`);
  console.log("     Agrega esta línea a tu .env para hacerlo permanente:");
  console.log(`     TELEGRAM_CHAT_ID=${detectedChatId}`);
}

if (chatId && detectedChatId && chatId !== detectedChatId) {
  console.log(`\n  ⚠️  El TELEGRAM_CHAT_ID en .env (${chatId}) difiere del detectado (${detectedChatId}).`);
  console.log("     Si el envío falla, actualiza TELEGRAM_CHAT_ID en tu .env.");
}

console.log(`\n📤 FASE 3: Enviando mensaje de prueba a chat ${targetId}…`);

const mensaje = [
  "🚨 *PRUEBA DIRECTA — SANTI NEXUS*",
  "",
  `✅ Bot verificado: @${botInfo.username}`,
  "📡 Red nacional operativa.",
  "🔐 Zero Trust activo.",
  "",
  `⏱️ ${new Date().toISOString()}`,
].join("\n");

try {
  await bot.sendMessage(targetId, mensaje, { parse_mode: "Markdown" });
  console.log("✅ Mensaje enviado con éxito. Bot operativo al 100%.");
  if (!chatId) {
    console.log(`\n   👉  Añade esto a tu .env:\n   TELEGRAM_CHAT_ID=${targetId}`);
  }
  process.exit(0);
} catch (err) {
  // Decodificar el cuerpo de la respuesta de Telegram con precisión
  let telegramDesc = "";
  if (err.response?.body) {
    try {
      const b = typeof err.response.body === "string"
        ? JSON.parse(err.response.body)
        : err.response.body;
      telegramDesc = b.description ?? JSON.stringify(b);
    } catch {
      telegramDesc = String(err.response.body);
    }
  }

  console.error("\n❌ Error al enviar el mensaje:");
  console.error(`   Código     : ${err.code ?? "N/A"}`);
  console.error(`   HTTP       : ${err.response?.statusCode ?? "?"}`);
  console.error(`   Mensaje    : ${err.message}`);
  if (telegramDesc) console.error(`   Telegram   : ${telegramDesc}`);

  console.error("\n   Diagnóstico según error:");
  if (err.message?.includes("chat not found")) {
    console.error("   → 'chat not found': el bot nunca ha enviado un mensaje a ese chat.");
    console.error(`     1. Abre Telegram, busca @${botInfo.username} y envía /start`);
    console.error("     2. Si es un grupo, agrega el bot al grupo y envía /start");
    console.error("     3. Verifica que TELEGRAM_CHAT_ID sea negativo para grupos (ej: -100...)");
    if (detectedChatId) {
      console.error(`     4. Chat ID detectado por getUpdates: ${detectedChatId} — intenta con ese`);
    }
  } else if (err.message?.includes("Unauthorized")) {
    console.error("   → Token inválido o revocado. Genera uno nuevo con @BotFather.");
  } else if (err.message?.includes("ENOTFOUND") || err.message?.includes("ECONNREFUSED")) {
    console.error("   → Sin conexión a internet o DNS falló.");
  }
  process.exit(1);
}
