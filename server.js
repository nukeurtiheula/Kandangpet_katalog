require('dotenv').config();
const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const { kv } = require('@vercel/kv'); // <-- 1. Import Vercel KV

// Konfigurasi
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const VERCEL_URL = process.env.VERCEL_URL; // <-- Vercel akan menyediakan ini otomatis
const PORT = 3000;

if (!BOT_TOKEN || !CHANNEL_ID) {
    console.error("FATAL: BOT_TOKEN atau CHANNEL_ID tidak ada di .env");
    process.exit(1);
}

// --- 2. Inisialisasi Bot TANPA POLLING ---
const bot = new TelegramBot(BOT_TOKEN);
const app = express();

app.use(cors());
app.use(express.json()); // Penting untuk menerima webhook dari Telegram

// --- 3. Atur Webhook Secara Otomatis ---
const webhookUrl = `https://${VERCEL_URL}/api/webhook`;
bot.setWebHook(webhookUrl);

// --- 4. Buat Endpoint untuk Menerima Update dari Telegram ---
app.post('/api/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200); // Balas OK ke Telegram
});

// Menyajikan file frontend dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// API untuk memberitahu frontend alamat publiknya
app.get('/api/config', (req, res) => {
    res.json({ baseUrl: `https://${VERCEL_URL}` });
});

// --- 5. Modifikasi API untuk menggunakan Vercel KV ---
app.get('/api/products', async (req, res) => {
    // Ambil data dari Vercel KV, bukan dari file
    const products = await kv.get('products') || [];
    res.setHeader('Content-Type', 'application/json');
    res.json(products);
});

// API untuk redirect ke file gambar (tidak berubah)
app.get('/file/:file_id', async (req, res) => {
    try {
        const fileLink = await bot.getFileLink(req.params.file_id);
        res.redirect(fileLink);
    } catch (error) {
        res.status(404).send('File tidak ditemukan.');
    }
});

// Logika Bot untuk /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Selamat datang! Klik tombol di bawah untuk membuka katalog.', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 Buka Katalog', web_app: { url: `https://${VERCEL_URL}` } }]
            ]
        }
    });
});

// Logika Bot untuk menangani postingan baru di channel
bot.on('channel_post', (msg) => {
    if (msg.chat.id.toString() !== CHANNEL_ID || !msg.photo || !msg.caption || !msg.caption.toUpperCase().includes('FOR SALE')) {
        return;
    }
    try {
        console.log('[BOT] Postingan "FOR SALE" baru terdeteksi!');
        let products = [];
        if (fs.existsSync(DB_PATH)) {
            products = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        }
        const captionLines = msg.caption.split('\n');
        const keywordIndex = captionLines.findIndex(line => line.toUpperCase().includes('FOR SALE'));
        let productName = 'Nama Produk Tidak Ditemukan', nameIndex = -1;
        for (let i = keywordIndex + 1; i < captionLines.length; i++) {
            if (captionLines[i].trim() !== '') { productName = captionLines[i].trim(); nameIndex = i; break; }
        }
        const productDescription = captionLines.slice(nameIndex + 1).join('\n').trim();
        const newProduct = {
            id: msg.message_id,
            name: productName,
            description: productDescription,
            // Menggunakan key yang sama: 'image_file_id'
            image_file_id: msg.photo[msg.photo.length - 1].file_id
        };
        products.unshift(newProduct);
        fs.writeFileSync(DB_PATH, JSON.stringify(products, null, 2));
        console.log(`[DB] Sukses! Produk baru "${newProduct.name}" disimpan.`);
    } catch (error) { console.error('[BOT] Gagal memproses postingan baru:', error.message); }
});

// Fungsi utama untuk menjalankan server dan ngrok
async function start() {
    app.listen(PORT, () => {
        console.log(`[SERVER] Backend berjalan di http://localhost:${PORT}`);
        console.log('[BOT] Bot aktif...');
    });

    try {
        publicUrl = await ngrok.connect({ addr: PORT, authtoken: NGROK_AUTHTOKEN });
        console.log('================================================================');
        console.log(`[NGROK] URL Publik Aktif: ${publicUrl}`);
        console.log('================================================================');
        bot.setMyCommands([{ command: '/start', description: 'Buka Katalog Produk' }]);
    } catch (error) {
        console.error("[NGROK] Gagal koneksi:", error);
        process.exit(1);
    }
}

start();