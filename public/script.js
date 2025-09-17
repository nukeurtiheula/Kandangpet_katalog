// File: public/script.js (Versi FINAL dengan Link & Tombol Beli)
document.addEventListener('DOMContentLoaded', function () {
    // --- AMBIL SEMUA ELEMEN DARI HTML ---
    const productListElement = document.getElementById('product-list');
    const modalElement = document.getElementById('product-modal');
    const modalImg = document.getElementById('modal-img');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const closeModalButton = document.querySelector('.close-modal-button');
    const buyButton = document.getElementById('modal-buy-button');
    
    // Inisialisasi Telegram Web App
    const tg = window.Telegram.WebApp;
    
    // Variabel Global
    let allProducts = [];
    let API_BASE_URL = '';

     // Variabel baru untuk polling
    let pollingInterval;
    let lastProductId = 0;

     // --- FUNGSI BARU: Logika Polling ---
    function startPolling() {
        // Hentikan polling lama jika ada
        if (pollingInterval) clearInterval(pollingInterval);

        // Mulai polling baru setiap 10 detik (10000 milidetik)
        pollingInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/latest?lastId=${lastProductId}`);
                const data = await response.json();

                if (data.newPost && data.latestProduct.id > lastProductId) {
                    showNewPostNotification(data.latestProduct);
                }
            } catch (error) {
                console.warn("Polling check failed:", error);
            }
        }, 10000);
    }

    // --- FUNGSI BARU: Menampilkan Notifikasi ---
    function showNewPostNotification(newProduct) {
        // Hapus notifikasi lama jika ada
        const existingToast = document.querySelector('.new-post-toast');
        if (existingToast) existingToast.remove();

        // Buat elemen notifikasi baru
        const toast = document.createElement('div');
        toast.className = 'new-post-toast';
        toast.innerHTML = `<span class="toast-icon">⚡️</span> <span>Postingan Baru: ${newProduct.name}</span>`;

        // Tambahkan ke body
        document.body.appendChild(toast);

        // Tampilkan dengan animasi
        setTimeout(() => {
            toast.classList.add('show');
            tg.HapticFeedback.notificationOccurred('warning'); // Beri getaran
        }, 100);

        // Sembunyikan setelah 5 detik
        setTimeout(() => {
            toast.classList.remove('show');
            // Hapus dari DOM setelah animasi selesai
            setTimeout(() => toast.remove(), 500);
        }, 5000);

        // Logika saat notifikasi di-klik
        toast.addEventListener('click', () => {
            // Hentikan polling, muat ulang semua produk, lalu mulai polling lagi
            clearInterval(pollingInterval);
            initializeApp(true); // 'true' menandakan ini adalah refresh
            toast.remove();
        });
    }
    // --- FUNGSI PEMBANTU ---

    function applyTelegramTheme() {
        try {
            const theme = tg.themeParams;
            document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color || '#000000');
            document.documentElement.style.setProperty('--tg-theme-hint-color', theme.hint_color || '#999999');
            document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color || '#2481cc');
            document.documentElement.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#f0f2f5');
        } catch (error) { console.warn("Gagal menerapkan tema Telegram:", error); }
    }

    function showSkeletonLoader() {
        productListElement.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'skeleton';
            skeletonCard.innerHTML = `<div class="product-image"></div>`;
            productListElement.appendChild(skeletonCard);
        }
    }

    function linkify(text) {
        const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        const usernameRegex = /(^|\s)@([a-zA-Z0-9_]{5,32})/g;
        let linkedText = text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
        linkedText = linkedText.replace(usernameRegex, (match, space, username) => `${space}<a href="https://t.me/${username}" target="_blank" rel="noopener noreferrer">@${username}</a>`);
        return linkedText;
    }

    function findSellerUsername(description) {
        const regex = /DM to order!\s*:\s*@([a-zA-Z0-9_]{5,32})/;
        const match = description.match(regex);
        return match ? match[1] : null; // Mengembalikan username tanpa '@'
    } // <-- PERBAIKAN: Kurung kurawal yang hilang sudah ditambahkan di sini

    // --- LOGIKA MODAL ---

    function openModal(productId) {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        const imageUrl = `${API_BASE_URL}/file/${product.image_file_id}`;
        modalImg.src = imageUrl;
        modalTitle.textContent = product.name;
        modalDescription.innerHTML = linkify(product.description || '').replace(/\n/g, '<br>');

        const sellerUsername = findSellerUsername(product.description || '');
        if (sellerUsername) {
            buyButton.href = `https://t.me/${sellerUsername}`;
            buyButton.style.display = 'block';
        } else {
            buyButton.style.display = 'none';
        }

        modalElement.style.display = 'flex';
        tg.HapticFeedback.impactOccurred('light');
    }

    function closeModal() {
        modalElement.style.display = 'none';
    }

    // --- FUNGSI UTAMA APLIKASI ---

    // --- FUNGSI UTAMA (Dimodifikasi) ---
    async function initializeApp(isRefresh = false) {
        // Hanya tampilkan skeleton loader saat pertama kali dibuka, bukan saat refresh
        if (!isRefresh) {
            showSkeletonLoader();
        }
        
        try {
            API_BASE_URL = "https://kandangpet-katalog.vercel.app";
            const productsResponse = await fetch(`${API_BASE_URL}/api/products`);
            if (!productsResponse.ok) throw new Error(`HTTP error!`);
            
            allProducts = await productsResponse.json();
            
            productListElement.innerHTML = '';
            if (allProducts.length === 0) {
                productListElement.innerHTML = '<div class="status-message">Belum ada produk.</div>';
                return;
            }

            allProducts.forEach(product => {
                if (!product || !product.image_file_id) return; // Pengecekan lebih aman
                const card = document.createElement('div');
                card.className = 'product-card';
                card.dataset.productId = product.id; 

                card.innerHTML = `
                    <img src="${API_BASE_URL}/file/${product.image_file_id}" alt="${product.name}" class="product-image" loading="lazy">
                    <div class="product-title-overlay">${product.name}</div>
                `;
                
                card.addEventListener('click', () => openModal(product.id));
                productListElement.appendChild(card);
            });
            tg.HapticFeedback.notificationOccurred('success');
        } catch (error) {
            console.error("Error saat inisialisasi:", error);
            productListElement.innerHTML = `
                <div class="status-message">
                    <p>Gagal memuat aplikasi. Coba lagi nanti.</p>
                    <button class="retry-button">Coba Lagi</button>
                </div>
            `;
            document.querySelector('.retry-button').addEventListener('click', initializeApp);
        }
    }

    // --- MENJALANKAN APLIKASI ---
    tg.ready();
    applyTelegramTheme();
    initializeApp();

    // Event Listeners
    tg.onEvent('themeChanged', applyTelegramTheme);
    closeModalButton.addEventListener('click', closeModal);
    modalElement.addEventListener('click', (event) => {
        if (event.target === modalElement) closeModal();
    });
});