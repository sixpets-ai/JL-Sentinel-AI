/**
 * fix-telegram-chatid.js — SANTI NEXUS
 * ──────────────────────────────────────────────────────────────────────────────
 * 1. Lee TELEGRAM_BOT_TOKEN del .env
 * 2. Llama a getUpdates para obtener el Chat ID real (del /start que enviaste)
 * 3. Reescribe el .env con TELEGRAM_CHAT_ID correcto
 * 4. Envía el mensaje de prueba para confirmar
 *
 * Ejecutar:  node fix-telegram-chatid.js
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import TelegramBot from "node-telegram-bot-api";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH  = path.join(__dirname, ".env");

dotenv.config({ path: ENV_PATH });

const token = process.env.TELEGRAM_BOT_TOKEN;

const LINE = "══════════════════════════════════════════";
console.log(LINE);
console.log("  🛰️  SANTI NEXUS · FIX CHAT ID");
console.log(LINE);

if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN no encontrado en .env. Abortando.");
  process.exit(1);
}

// ── Paso 1: Verificar token ────────────────────────────────────────────────────
const bot = new TelegramBot(token, { polling: false });

let botInfo;
try {
  botInfo = await bot.getMe();
  console.log(`✅ Bot válido: @${botInfo.username} (id: ${botInfo.id})`);
} catch (err) {
  console.error(`❌ Token inválido: ${err.message}`);
  process.exit(1);
}

// ── Paso 2: getUpdates — encontrar el Chat ID real ────────────────────────────
console.log("\n🔍 Llamando a getUpdates…");
let updates = [];
try {
  updates = await bot.getUpdates({ limit: 100, timeout: 0 });
} catch (err) {
  console.error(`❌ Error en getUpdates: ${err.message}`);
  process.exit(1);
}

if (updates.length === 0) {
  console.error("⚠️  getUpdates está vacío.");
  console.error(`   El bot @${botInfo.username} no ha recibido ningún mensaje.`);
  console.error("   Solución:");
  console.error(`   1. Abre Telegram → busca @${botInfo.username}`);
  console.error("   2. Presiona START o envía cualquier mensaje");
  console.error("   3. Vuelve a ejecutar este script");
  process.exit(1);
}

// Tomamos el chat más reciente
let realChatId = null;
let chatName   = "";
for (const u of updates) {
  const chat = u.message?.chat
    ?? u.channel_post?.chat
    ?? u.edited_message?.chat
    ?? u.callback_query?.message?.chat;
  if (chat?.id) {
    realChatId = String(chat.id);
    chatName   = chat.title
      ?? `${chat.first_name ?? ""} ${chat.last_name ?? ""}`.trim()
      ?? "(sin nombre)";
    console.log(`   Encontrado: Chat ID ${realChatId} · tipo: ${chat.type} · nombre: "${chatName}"`);
    break;
  }
}

if (!realChatId) {
  console.error("❌ No se pudo extraer un chat.id de getUpdates. Revisa el formato de los updates.");
  process.exit(1);
}

// ── Paso 3: Reescribir el .env ────────────────────────────────────────────────
console.log(`\n📝 Actualizando .env con TELEGRAM_CHAT_ID=${realChatId}…`);

let envContent = fs.readFileSync(ENV_PATH, "utf8");

if (/^TELEGRAM_CHAT_ID\s*=/m.test(envContent)) {
  // Reemplazar el valor existente
  envContent = envContent.replace(
    /^(TELEGRAM_CHAT_ID\s*=).*/m,
    `$1${realChatId}`,
  );
  console.log("   ✅ Línea TELEGRAM_CHAT_ID actualizada.");
} else {
  // Añadir al final si no existe
  envContent = envContent.trimEnd() + `\nTELEGRAM_CHAT_ID=${realChatId}\n`;
  console.log("   ✅ Línea TELEGRAM_CHAT_ID añadida al .env.");
}

fs.writeFileSync(ENV_PATH, envContent, "utf8");

// ── Paso 4: Enviar mensaje de prueba ─────────────────────────────────────────
const mensaje = [
  "🚨 *PRUEBA DIRECTA — SANTI NEXUS*",
  "",
  `✅ Bot: @${botInfo.username}`,
  `📋 Chat ID confirmado: \`${realChatId}\``,
  "📡 Red nacional operativa.",
  "🔐 Zero Trust activo.",
  "",
  `⏱️ ${new Date().toISOString()}`,
].join("\n");

console.log(`\n📤 Enviando mensaje de prueba al chat ${realChatId}…`);

try {
  await bot.sendMessage(realChatId, mensaje, { parse_mode: "Markdown" });
  console.log(LINE);
  console.log(`✅ Chat ID actualizado a: ${realChatId}. Mensaje de prueba enviado.`);
  console.log(`   Nombre del chat: "${chatName}"`);
  console.log(LINE);
  process.exit(0);
} catch (err) {
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
  console.error(`\n❌ Error al enviar: ${err.message}`);
  if (telegramDesc) console.error(`   Telegram: ${telegramDesc}`);
  console.error("\n   El .env YA fue actualizado con el Chat ID detectado.");
  console.error("   Prueba a ejecutar:  node test-telegram.js");
  process.exit(1);
}
