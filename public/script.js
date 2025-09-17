document.addEventListener('DOMContentLoaded', function () {
    const productListElement = document.getElementById('product-list');
    const tg = window.Telegram.WebApp;
    tg.ready();

    // GANTI FUNGSI LAMA DENGAN INI
async function initializeApp() {
    try {
        // Langsung gunakan URL produksi, tidak perlu bertanya lagi.
        const API_BASE_URL = "https://kandangpet-katalog.vercel.app";
        const productsResponse = await fetch(`${API_BASE_URL}/api/products`);
        
        if (!productsResponse.ok) throw new Error("Gagal mengambil data produk.");
        
        const products = await productsResponse.json();
        
        // --- MATA-MATA PALING PENTING ADA DI SINI ---
        console.log("MATA-MATA FRONTEND: Data produk berhasil diterima dari server."); // Mata-mata #3
        console.log("DATA MENTAH:", products); // Mata-mata #4 - Tampilkan seluruh data

        productListElement.innerHTML = '';
        if (products.length === 0) {
            productListElement.innerHTML = '<div class="info">Belum ada produk.</div>';
            return;
        }

        console.log("MATA-MATA FRONTEND: Memulai loop untuk menampilkan produk..."); // Mata-mata #5

        products.forEach((product, index) => {
            console.log(`MATA-MATA FRONTEND: Memproses produk ke-${index + 1}`, product); // Mata-mata #6
            
            // Pengecekan lebih aman
            if (!product || typeof product !== 'object') {
                console.warn("Data produk tidak valid, dilewati:", product);
                return; // Lewati item yang aneh
            }

            const imageId = product.image_file_id;
            const productName = product.name || "Nama Tidak Tersedia"; // Default value
            const productDescription = product.description || "Deskripsi Tidak Tersedia"; // Default value

            if (!imageId) {
                console.warn("Produk dilewati karena tidak punya image_file_id:", product);
                return;
            }

            const imageUrl = `${API_BASE_URL}/file/${imageId}`;
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${imageUrl}" alt="${productName}" class="product-image" loading="lazy">
                <div class="product-info">
                    <h2 class="product-title">${productName}</h2>
                    <p class="product-description">${productDescription.replace(/\n/g, '<br>')}</p>
                </div>
            `;
            productListElement.appendChild(card);
        });

        console.log("MATA-MATA FRONTEND: Loop selesai. Semua produk berhasil ditampilkan."); // Mata-mata #7

    } catch (error) {
        console.error("ERROR MERAH DI FRONTEND:", error); // Mata-mata #8
        productListElement.innerHTML = '<div class="error">Gagal memuat aplikasi. Coba lagi nanti.</div>';
    }
}
    initializeApp();
});