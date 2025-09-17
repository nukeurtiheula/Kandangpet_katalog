// File: setWebhook.js
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.BOT_TOKEN;

// --- GANTI URL DI BAWAH INI ---
const VERCEL_APP_URL = "https://nama-proyek-kamu.vercel.app"; // <-- GANTI DENGAN URL VERCEL-MU

if (!BOT_TOKEN || !VERCEL_APP_URL.includes('vercel.app')) {
    console.error("FATAL: Pastikan BOT_TOKEN terisi dan VERCEL_APP_URL sudah diganti dengan benar.");
    process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN);
const webhookEndpoint = `${VERCEL_APP_URL}/api/webhook`;

async function setupWebhook() {
    try {
        console.log(`Menghapus webhook lama (jika ada)...`);
        await bot.deleteWebHook();
        
        console.log(`Mengatur webhook baru ke: ${webhookEndpoint}`);
        const result = await bot.setWebHook(webhookEndpoint);

        if (result) {
            console.log("✅ SUKSES! Webhook berhasil diatur.");
            console.log("Bot-mu sekarang akan mengirim update ke server Vercel.");
        } else {
            console.error("❌ GAGAL! Sesuatu yang aneh terjadi.");
        }
    } catch (error) {
        console.error("❌ GAGAL TOTAL! Terjadi error:", error.message);
    }
}

setupWebhook();