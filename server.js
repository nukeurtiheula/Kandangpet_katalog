// File: server.js (Versi FINAL untuk MongoDB + Vercel)
require('dotenv').config();
const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

// --- KONFIGURASI ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const VERCEL_URL = process.env.VERCEL_URL; // Ini disediakan otomatis oleh Vercel
const MONGODB_URI = process.env.MONGODB_URI; // Ini dari MongoDB Atlas

// Validasi
if (!BOT_TOKEN || !CHANNEL_ID || !MONGODB_URI) {
    console.error("FATAL: Pastikan BOT_TOKEN, CHANNEL_ID, dan MONGODB_URI ada di Environment Variables.");
    // Di Vercel, kita tidak bisa process.exit, cukup log error saja.
    // Vercel akan menandai deployment sebagai gagal jika ada error saat startup.
}

const bot = new TelegramBot(BOT_TOKEN);
const app = express();
app.use(express.json());
app.use(cors());
// --- KONEKSI KE DATABASE MONGODB ---
// Kita buat koneksi sekali dan coba gunakan kembali
let db;
async function connectToDatabase() {
    if (db) return db;
    const client = new MongoClient(MONGODB_URI, { serverApi: ServerApiVersion.v1 });
    await client.connect();
    db = client.db("kandangpetDB"); // Kamu bisa ganti nama database-nya di sini
    console.log("Berhasil terhubung ke MongoDB Atlas!");
    return db;
}

// Endpoint untuk menerima update dari Webhook Telegram
app.post('/api/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});


// --- API ENDPOINTS ---

// Sajikan file frontend dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// API untuk memberitahu frontend alamatnya
app.get('/api/config', (req, res) => {
    // Pastikan VERCEL_URL ada sebelum mengirim
    const baseUrl = VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:3000';
    res.json({ baseUrl });
});

// API untuk mengambil semua produk dari MongoDB
app.get('/api/products', async (req, res) => {
    try {
        const database = await connectToDatabase();
        // Ambil data dan urutkan berdasarkan 'id' dari yang terbaru (descending)
        const products = await database.collection("products").find({}).sort({ id: -1 }).toArray();
        res.json(products);
    } catch (error) {
        console.error("Gagal mengambil produk:", error);
        res.status(500).json({ error: "Gagal mengambil data produk." });
    }
});

// API untuk redirect gambar (tidak berubah)
app.get('/file/:file_id', async (req, res) => {
    try {
        const fileLink = await bot.getFileLink(req.params.file_id);
        res.redirect(fileLink);
    } catch (error) {
        res.status(404).send('File tidak ditemukan.');
    }
});


// --- LOGIKA BOT ---

// Menangani perintah /start
bot.onText(/\/start/, (msg) => {
    const baseUrl = VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:3000';
    bot.sendMessage(msg.chat.id, 'Selamat datang! Klik untuk membuka katalog.', {
        reply_markup: { inline_keyboard: [[{ text: '🚀 Buka Katalog', web_app: { url: baseUrl } }]] }
    });
});

// Menangani postingan baru di channel
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
            id: msg.message_id,
            name: productName,
            description: productDescription,
            image_file_id: msg.photo[msg.photo.length - 1].file_id
        };

        // Simpan produk baru ke koleksi 'products' di MongoDB
        await database.collection("products").insertOne(newProduct);
        console.log(`[DB] Sukses! Produk baru "${newProduct.name}" disimpan ke MongoDB.`);
    } catch (error) {
        console.error('[BOT] Gagal memproses postingan baru:', error.message);
    }
});

// Export 'app' agar Vercel bisa menjalankannya
module.exports = app;