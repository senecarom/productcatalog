const Product = require('../models/Product');
// HATA 4 DÜZELTMESİ: Kategori artık global middleware'den geldiği için burada gerek yok.
// const Category = require('../models/Category');
const { APP_CONSTANTS, SORT_OPTIONS } = require('../config/constants');

const productController = {
  // Ürün listesi sayfası
  getProducts: async (req, res) => {
    try {
      const {
        category,
        minPrice,
        maxPrice,
        rating,
        inStock,
        brand,
        sort,
        page = 1
      } = req.query;

      // Filtre objesini oluştur
      const filters = {
        category,
        minPrice,
        maxPrice,
        rating,
        inStock,
        brand
      };

      // Sıralama seçeneği
      let sortOption = SORT_OPTIONS.NEWEST;
      if (sort && SORT_OPTIONS[sort.toUpperCase()]) {
        sortOption = SORT_OPTIONS[sort.toUpperCase()];
      }

      // Sayfalama
      const pagination = {
        page: parseInt(page),
        limit: APP_CONSTANTS.ITEMS_PER_PAGE
      };

      // Ürünleri getir
      const result = await Product.getAll(filters, sortOption, pagination);
      
      // HATA 4 DÜZELTMESİ: Kategori verisi 'res.locals' aracılığıyla zaten mevcut.
      // const categories = await Category.getAll();

      // MARKALARI GETİR
      const brands = await Product.getBrands();

      res.render('pages/products/list', {
        title: 'Ürünler',
        products: result.products,
        pagination: result.pagination,
        // categories, // Kaldırıldı
        brands, // Markaları view'a geçir
        filters,
        sortOptions: SORT_OPTIONS,
        currentSort: sort || 'newest',
        constants: APP_CONSTANTS
      });
    } catch (error) {
      console.error('Ürün listesi yüklenirken hata:', error);
      res.status(500).render('pages/error', {
        title: 'Hata',
        message: 'Ürün listesi yüklenirken bir hata oluştu.'
      });
    }
  },

  // Arama sonuçları
  searchProducts: async (req, res) => {
    try {
      const { q: searchQuery, page = 1, sort } = req.query; // Sort parametresi eklendi

      if (!searchQuery) {
        return res.redirect('/products');
      }

      const filters = { search: searchQuery };
      
      // DÜZELTME: Arama yaparken de sıralama seçeneklerini dikkate al
      let sortOption = SORT_OPTIONS.NEWEST;
      if (sort && SORT_OPTIONS[sort.toUpperCase()]) {
        sortOption = SORT_OPTIONS[sort.toUpperCase()];
      }

      const pagination = {
        page: parseInt(page),
        limit: APP_CONSTANTS.ITEMS_PER_PAGE
      };

      const result = await Product.getAll(filters, sortOption, pagination);

      // MARKALARI GETİR
      const brands = await Product.getBrands();
      // HATA 4 DÜZELTMESİ: Kategori verisi 'res.locals' aracılığıyla zaten mevcut.
      // const categories = await Category.getAll();

      // DÜZELTME: sortOptions ve currentSort eklendi. Sidebar artık hata vermeyecek.
      res.render('pages/products/list', {
        title: `"${searchQuery}" Arama Sonuçları`,
        products: result.products,
        pagination: result.pagination,
        searchQuery,
        filters, // Filtrelerin arama sayfasında da korunması için
        brands, 
        // categories, // Kaldırıldı
        sortOptions: SORT_OPTIONS, // DÜZELTİLDİ: Sidebar için gerekli
        currentSort: sort || 'newest', // DÜZELTİLDİ: Sidebar için gerekli
        constants: APP_CONSTANTS
      });
    } catch (error) {
      console.error('Arama sonuçları yüklenirken hata:', error);
      res.status(500).render('pages/error', {
        title: 'Hata',
        message: 'Arama sonuçları yüklenirken bir hata oluştu.'
      });
    }
  },

  // Ürün detay sayfası
  getProductDetail: async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.getById(id);
      
      if (!product) {
        return res.status(404).render('pages/error', {
          title: 'Ürün Bulunamadı',
          message: 'Aradığınız ürün mevcut değil.'
        });
      }

      // Benzer ürünleri getir
      const similarProducts = await Product.getSimilar(id, product.category, 4);

      res.render('pages/products/detail', {
        title: product.name,
        product,
        similarProducts,
        constants: APP_CONSTANTS
        // Not: Bu sayfa navbar için 'res.locals.categories' kullanır
      });
    } catch (error) {
      console.error('Ürün detayı yüklenirken hata:', error);
      res.status(500).render('pages/error', {
        title: 'Hata',
        message: 'Ürün detayı yüklenirken bir hata oluştu.'
      });
    }
  },

  // Yeni ürün formu
  getNewProductForm: async (req, res) => {
    try {
      // HATA 4 DÜZELTMESİ: Kategori verisi 'res.locals' aracılığıyla zaten mevcut.
      // const categories = await Category.getAll();

      res.render('pages/products/new', {
        title: 'Yeni Ürün Ekle',
        // categories, // Kaldırıldı
        constants: APP_CONSTANTS,
        product: {} // Boş ürün objesi (form için)
      });
    } catch (error) {
      console.error('Yeni ürün formu yüklenirken hata:', error);
      res.status(500).render('pages/error', {
        title: 'Hata',
        message: 'Form yüklenirken bir hata oluştu.'
      });
    }
  },

  // Yeni ürün oluştur
  createProduct: async (req, res) => {
    try {
      const productData = req.body;

      // Görsel URL'lerini array'e çevir
      if (productData.images) {
        productData.images = productData.images.split('\n').map(url => url.trim()).filter(url => url);
      }

      // Özellikleri array'e çevir
      if (productData.features) {
        productData.features = productData.features.split('\n').map(feature => feature.trim()).filter(feature => feature);
      }

      // HATA 5 DÜZELTMESİ: Gereksiz validasyon bloğu kaldırıldı.
      // Bu işi 'validateProduct' middleware'i zaten yapıyor.

      const productId = await Product.create(productData);

      res.redirect(`/products/${productId}`);
    } catch (error) {
      console.error('Ürün oluşturulurken hata:', error);
      // HATA 4 DÜZELTMESİ: Kategori verisi 'res.locals' aracılığıyla zaten mevcut.
      // const categories = await Category.getAll();
      res.status(500).render('pages/products/new', {
        title: 'Yeni Ürün Ekle',
        // categories, // Kaldırıldı
        constants: APP_CONSTANTS,
        product: req.body,
        error: 'Ürün oluşturulurken bir hata oluştu.'
      });
    }
  },

  // Ürün düzenleme formu
  getEditProductForm: async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.getById(id);
      // HATA 4 DÜZELTMESİ: Kategori verisi 'res.locals' aracılığıyla zaten mevcut.
      // const categories = await Category.getAll();

      if (!product) {
        return res.status(404).render('pages/error', {
          title: 'Ürün Bulunamadı',
          message: 'Düzenlemek istediğiniz ürün mevcut değil.'
        });
      }

      res.render('pages/products/edit', {
        title: 'Ürünü Düzenle',
        product,
        // categories, // Kaldırıldı
        constants: APP_CONSTANTS
      });
    } catch (error) {
      console.error('Ürün düzenleme formu yüklenirken hata:', error);
      res.status(500).render('pages/error', {
        title: 'Hata',
        message: 'Form yüklenirken bir hata oluştu.'
      });
    }
  },

  // Ürün güncelle
  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Görsel URL'lerini array'e çevir
      if (updateData.images) {
        updateData.images = updateData.images.split('\n').map(url => url.trim()).filter(url => url);
      }

      // Özellikleri array'e çevir
      if (updateData.features) {
        updateData.features = updateData.features.split('\n').map(feature => feature.trim()).filter(feature => feature);
      }

      // HATA 5 DÜZELTMESİ: Gereksiz validasyon bloğu kaldırıldı.
      // Bu işi 'validateProduct' middleware'i zaten yapıyor.

      const updatedCount = await Product.update(id, updateData);

      if (updatedCount === 0) {
        return res.status(404).render('pages/error', {
          title: 'Ürün Bulunamadı',
          message: 'Güncellemek istediğiniz ürün mevcut değil.'
        });
      }

      res.redirect(`/products/${id}`);
    } catch (error) {
      console.error('Ürün güncellenirken hata:', error);
      res.status(500).render('pages/error', {
        title: 'Hata',
        message: 'Ürün güncellenirken bir hata oluştu.'
      });
    }
  },

  // Ürün sil
  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;

      const deletedCount = await Product.delete(id);

      if (deletedCount === 0) {
        return res.status(404).render('pages/error', {
          title: 'Ürün Bulunamadı',
          message: 'Silmek istediğiniz ürün mevcut değil.'
        });
      }

      res.redirect('/products');
    } catch (error) {
      console.error('Ürün silinirken hata:', error);
      res.status(500).render('pages/error', {
        title: 'Hata',
        message: 'Ürün silinirken bir hata oluştu.'
      });
    }
  }
};

module.exports = productController;