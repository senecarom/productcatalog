// UI interactions and enhancements

export const initUI = () => {
    initDropdowns();
    initMobileMenu();
    initImageZoom();
    initSorting();
    initLoaders();
    initModals();

    console.log('✅ UI module initialized');
};

// Dropdown functionality
const initDropdowns = () => {
    const dropdowns = document.querySelectorAll('.dropdown');

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');

        if (toggle && menu) {
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    menu.classList.remove('show');
                }
            });

            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                dropdowns.forEach(other => {
                    if (other !== dropdown) {
                        other.querySelector('.dropdown-menu')?.classList.remove('show');
                    }
                });

                menu.classList.toggle('show');
            });
        }
    });
};

// Mobile menu functionality
const initMobileMenu = () => {
    const mobileMenuToggle = document.querySelector('[data-mobile-menu-toggle]');
    const mobileMenu = document.querySelector('[data-mobile-menu]');

    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('show');
            mobileMenuToggle.classList.toggle('active');
        });

        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('show');
                mobileMenuToggle.classList.remove('active');
            });
        });
    }
};

// Image zoom functionality
const initImageZoom = () => {
    const mainImage = document.querySelector('.main-image img');
    const thumbnails = document.querySelectorAll('.thumbnail');

    if (mainImage && thumbnails.length > 0) {
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const img = thumb.querySelector('img');
                if (img) {
                    mainImage.src = img.src;
                    thumbnails.forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                }
            });
        });

        if (window.innerWidth > 768) {
            mainImage.parentElement.style.overflow = 'hidden';
            mainImage.addEventListener('mousemove', (e) => {
                const { left, top, width, height } = mainImage.getBoundingClientRect();
                const x = (e.clientX - left) / width * 100;
                const y = (e.clientY - top) / height * 100;
                mainImage.style.transformOrigin = `${x}% ${y}%`;
                mainImage.style.transform = 'scale(1.5)';
                mainImage.style.transition = 'transform 0.1s ease';
            });

            mainImage.addEventListener('mouseleave', () => {
                mainImage.style.transformOrigin = `center center`;
                mainImage.style.transform = 'scale(1)';
            });
        }
    }
};

// Sorting functionality
const initSorting = () => {
    const sortSelect = document.querySelector('[data-sort-select]');

    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const sortValue = this.value;
            const params = new URLSearchParams(window.location.search);

            if (sortValue) {
                params.set('sort', sortValue);
            } else {
                params.delete('sort');
            }

            params.delete('page');
            window.location.href = `/products?${params.toString()}`;
        });
    }
};

// Loading states
const initLoaders = () => {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            // DÜZELTME: Arama formu boşsa loading state'i tetikleme
            // Bu, butonun "İşleniyor..." durumunda takılı kalmasını engeller.
            const searchInput = this.querySelector('input[name="q"]');
            if (searchInput) {
                // Eğer search input varsa ve boşsa, loader'ı başlatma
                if (!searchInput.value.trim()) {
                    return; 
                }
            }

            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                // Eğer buton zaten kilitliyse işlemi durdur (çift tıklama önlemi)
                if (submitBtn.disabled) {
                    e.preventDefault();
                    return;
                }

                submitBtn.disabled = true;
                // Orijinal içeriği saklayabiliriz ama şimdilik basit tutuyoruz
                submitBtn.innerHTML = `
                    <span class="loading-spinner"></span>
                    İşleniyor...
                `;

                if (!document.querySelector('#loading-styles')) {
                    const styles = document.createElement('style');
                    styles.id = 'loading-styles';
                    styles.textContent = `
                        .loading-spinner {
                            display: inline-block;
                            width: 1em;
                            height: 1em;
                            border: 2px solid currentColor;
                            border-radius: 50%;
                            border-top-color: transparent;
                            animation: spin 0.8s linear infinite;
                            margin-right: 0.5em;
                            vertical-align: middle;
                        }
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                        button:disabled .loading-spinner {
                             opacity: 0.7;
                        }
                    `;
                    document.head.appendChild(styles);
                }
            }
        });
    });

    const productCards = document.querySelectorAll('.product-card a');
    productCards.forEach(link => {
        link.addEventListener('click', function(e) {
             const card = link.closest('.product-card');
             if (card) {
                card.style.opacity = '0.7';
                card.style.transition = 'opacity 0.2s ease';
             }
        });
    });
};

// Confirmation Modal functionality
const initModals = () => {
    let targetForm = null;
    const modalToggles = document.querySelectorAll('[data-modal-toggle]');
    modalToggles.forEach(toggleBtn => {
        const modalId = toggleBtn.dataset.modalToggle;
        const modal = document.getElementById(modalId);
        if (!modal) return;

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const formSelector = toggleBtn.dataset.modalFormTarget;
            targetForm = document.querySelector(formSelector);

            if (targetForm) {
                modal.classList.add('show');
                const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) firstFocusable.focus();
            }
        });
    });

    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        const modalId = modal.id;
        const closeBtns = modal.querySelectorAll(`[data-modal-close="${modalId}"]`);
        const confirmBtn = document.getElementById(`${modalId}-confirm-btn`);

        closeBtns.forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('show');
                targetForm = null;
            });
        });

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                if (targetForm) {
                    confirmBtn.disabled = true;
                    confirmBtn.innerHTML = `<span class="loading-spinner"></span> ${confirmBtn.textContent}`;
                    targetForm.submit();
                } else {
                    modal.classList.remove('show');
                }
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                targetForm = null;
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal-overlay.show');
            if (openModal) {
                openModal.classList.remove('show');
                targetForm = null;
            }
        }
    });
    console.log('✅ Modals module initialized');
};