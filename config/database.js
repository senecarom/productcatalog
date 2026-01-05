const { MongoClient } = require('mongodb');

// Bu değişkenler uygulamanın "Hafızasıdır". Bağlantı durumunu burada tutarız.
let db = null;
let client = null;

// =================================================================
// BÖLÜM 1: ALTYAPI YÖNETİMİ (Lifecycle Management)
// GÖREVİ: Veritabanı bağlantısını açmak, kapatmak ve erişmek.
// NEDEN dbHelpers İÇİNDE DEĞİL?: Çünkü bunlar "Veri" ile değil, "Bağlantı" ile ilgilenir.
// =================================================================
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/product-catalog';
    const dbName = process.env.DB_NAME || 'product-catalog';
    
    client = new MongoClient(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    // Şalteri Kaldır (Bağlan)
    await client.connect();
    db = client.db(dbName);
    
    console.log(`✅ MongoDB'ye bağlanıldı: ${dbName}`);
    return db;
  } catch (error) {
    console.error('❌ MongoDB bağlantı hatası:', error);
    throw error;
  }
};

// Bu fonksiyon "Priz" gibidir.
// Diğer dosyalar (Model, Helper) veritabanına ulaşmak istediğinde bunu çağırır.
const getDB = () => {
  if (!db) {
    throw new Error('Database bağlantısı kurulmamış. Önce connectDB() fonksiyonunu çağırın.');
  }
  return db;
};

// Şalteri İndir (Bağlantıyı Kes)
const closeDB = async () => {
    // client.close(): MongoDB sürücüsünün (driver) yerleşik metodudur.
    // GÖREVİ: Aktif olan veritabanı bağlantısını ve bağlantı havuzunu (pool) tamamen kapatır.
    // ETKİSİ: Sunucu kaynaklarını (RAM, CPU, Network soketleri) serbest bırakır.
    // KULLANIM AMACI: Uygulama kapatılırken (server shutdown) bağlantıların açık kalıp sunucuyu yormasını engellemek.
  if (client) {
    await client.close();
    console.log('📪 MongoDB bağlantısı kapatıldı');
  }
};


// Temel veritabanı işlemleri için helper fonksiyonlar

// =================================================================
// BÖLÜM 2: YARDIMCI ARAÇLAR (dbHelpers / Utilities)
// GÖREVİ: "getDB()" prizini kullanarak veri ekleme/silme/okuma işlerini kolaylaştırmak.
// NEDEN AYRI?: Kod tekrarını önlemek için. Her modelde (Product, Category) aynı "findOne" kodunu yazmak yerine
// burada bir kere yazarız, her yerden çağırırız. (DRY Prensibi)
// =================================================================
const dbHelpers = {
  // Koleksiyon getirme
  // GÖREVİ: Sadece koleksiyonu seçip getirir.
  // KULLANIM: const productsCol = dbHelpers.getCollection('products');
  getCollection: (collectionName) => {
    return getDB().collection(collectionName);
  },
  
  // ID'ye göre bulma
  // GÖREVİ: ID'ye göre tek bir kayıt bulur.
  // NEDEN KULLANIRIZ?: Her seferinde "getDB().collection(...).findOne(...)" yazmamak için.
  findById: async (collectionName, id) => {
    const collection = getDB().collection(collectionName);
    return await collection.findOne({ _id: id });
  },
  
  // Tümünü getirme
  // GÖREVİ: Bir tablodaki tüm verileri (veya filtrelenmişleri) getirir.
  findAll: async (collectionName, query = {}, options = {}) => {
    const collection = getDB().collection(collectionName);
    return await collection.find(query, options).toArray();
  },
  
  // Ekleme
  // GÖREVİ: Yeni bir kayıt ekler.
  insertOne: async (collectionName, document) => {
    const collection = getDB().collection(collectionName);
    const result = await collection.insertOne(document);
    return result.insertedId;
  },
  
  // Güncelleme
  // GÖREVİ: Bir kaydı günceller.
  updateOne: async (collectionName, id, updates) => {
    const collection = getDB().collection(collectionName);
    const result = await collection.updateOne(
      { _id: id }, 
      { $set: updates }
    );
    return result.modifiedCount;
  },
  
  // Silme
  // GÖREVİ: Bir kaydı siler.
  deleteOne: async (collectionName, id) => {
    const collection = getDB().collection(collectionName);
    const result = await collection.deleteOne({ _id: id });
    return result.deletedCount;
  }
};

// Dışarıya hem Yönetici fonksiyonları hem de Yardımcıları açıyoruz.
module.exports = {
  connectDB,
  getDB,
  closeDB,
  ...dbHelpers   // dbHelpers içindeki fonksiyonları da tek tek dışarı aktarır (Spread Operator).
};