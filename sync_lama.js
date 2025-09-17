// =================================================================
//      SKRIP SINKRONISASI POSTINGAN LAMA - KANDANGPET
// =================================================================
console.log("Memulai skrip sinkronisasi...");

require('dotenv').config();
const fs = require('fs'); // <--- FIX 1: Ditambahkan
const path = require('path'); // <--- FIX 2: Ditambahkan

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");

// --- Konfigurasi ---
const API_ID = parseInt(process.env.API_ID);
const API_HASH = process.env.API_HASH;
const SESSION_STRING = process.env.SESSION_STRING || "";
const CHANNEL_ID = parseInt(process.env.CHANNEL_ID);
const DB_PATH = path.join(__dirname, 'db.json');

const client = new TelegramClient(new StringSession(SESSION_STRING), API_ID, API_HASH, {
    connectionRetries: 5,
});

async function main() {
    // --- PERBAIKAN LOGIKA LOGIN ---
    if (!SESSION_STRING) {
        console.log("Session string tidak ditemukan. Memulai proses login...");
        await client.start({
            phoneNumber: async () => await input.text("Masukkan nomor telepon Anda (format +62...): "),
            password: async () => await input.text("Masukkan password 2FA Anda (jika ada): "),
            phoneCode: async () => await input.text("Masukkan kode yang dikirim ke Telegram Anda: "),
            onError: (err) => console.log(err),
        });

        console.log("\nBerhasil terhubung!");
        console.log("Session String Anda:", client.session.save());
        console.log("\n--- SIMPAN SESSION STRING DI ATAS KE FILE .env ---");
        console.log("--- Contoh: SESSION_STRING=\"IsiStringDariSini\" ---");
        console.log("--- Setelah disimpan, jalankan lagi skrip ini. ---");
        return; // Hentikan skrip setelah mendapatkan session
    }

    console.log("Menghubungkan ke Telegram menggunakan session yang ada...");
    await client.connect();
    console.log("Berhasil terhubung!");

    // Membaca database yang sudah ada
    let products = [];
    if (fs.existsSync(DB_PATH)) {
        products = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        console.log(`[DB] Ditemukan ${products.length} produk di database.`);
    }

    let newProductsCount = 0;

    console.log(`\nMemulai pencarian riwayat di Channel ID: ${CHANNEL_ID}...`);
    // Iterasi melalui semua pesan di channel
    // Batas 1000 pesan terakhir, bisa disesuaikan
    for await (const message of client.iterMessages(CHANNEL_ID, { limit: 1000 })) { 
        // Cek apakah pesan valid untuk diproses (punya foto, teks, dan kata 'FOR SALE')
        if (message.media && message.media.photo && message.text && message.text.toUpperCase().includes('FOR SALE')) {
            // Cek apakah produk sudah ada di DB berdasarkan ID pesan
            if (products.some(p => p.id === message.id)) {
                continue; // Lewati jika sudah ada
            }

            try {
                const captionLines = message.text.split('\n');
                const keywordIndex = captionLines.findIndex(line => line.toUpperCase().includes('FOR SALE'));
                
                let productName = 'Nama Produk Tidak Ditemukan';
                let nameIndex = -1;
                
                // Cari baris nama produk yang tidak kosong setelah baris 'FOR SALE'
                for (let i = keywordIndex + 1; i < captionLines.length; i++) {
                    if (captionLines[i].trim() !== '') {
                        productName = captionLines[i].trim();
                        nameIndex = i;
                        break;
                    }
                }
                const productDescription = captionLines.slice(nameIndex + 1).join('\n').trim();

                const newProduct = {
                    id: message.id,
                    name: productName,
                    description: productDescription,
                    // <--- FIX 3: Menggunakan ID dari media foto
                    image_id: message.media.photo.id.toString(), 
                };

                products.unshift(newProduct); // Tambah produk baru di awal array
                newProductsCount++;
                console.log(`[+] Ditemukan produk baru: "${productName}"`);

            } catch (err) {
                console.warn(`[!] Gagal memproses pesan ID ${message.id}: ${err.message}`);
            }
        }
    }

    if (newProductsCount > 0) {
        fs.writeFileSync(DB_PATH, JSON.stringify(products, null, 2));
        console.log(`\n[SELESAI] Sinkronisasi berhasil! ${newProductsCount} produk baru telah ditambahkan ke db.json.`);
    } else {
        console.log("\n[SELESAI] Tidak ada produk baru yang ditemukan.");
    }

    await client.disconnect();
}

main().catch((err) => {
    console.error("\nTerjadi error yang tidak terduga:", err);
});