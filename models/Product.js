const { getCollection } = require('../config/database');
const { ObjectId } = require('mongodb');

const Product = {
  // Tüm ürünleri getir (filtrelerle birlikte)
  // =================================================================
  // FONKSİYON: TÜM ÜRÜNLERİ GETİR (getAll)
  // =================================================================
  // BU SATIRIN ANLAMI NEDİR?
  // "async": Bu fonksiyonun veritabanı gibi zaman alan bir işlem yapacağını belirtir.
  // "filters = {}, sort = {}, pagination = {}": Bunlar "Varsayılan Parametreler"dir.
  // NEDEN KULLANIYORUZ?: Eğer Controller bu fonksiyonu çağırırken yanlışlıkla boş çağırırsa
  // (yani parantez içini boş bırakırsa), kod patlamasın diye otomatik olarak boş kutular ({}) oluştururuz.
  // KULLANMASAK NE OLUR?: "Cannot read property of undefined" hatası alırız ve uygulama çöker.
  getAll: async (filters = {}, sort = {}, pagination = {}) => {
    try {
      // -----------------------------------------------------------
      // 1. KOD PARÇASI: PAKETİ AÇMA (DESTRUCTURING)
      // -----------------------------------------------------------
      // const { category, minPrice ... } = filters;
      //
      // GÖREVİ: Controller'dan bize gelen "filters" isimli kapalı koliyi açar.
      // İçindeki malzemeleri (category, price, search vb.) tek tek tezgaha (değişkenlere) dizer.
      //
      // NEDEN YAPIYORUZ?: Kodun aşağısında sürekli "filters.category", "filters.minPrice" yazmak
      // yerine, doğrudan "category", "minPrice" yazarak kodun daha temiz ve okunabilir olmasını sağlarız.
      // Controller'dan gelen paket açılır.
      // DİKKAT: Eğer "getProducts" (Normal Listeleme) çağırdıysa "search" UNDEFINED olur.
      // DİKKAT: Eğer "searchProducts" (Arama Sayfası) çağırdıysa "search" DOLU olur.
      const {
        category,
        minPrice,
        maxPrice,
        rating,
        inStock,
        search, // Arama metni (Sadece arama yapıldığında doludur)
        brand
      } = filters;

      // -----------------------------------------------------------
      // 2. KOD PARÇASI: SORGUSU SEPETİNİ HAZIRLAMA
      // -----------------------------------------------------------
      // const query = {};
      //
      // GÖREVİ: MongoDB'ye göndereceğimiz emirleri tutacak BOŞ bir sepet oluşturur.
      // MANTIK: "Şu an sepet boş, yani tüm ürünleri getir."
      // Aşağıdaki kodlar çalıştıkça bu sepete kurallar eklenecek.
      // Örn: Sepete "Kategori: Elektronik olsun" kuralı atılacak.
      const query = {};

      // -----------------------------------------------------------
      // 3. KOD PARÇASI: KATEGORİ FİLTRESİ
      // -----------------------------------------------------------
      // GÖREVİ: Kullanıcının seçtiği kategoriyi sorgu sepetine ekler.
      // "category !== 'all'": Eğer kullanıcı "Tüm Kategoriler"i seçtiyse filtreleme yapma (hepsini getir).
      // ETKİSİ: MongoDB sadece o kategorideki ürünleri getirir.
      // Kategori filtresi
      if (category && category !== 'all') {
        query.category = category;
      }

      // -----------------------------------------------------------
      // 4. KOD PARÇASI: FİYAT ARALIĞI FİLTRESİ
      // -----------------------------------------------------------
      // GÖREVİ: Fiyat için karmaşık bir sorgu hazırlar.
      // "query.price = {}": Fiyat sorgusu tek bir sayı değil, bir "aralık" olduğu için fiyat için ayrı bir alt kutu açarız.
      // parseFloat: URL'den gelen "100" yazısını, matematiksel 100 sayısına çevirir.
      // $gte (Greater Than or Equal): "En Az" kutusuna girilen değerden BÜYÜK veya EŞİT olanları al.
      // $lte (Less Than or Equal): "En Çok" kutusuna girilen değerden KÜÇÜK veya EŞİT olanları al.
      // oluşacak olan örnek bir query nesnesi:
      // {
      //   "price": {
      //     "$gte": 100,
      //     "$lte": 500
      //   }
      // }
      // Fiyat aralığı filtresi
      if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
      }

      // -----------------------------------------------------------
      // 5. KOD PARÇASI: PUAN (RATING) FİLTRESİ
      // -----------------------------------------------------------
      // GÖREVİ: Kullanıcı "4 Yıldız ve Üzeri" dediğinde çalışır.
      // NEDEN $gte?: Çünkü kullanıcı 4 yıldız seçtiğinde, 4.5 veya 5 yıldızlı ürünleri de görmek ister.
      // Sadece 4 olanları değil, 4'ten yüksek olanları da kapsamak için "Büyük veya Eşit" ($gte) kullanılır.
      // Rating filtresi
      if (rating) {
        query.rating = { $gte: parseFloat(rating) };
      }

      // -----------------------------------------------------------
      // 6. KOD PARÇASI: STOK DURUMU FİLTRESİ
      // -----------------------------------------------------------
      // GÖREVİ: Sadece stokta olan ürünleri gösterir.
      // MANTIK: Veritabanımızda "stoktaVarMi: true" diye bir alan yok. "stock: 50" gibi adet var.
      // Bir ürünün stokta olması demek, stok adedinin 0'dan BÜYÜK ($gt) olması demektir.
      // "inStock === 'true'": URL'den gelen veri her zaman yazıdır (string), o yüzden tırnak içinde 'true' ile kıyaslarız.
      // Stok durumu filtresi
      if (inStock === 'true') {
        query.stock = { $gt: 0 };
      }

      // HATA 2 DÜZELTMESİ: Arama ve Marka filtresi (MongoDB Text Index kullanarak)
      // Yavaş olan $regex sorgusu yerine, performansı artırmak için
      // veritabanında oluşturulan text index'i kullanan $text operatörü eklendi.

      // --- [7. ADIM: METİN ARAMASI (TEXT SEARCH)] ---
      // BU KOD NE ZAMAN ÇALIŞIR?: Sadece "search" değişkeni doluysa (yani kullanıcı arama yaptıysa).
      // NE YAPAR?: MongoDB'nin "$text" özelliğini kullanarak kelime bazlı, akıllı arama yapar.
      // NEDEN KULLANILDI?: Ürün adı, açıklaması veya markası içinde kelime aramak için.
      // "getProducts" fonksiyonunda "search" olmadığı için bu blok o zaman çalışmaz (PAS GEÇİLİR).
      if (search) {
        query.$text = { $search: search };
      }

      // Marka filtresi de $text index'i kullanmalı

      // --- [8. ADIM: MARKA VE ARAMA ÇAKIŞMASI ÇÖZÜMÜ] ---
      // Görevi: Eğer marka seçildiyse, bu bloğun içine girerek veritabanı sorgusuna marka ile ilgili özel bir kural eklemeye hazırlanır.
      if (brand) {
        if (query.$text) {
          // Zaten bir 'search' sorgusu varsa, markayı da ekle
          // Markayı tırnak içinde ekleyerek tam kelime eşleşmesi (phrase search) sağlıyoruz.

          // Durum A: Hem Arama Hem Marka Seçiliyse (Örn: "Telefon" aratıp "Apple" seçti)
          // ÇÖZÜM: Markayı da arama metninin içine "zorunlu kelime" olarak ekle.
          query.$text.$search = query.$text.$search + ' "' + brand + '"';
        } else {
          // Sadece marka aranıyorsa, tırnak içinde ara

          // Durum B: Sadece Marka Seçiliyse (Arama kutusu boş)
          // ÇÖZÜM: Sadece markayı tırnak içinde arat.
          query.$text = { $search: '"' + brand + '"' };
        }
      }

      // Sıralama

      // =================================================================
      // [9. ADIM: SIRALAMA (SORTING) MANTIĞI]
      // =================================================================

      // 1. BOŞ KUTU: Sıralama kurallarını koyacağımız boş bir obje oluştur.
      const sortOptions = {};
      // 2. KONTROL: Kullanıcı özel bir sıralama istemiş mi? (sort.field var mı?)
      if (sort.field) {
        // EVET İSTEMİŞ:
        // sortOptions objesine dinamik olarak özellik ekle.
        // Örn: sort.field="price" ise -> sortOptions.price = ... olur.
        // sort.order || 1: Yön belirtildiyse onu kullan, yoksa varsayılan olarak 1 (Artan) yap.
        sortOptions[sort.field] = sort.order || 1;
      } else {
        // HAYIR İSTEMEMİŞ (Varsayılan Durum):
        // Kullanıcı bir şey seçmediyse, ürünleri eklenme tarihine (createdAt) göre
        // yeniden eskiye (-1) doğru sırala. En yeni ürün en üstte görünsün.
        sortOptions.createdAt = -1; // Varsayılan: en yeni
      }

      // Sayfalama

      // =================================================================
      // [10. ADIM: SAYFALAMA (PAGINATION) MANTIĞI]
      // =================================================================

      // 1. SAYFA NUMARASI (page):
      // Controller'dan gelen sayfa bilgisini al. Eğer yoksa veya geçersizse 1. sayfayı varsay.
      // parseInt: Metin olarak gelen "2"yi sayı olan 2'ye çevirir.
      // const page = parseInt(pagination.page) || 1;

      // 2. LİMİT (limit):
      // Her sayfada kaç ürün gösterileceğini belirle. Eğer yoksa varsayılan olarak 12 ürün göster.
      // const limit = parseInt(pagination.limit) || 12;

      // 3. ATLAMA (skip):
      // Veritabanından veri çekerken kaç tanesini "pas geçeceğimizi" hesaplar.
      // Formül: (Sayfa No - 1) * Limit
      // Örn: 2. sayfa için (2-1)*12 = 12 ürünü atla, 13. üründen başla.
      // const skip = (page - 1) * limit;


      
      // Gelen pagination objesinin temiz olduğunu biliyoruz
      const { page, limit } = pagination; // Direkt kullan

      const skip = (page - 1) * limit;


      // =================================================================
      // [11. ADIM: VERİTABANI SORGUSUNU ÇALIŞTIRMA (ZİNCİRLEME)]
      // =================================================================

      // 1. KOLEKSİYON SEÇİMİ: "products" tablosuna bağlan.
      const collection = getCollection('products');
      const products = await collection
        .find(query)   // 2. FİLTRELEME: Hazırladığımız "query" sepetine uyanları bul.
        .sort(sortOptions)  // 3. SIRALAMA: Hazırladığımız sıraya göre diz.
        .skip(skip)   // 4. ATLAMA: İlk X kadar ürünü pas geç (Örn: 2. sayfadaysak ilk 12'yi atla).
        .limit(limit)   // 5. LİMİT: Sadece Y kadar ürün al (Örn: 12 tane).
        .toArray();    // 6. SONUÇ: Bulunanları bir diziye (Array) çevir ve getir.

      // Toplam ürün sayısı

      // =================================================================
      // [12. ADIM: TOPLAM SAYIYI BULMA VE PAKETLEME (RETURN)]
      // =================================================================

      // GÖREVİ: Filtrelerimize uyan veritabanındaki TOPLAM ürün sayısını bulur.
      // NEDEN?: Yukarıdaki "products" sadece o sayfadaki 12 ürünü içerir. 
      // Sayfa numaralarını (1-2-3-4-5) oluşturmak için gerçek toplama (örn: 100) ihtiyacımız var.
      const total = await collection.countDocuments(query);

      // GÖREVİ: Controller'a sonucu teslim etme.
      return {
        products,  // Bulunan ürünlerin listesi

        // Sayfalama Bilgileri (Arayüzde sayfa numaralarını çizmek için gerekli)
        pagination: {
          page,   // Şu anki sayfa (Örn: 2)
          limit,  // Sayfada kaç ürün var (Örn: 12)
          total,  // Toplam kaç ürün bulundu (Örn: 50)

          // TOPLAM SAYFA HESABI:
          // Toplam 50 ürün varsa ve sayfada 12 ürün gösteriyorsak: 50 / 12 = 4.16
          // Math.ceil (Tavan): Sayıyı yukarı yuvarlar. Sonuç 5 sayfa olur.
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      // GÖREVİ: Güvenlik Ağı. Eğer veritabanı bağlantısı koparsa veya sorgu patlarsa
      // sunucuyu kapatmak yerine hatayı yakalar ve Controller'a bildirir.
      throw new Error(`Ürünler getirilirken hata: ${error.message}`);
    }
  },

  // ID'ye göre ürün getir
  getById: async (id) => {
    try {
      if (!ObjectId.isValid(id)) {
        return null;
      }
      const collection = getCollection('products');
      return await collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      throw new Error(`Ürün getirilirken hata: ${error.message}`);
    }
  },

  // Yeni ürün oluştur
  create: async (productData) => {
    try {
      const collection = getCollection('products');

      const newProduct = {
        ...productData,
        price: parseFloat(productData.price),
        rating: parseFloat(productData.rating) || 0,
        stock: parseInt(productData.stock) || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await collection.insertOne(newProduct);
      return result.insertedId;
    } catch (error) {
      throw new Error(`Ürün oluşturulurken hata: ${error.message}`);
    }
  },

  // Ürün güncelle
  update: async (id, updateData) => {
    try {
      if (!ObjectId.isValid(id)) {
        return 0;
      }
      const collection = getCollection('products');

      const updates = {
        ...updateData,
        price: parseFloat(updateData.price),
        rating: parseFloat(updateData.rating),
        stock: parseInt(updateData.stock),
        updatedAt: new Date()
      };

      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );

      return result.modifiedCount;
    } catch (error) {
      throw new Error(`Ürün güncellenirken hata: ${error.message}`);
    }
  },

  // Ürün sil
  delete: async (id) => {
    try {
      if (!ObjectId.isValid(id)) {
        return 0;
      }
      const collection = getCollection('products');
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount;
    } catch (error) {
      throw new Error(`Ürün silinirken hata: ${error.message}`);
    }
  },

  // Benzer ürünleri getir
  getSimilar: async (productId, category, limit = 4) => {
    try {
      if (!ObjectId.isValid(productId)) {
        return [];
      }
      const collection = getCollection('products');
      return await collection
        .find({
          category: category,
          _id: { $ne: new ObjectId(productId) }
        })
        .limit(limit)
        .toArray();
    } catch (error) {
      throw new Error(`Benzer ürünler getirilirken hata: ${error.message}`);
    }
  },

  // Kategoriye göre ürün sayısı
  getCountByCategory: async () => {
    try {
      const collection = getCollection('products');
      return await collection.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]).toArray();
    } catch (error) {
      throw new Error(`Kategori sayıları getirilirken hata: ${error.message}`);
    }
  },

  // MARKALARI GETİR
  getBrands: async () => {
    try {
      const collection = getCollection('products');
      const brands = await collection.distinct('brand');
      return brands.filter(brand => brand && brand.trim() !== '');
    } catch (error) {
      throw new Error(`Markalar getirilirken hata: ${error.message}`);
    }
  }
};

module.exports = Product;
