// Filter module for product filtering functionality

export const initFilters = () => {
    const priceFilterForm = document.getElementById('priceFilterForm');
    const filterOptions = document.querySelectorAll('.filter-option');
    const clearFiltersBtn = document.querySelector('.clear-filters');
    const filterTags = document.querySelectorAll('.filter-tag-remove');
    const sortSelect = document.querySelector('[data-sort-select]');

    // Price filter form submission
    if (priceFilterForm) {
        priceFilterForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const params = new URLSearchParams(window.location.search);

            const minPrice = formData.get('minPrice').trim();
            const maxPrice = formData.get('maxPrice').trim();

            if (minPrice) params.set('minPrice', minPrice); else params.delete('minPrice');
            if (maxPrice) params.set('maxPrice', maxPrice); else params.delete('maxPrice');

            params.delete('page');
            window.location.href = `/products?${params.toString()}`;
        });
    }

    // Filter options (links) click handling
    filterOptions.forEach(optionLink => {
        optionLink.addEventListener('click', function(e) {
            // Link behavior handles navigation
        });
    });

    // DÜZELTME: Arama Fonksiyonelliği (Debounce Kaldırıldı)
    const searchForm = document.querySelector('.search-form');
    const searchInput = searchForm ? searchForm.querySelector('input[name="q"]') : null;

    if (searchForm && searchInput) {
        // 'input' event listener'ı kaldırıldı (yazarken otomatik arama iptal)
        
        // Sadece form gönderildiğinde (Enter veya Buton) çalışır
        searchForm.addEventListener('submit', (e) => {
             const value = searchInput.value.trim();
             
             // Eğer input boşsa göndermeyi engelle
             if (value.length === 0) {
                 e.preventDefault();
                 // ui.js içindeki düzenleme sayesinde buton "İşleniyor..."da kalmayacak
                 return;
             }
             
             // Eğer doluysa standart form gönderimine izin ver
             // Tarayıcı action="/products/search" adresine yönlendirecek
        });
    }

    // Clear all filters button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/products';
        });
    }

    // Active filter tags removal
    filterTags.forEach(tag => {
        tag.addEventListener('click', function() {
            const filterType = this.dataset.filterType;
            const params = new URLSearchParams(window.location.search);
            params.delete(filterType);
            params.delete('page');
            window.location.href = `/products?${params.toString()}`;
        });
    });

    // Sorting
    if (sortSelect) { 
         sortSelect.addEventListener('change', function() {
            const sortValue = this.value;
            const params = new URLSearchParams(window.location.search);

            if (sortValue) params.set('sort', sortValue); else params.delete('sort');
            params.delete('page');
            window.location.href = `/products?${params.toString()}`;
        });
    }

    // Mobile filter toggle
    const mobileFilterToggle = document.querySelector('[data-mobile-filter-toggle]');
    const filterSidebar = document.querySelector('.filter-sidebar');

    if (mobileFilterToggle && filterSidebar) {
        mobileFilterToggle.addEventListener('click', () => {
            filterSidebar.classList.toggle('mobile-open');
        });
    }

    console.log('✅ Filters module initialized');
};