// File: server.js (Versi FINAL yang Disempurnakan)
require('dotenv').config();
const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

// --- KONFIGURASI ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const VERCEL_URL = process.env.VERCEL_URL;
const MONGODB_URI = process.env.MONGODB_URI;

// Validasi
if (!BOT_TOKEN || !CHANNEL_ID || !MONGODB_URI) {
    console.error("FATAL: Variabel BOT_TOKEN, CHANNEL_ID, dan MONGODB_URI wajib diisi.");
}

const bot = new TelegramBot(BOT_TOKEN);
const app = express();

// --- PERBAIKAN URUTAN MIDDLEWARE (SANGAT PENTING) ---
// 1. Aktifkan CORS untuk semua permintaan SEBELUM route lain.
app.use(cors());

// 2. Aktifkan pembaca body JSON untuk webhook.
app.use(express.json());


// --- KONEKSI KE DATABASE MONGODB ---
let db;
async function connectToDatabase() {
    if (db) return db;
    const client = new MongoClient(MONGODB_URI, { serverApi: ServerApiVersion.v1 });
    await client.connect();
    db = client.db("kandangpetDB");
    console.log("Berhasil terhubung ke MongoDB Atlas!");
    return db;
}


// --- PENGATURAN WEBHOOK ---
// Kita hanya perlu endpoint untuk MENERIMA webhook, tidak perlu MENGATURNYA lagi.
// Pengaturan URL Mini App dilakukan via @BotFather.
// Pengaturan webhook untuk channel post dilakukan sekali via script terpisah.
app.post('/api/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});


// --- ROUTING DAN API ENDPOINTS ---
// 3. Sajikan file frontend SETELAH middleware CORS.
app.use(express.static(path.join(__dirname, 'public')));

// API untuk memberitahu frontend alamatnya
app.get('/api/config', (req, res) => {
    const baseUrl = VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:3000';
    res.json({ baseUrl });
});

// API untuk mengambil semua produk dari MongoDB
// GANTI FUNGSI LAMA DENGAN INI
app.get('/api/products', async (req, res) => {
    console.log("LOG MATA-MATA: Endpoint /api/products dipanggil."); // Mata-mata #1
    try {
        console.log("LOG MATA-MATA: Mencoba menghubungkan ke database..."); // Mata-mata #2
        const database = await connectToDatabase();
        
        console.log("LOG MATA-MATA: Berhasil terhubung. Mencoba mengambil & mengurutkan produk..."); // Mata-mata #3

        const products = await database.collection("products").find({}).sort({ id: -1 }).toArray();
        
        console.log(`LOG MATA-MATA: Berhasil mengambil ${products.length} produk dari database.`); // Mata-mata #4

        res.json(products);
        
        console.log("LOG MATA-MATA: Berhasil mengirim data produk ke frontend."); // Mata-mata #5

    } catch (error) {
        console.error("ERROR MERAH TERDETEKSI di /api/products:", error); // Mata-mata #6
        res.status(500).json({ error: "Gagal mengambil data produk." });
    }
});

// API untuk redirect gambar
app.get('/file/:file_id', async (req, res) => {
    try {
        const fileLink = await bot.getFileLink(req.params.file_id);
        res.redirect(fileLink);
    } catch (error) {
        res.status(404).send('File tidak ditemukan.');
    }
});


// --- LOGIKA BOT ---
// (Semua logika bot.onText dan bot.on di sini TIDAK BERUBAH)
bot.onText(/\/start/, (msg) => {
    const baseUrl = VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:3000';
    bot.sendMessage(msg.chat.id, 'Selamat datang! Klik untuk membuka katalog.', {
        reply_markup: { inline_keyboard: [[{ text: '🚀 Buka Katalog', web_app: { url: baseUrl } }]] }
    });
});
bot.on('channel_post', async (msg) => {
    if (msg.chat.id.toString() !== CHANNEL_ID || !msg.photo || !msg.caption || !msg.caption.toUpperCase().includes('FOR SALE')) {
        return;
    }
    try {
        const database = await connectToDatabase();
        const captionLines = msg.caption.split('\n');
        const keywordIndex = captionLines.findIndex(line => line.toUpperCase().includes('FOR SALE'));
        let productName = 'Nama Produk Tidak Ditemukan', nameIndex = -1;
        for (let i = keywordIndex + 1; i < captionLines.length; i++) {
            if (captionLines[i].trim() !== '') { productName = captionLines[i].trim(); nameIndex = i; break; }
        }
        const productDescription = captionLines.slice(nameIndex + 1).join('\n').trim();
        const newProduct = {
            id: msg.message_id, name: productName, description: productDescription,
            image_file_id: msg.photo[msg.photo.length - 1].file_id
        };
        await database.collection("products").insertOne(newProduct);
        console.log(`[DB] Sukses! Produk baru "${newProduct.name}" disimpan ke MongoDB.`);
    } catch (error) { console.error('[BOT] Gagal memproses postingan baru:', error.message); }
});

// Export 'app' agar Vercel bisa menjalankannya
module.exports = app;