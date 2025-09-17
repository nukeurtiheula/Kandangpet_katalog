// File: public/script.js (Versi Profesional + Modal)
document.addEventListener('DOMContentLoaded', function () {
    const productListElement = document.getElementById('product-list');
    const tg = window.Telegram.WebApp;

    // Ambil Elemen Modal dari HTML
    const modalElement = document.getElementById('product-modal');
    const modalImg = document.getElementById('modal-img');
    const modalTitle = document.getElementById('modal-title');
    const modalDescription = document.getElementById('modal-description');
    const closeModalButton = document.querySelector('.close-modal-button');
    
    // Variabel untuk Menyimpan Data
    let allProducts = [];
    let API_BASE_URL = '';

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
    
    // Fungsi untuk Modal
    function openModal(productId) {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;
        
        const imageUrl = `${API_BASE_URL}/file/${product.image_file_id}`;
        modalImg.src = imageUrl;
        modalTitle.textContent = product.name;
        modalDescription.innerHTML = product.description.replace(/\n/g, '<br>');

        modalElement.style.display = 'flex';
        tg.HapticFeedback.impactOccurred('light');
    }

    function closeModal() {
        modalElement.style.display = 'none';
    }

    // Event listener untuk menutup modal
    closeModalButton.addEventListener('click', closeModal);
    modalElement.addEventListener('click', (event) => {
        if (event.target === modalElement) closeModal();
    });

    // Fungsi Utama
    async function initializeApp() {
        showSkeletonLoader();
        try {
            API_BASE_URL = "https://kandangpet-katalog.vercel.app";
            const productsResponse = await fetch(`${API_BASE_URL}/api/products`);
            if (!productsResponse.ok) throw new Error(`HTTP error! status: ${productsResponse.status}`);
            
            allProducts = await productsResponse.json();
            
            productListElement.innerHTML = '';
            if (allProducts.length === 0) {
                productListElement.innerHTML = '<div class="status-message">Belum ada produk.</div>';
                return;
            }

            allProducts.forEach(product => {
                const imageId = product.image_file_id;
                if (!imageId) return;

                const card = document.createElement('div');
                card.className = 'product-card';
                card.dataset.productId = product.id; 

                card.innerHTML = `
                    <img src="${API_BASE_URL}/file/${imageId}" alt="${product.name}" class="product-image" loading="lazy">
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

    // Inisialisasi
    tg.ready();
    applyTelegramTheme();
    initializeApp();
    tg.onEvent('themeChanged', applyTelegramTheme);
});