const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// Ana sayfa route'ları
router.get('/', homeController.getHomePage);
router.get('/about', homeController.getAboutPage);
router.get('/contact', homeController.getContactPage);

// İletişim formu POST route'u - YENİ EKLENEN KISIM
// Bu satır, form "Mesajı Gönder" butonuna basıldığında çalışacak fonksiyonu belirler.
router.post('/contact', homeController.sendContactMessage);

module.exports = router;