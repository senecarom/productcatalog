const Product = require('../models/Product');
// const Category = require('../models/Category'); // Global middleware kullanıldığı için gerek yok
const { APP_CONSTANTS } = require('../config/constants');

const homeController = {
  // Ana sayfa
  getHomePage: async (req, res) => {
    try {
      const popularProducts = await Product.getAll(
        {}, 
        { field: 'rating', order: -1 }, 
        { limit: 8 }
      );

      res.render('pages/home', {
        title: 'Ana Sayfa',
        popularProducts: popularProducts.products,
        constants: APP_CONSTANTS
      });
    } catch (error) {
      console.error('Ana sayfa yüklenirken hata:', error);
      res.status(500).render('pages/error', {
        title: 'Hata',
        message: 'Ana sayfa yüklenirken bir hata oluştu.'
      });
    }
  },

  // Hakkında sayfası
  getAboutPage: (req, res) => {
    res.render('pages/about', {
      title: 'Hakkımızda',
      constants: APP_CONSTANTS
    });
  },

  // İletişim sayfası (Sayfayı Gösterme)
  getContactPage: (req, res) => {
    res.render('pages/contact', {
      title: 'İletişim',
      constants: APP_CONSTANTS
    });
  },

  // İletişim Formu İşleme (Form Gönderildiğinde Çalışır) - YENİ EKLENEN KISIM
  sendContactMessage: (req, res) => {
    try {
      const { name, email, subject, message } = req.body;

      // Basit sunucu tarafı validasyonu
      if (!name || !email || !subject || !message) {
        return res.render('pages/contact', {
          title: 'İletişim',
          constants: APP_CONSTANTS,
          error: 'Lütfen tüm alanları doldurunuz.',
          formData: req.body // Hata olursa veriler kaybolmasın diye geri gönderilebilir
        });
      }

      // Normalde burada veritabanına kayıt yapılır veya e-posta servisi kullanılır.
      // Şimdilik veriyi konsola yazdırarak simüle ediyoruz.
      console.log('📩 YENİ İLETİŞİM MESAJI:', {
        gonderen: name,
        email: email,
        konu: subject,
        mesaj: message,
        tarih: new Date()
      });

      // Başarılı işlem sonrası sayfayı tekrar yükle ve başarı mesajı göster
      // 'success' değişkeni main.ejs layout dosyasında otomatik olarak yeşil alert kutusu çıkarır.
      res.render('pages/contact', {
        title: 'İletişim',
        constants: APP_CONSTANTS,
        success: 'Mesajınız başarıyla alındı! En kısa sürede size dönüş yapacağız.'
      });

    } catch (error) {
      console.error('İletişim formu hatası:', error);
      res.status(500).render('pages/error', {
        title: 'Hata',
        message: 'Mesaj gönderilirken bir hata oluştu.'
      });
    }
  }
};

module.exports = homeController;