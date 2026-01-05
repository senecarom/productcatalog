const Product = require('../models/Product');
// HATA 4 DÜZELTMESİ: Kategori artık global middleware'den geldiği için burada gerek yok.
// const Category = require('../models/Category');
const { APP_CONSTANTS, SORT_OPTIONS } = require('../config/constants');

const productController = {
  // Ürün listesi sayfası

  // getProducts (Listeleme Sayfası):
  // Görevi: Sol menüdeki filtreleri (Kategori, Fiyat, Marka) kullanarak ürünleri listelemektir.
  getProducts: async (req, res) => {
    try {
      // --- [1. ADIM: İSTEK PARAMETRELERİNİ ALMA (DESTRUCTURING)] ---
      // GÖREVİ: Kullanıcının URL üzerinden gönderdiği (Query String) filtreleme, sıralama ve sayfa bilgilerini yakalar.
      // ETKİSİ: "req.query" içindeki dağınık verileri, temiz ve kullanılabilir değişkenlere dönüştürür.
      // NEDEN KULLANILDI: Kodun okunabilirliğini artırmak ve "page" gibi değişkenlere varsayılan değer (1) atamak için.
      // KULLANILMASAYDI: Her değişken için "const category = req.query.category" gibi uzun ve tekrar eden kodlar yazmak gerekirdi.
      const {
        category,
        minPrice,
        maxPrice,
        rating,
        inStock,
        brand,
        sort,
        page = 1  // Sayfa sayısı belirtilmezse varsayılan olarak 1. sayfayı açar.
      } = req.query;

      // --- [2. ADIM: FİLTRE OBJESİNİ OLUŞTURMA] ---
      // GÖREVİ: Dağınık haldeki filtre değişkenlerini (category, price vb.) tek bir "filters" kutusunda (Object) toplar.
      // ETKİSİ: Veritabanı sorgusunu yapacak olan Model katmanına verileri düzenli bir paket halinde göndermeyi sağlar.
      // ÖNEMLİ DETAY: Burada "search" değişkeni YOKTUR. Çünkü bu sayfa arama sayfası değil, filtreleme sayfasıdır.
      // Filtre objesini oluştur
      const filters = {
        category,
        minPrice,
        maxPrice,
        rating,
        inStock,
        brand
      };

      // --- [3. ADIM: SIRALAMA AYARINI BELİRLEME] ---
      // GÖREVİ: Kullanıcının "price_low" gibi insan dilindeki isteğini, veritabanının anlayacağı "{ field: 'price', order: 1 }" formatına çevirir.
      // ETKİSİ: Ürünlerin hangi sırayla (ucuzdan pahalıya, yeniden eskiye) listeleneceğini belirler.
      // NEDEN KULLANILDI: Kullanıcı hatalı bir sıralama parametresi (örn: ?sort=kafamagore) gönderirse sistemin çökmemesi için güvenlik kontrolü yapar.
      // Sıralama seçeneği
      // 1. Varsayılan (Default) değeri ata
      let sortOption = SORT_OPTIONS.NEWEST;
      // 2. Kontrol et ve varsa değiştir
      if (sort && SORT_OPTIONS[sort.toUpperCase()]) {
        sortOption = SORT_OPTIONS[sort.toUpperCase()];
      }

      // --- [4. ADIM: SAYFALAMA AYARLARINI HAZIRLAMA] ---
      // GÖREVİ: Hangi sayfada olduğumuzu ve bir sayfada kaç ürün gösterileceğini hesaplar.
      // ETKİSİ: Veritabanına "İlk X ürünü atla (skip), sonraki Y ürünü getir (limit)" gibi emirler vermek için kullanılır.
      // NEDEN KULLANILDI: Tüm ürünleri tek seferde çekmek yerine parça parça çekerek sayfa yüklenme hızını artırmak için.
      // Sayfalama
      const pagination = {
        // String'i sayıya çevir, eğer saçma bir şeyse (NaN) 1 kabul et.
        page: parseInt(page) > 0 ? parseInt(page) : 1,
        limit: APP_CONSTANTS.ITEMS_PER_PAGE
      };

      // --- [5. ADIM: VERİTABANINDAN VERİ ÇEKME (MODEL ÇAĞRISI)] ---
      // GÖREVİ: Hazırlanan filtre, sıralama ve sayfa paketlerini Model'e (Product.js) teslim eder.
      // ETKİSİ: Veritabanı (MongoDB) ile asıl iletişim burada kurulur. Sorgu çalıştırılır ve gerçek veriler gelir.
      // "await": Veritabanı işlemi asenkron olduğu için, cevap gelene kadar kodun burada beklemesini sağlar.
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
  // searchProducts (Arama Sayfası):
  // Görevi: Kullanıcı üstteki arama çubuğuna bir şey yazıp "Ara" dediğinde çalışır.
  searchProducts: async (req, res) => {
    try {
      const { q: searchQuery, page = 1, sort } = req.query; // Sort parametresi eklendi

      if (!searchQuery) {
        return res.redirect('/products');
      }

      // ÖNEMLİ FARK: Burada "filters" paketinin içine "search" değişkenini koyuyoruz!
      // Bu sayede Model'deki "if (search)" bloğu devreye girecek.
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