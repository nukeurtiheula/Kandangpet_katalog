// File: migrate.js (Versi MongoDB)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_PATH = path.join(__dirname, 'db.json');

async function migrate() {
    if (!MONGODB_URI) {
        return console.error("ERROR: MONGODB_URI tidak ditemukan di .env");
    }
    if (!fs.existsSync(DB_PATH)) {
        return console.error("ERROR: db.json tidak ditemukan!");
    }

    const client = new MongoClient(MONGODB_URI, { serverApi: ServerApiVersion.v1 });

    try {
        console.log("Menghubungkan ke MongoDB Atlas...");
        await client.connect();
        const db = client.db("kandangpetDB");
        const collection = db.collection("products");
        console.log("Terhubung!");

        const localData = fs.readFileSync(DB_PATH, 'utf-8');
        const productsToMigrate = JSON.parse(localData);

        if (productsToMigrate.length === 0) {
            return console.warn("db.json kosong, tidak ada data untuk dimigrasi.");
        }

        console.log(`Menghapus data lama dari koleksi...`);
        await collection.deleteMany({}); // Hapus semua data lama

        console.log(`Memigrasi ${productsToMigrate.length} produk baru...`);
        await collection.insertMany(productsToMigrate);

        console.log("✅ SUKSES! Data berhasil dimigrasi ke MongoDB Atlas.");

    } catch (error) {
        console.error("❌ GAGAL!", error);
    } finally {
        await client.close();
        console.log("Koneksi ditutup.");
    }
}

migrate();