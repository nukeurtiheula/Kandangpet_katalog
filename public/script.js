document.addEventListener('DOMContentLoaded', function () {
    const productListElement = document.getElementById('product-list');
    const tg = window.Telegram.WebApp;
    tg.ready();

    async function initializeApp() {
        try {
            // Kita gunakan path relatif. Browser akan otomatis mengarah ke domain ngrok.
            const configResponse = await fetch('/api/config');
            const config = await configResponse.json();
            const API_BASE_URL = config.baseUrl;

            if (!API_BASE_URL) throw new Error("Gagal mendapatkan konfigurasi URL.");

            const productsResponse = await fetch(`${API_BASE_URL}/api/products`);
            if (!productsResponse.ok) throw new Error("Gagal mengambil data produk.");
            
            const products = await productsResponse.json();

            productListElement.innerHTML = '';
            if (products.length === 0) {
                productListElement.innerHTML = '<div class="info">Belum ada produk.</div>';
                return;
            }

            products.forEach(product => {
                // Sekarang kita hanya perlu mencari 'image_file_id' karena sudah konsisten
                const imageId = product.image_file_id;
                if (!imageId) return;

                const imageUrl = `${API_BASE_URL}/file/${imageId}`;
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <img src="${imageUrl}" alt="${product.name}" class="product-image" loading="lazy">
                    <div class="product-info">
                        <h2 class="product-title">${product.name}</h2>
                        <p class="product-description">${product.description}</p>
                    </div>
                `;
                productListElement.appendChild(card);
            });

        } catch (error) {
            console.error("Error saat inisialisasi:", error);
            productListElement.innerHTML = '<div class="error">Gagal memuat aplikasi. Coba lagi nanti.</div>';
        }
    }

    initializeApp();
});