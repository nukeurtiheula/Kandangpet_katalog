// File: public/script.js (Versi Profesional)

document.addEventListener('DOMContentLoaded', function () {
    const productListElement = document.getElementById('product-list');
    const tg = window.Telegram.WebApp;

    // --- 1. Fungsi untuk Menerapkan Tema dari Telegram ---
    function applyTelegramTheme() {
        try {
            const theme = tg.themeParams;
            document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color);
            document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color);
            document.documentElement.style.setProperty('--tg-theme-hint-color', theme.hint_color);
            document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color);
            document.documentElement.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
            document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
        } catch (error) {
            console.warn("Gagal menerapkan tema Telegram:", error);
        }
    }

    // --- 2. Fungsi untuk Menampilkan Skeleton Loader ---
    function showSkeletonLoader() {
        productListElement.innerHTML = ''; // Kosongkan dulu
        for (let i = 0; i < 6; i++) { // Tampilkan 6 placeholder
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'skeleton';
            skeletonCard.innerHTML = `
                <div class="product-image"></div>
                <div class="product-info">
                    <div class="skeleton-text title"></div>
                    <div class="skeleton-text desc"></div>
                </div>
            `;
            productListElement.appendChild(skeletonCard);
        }
    }

    // --- 3. Fungsi Utama ---
    async function initializeApp() {
        showSkeletonLoader(); // Tampilkan loader dulu

        try {
            const API_BASE_URL = "https://kandangpet-katalog.vercel.app"; // URL produksi
            const productsResponse = await fetch(`${API_BASE_URL}/api/products`);
            
            if (!productsResponse.ok) {
                throw new Error(`HTTP error! status: ${productsResponse.status}`);
            }
            
            const products = await productsResponse.json();
            
            productListElement.innerHTML = ''; // Hapus skeleton loader

            if (products.length === 0) {
                productListElement.innerHTML = '<div class="status-message">Belum ada produk untuk ditampilkan.</div>';
                return;
            }

            // Tampilkan produk asli
            products.forEach(product => {
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
            
            // Beri umpan balik getaran saat berhasil memuat
            tg.HapticFeedback.notificationOccurred('success');

        } catch (error) {
            console.error("Error saat inisialisasi:", error);
            productListElement.innerHTML = `
                <div class="status-message">
                    <p>Gagal memuat aplikasi. Coba lagi nanti.</p>
                    <button class="retry-button">Coba Lagi</button>
                </div>
            `;
            // Tambahkan event listener ke tombol "Coba Lagi"
            document.querySelector('.retry-button').addEventListener('click', initializeApp);
        }
    }

    // --- 4. Inisialisasi Aplikasi ---
    tg.ready();
    applyTelegramTheme();
    initializeApp();

    // Dengarkan perubahan tema dari Telegram
    tg.onEvent('themeChanged', applyTelegramTheme);
});