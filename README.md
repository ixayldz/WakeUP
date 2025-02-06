# Wake UP - Ses Paylaşım Platformu Backend API

## 🚀 Genel Bakış

Wake UP, kullanıcıların maksimum 20 saniyelik ses kayıtları ve isteğe bağlı fotoğraf paylaşımı yapabildiği, etkileşimlerin de ses üzerinden gerçekleştirildiği yenilikçi bir sosyal medya platformudur.

## 🛠 Teknolojiler

- **Node.js & Express.js**: Backend framework
- **MongoDB**: Veritabanı
- **Redis**: Cache ve rate limiting
- **Socket.IO**: Gerçek zamanlı iletişim
- **AWS S3**: Dosya depolama
- **FFmpeg**: Ses işleme
- **JWT**: Kimlik doğrulama

## 🔧 Kurulum

```bash
# Repoyu klonla
git clone https://github.com/ixayldz/Wake-UP.git

# Bağımlılıkları yükle
npm install

# Geliştirme ortamında çalıştır
npm run dev

# Prodüksiyon ortamında çalıştır
npm start
```

## 🔑 Ortam Değişkenleri

`.env` dosyasında aşağıdaki değişkenleri tanımlayın:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_aws_region
AWS_BUCKET_NAME=your_bucket_name
REDIS_URL=your_redis_url
```

## 📚 API Dokümantasyonu

### 🔐 Kimlik Doğrulama

#### Kayıt Ol
```http
POST /api/auth/register
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `username` | `string` | **Gerekli**. Kullanıcı adı |
| `email` | `string` | **Gerekli**. E-posta adresi |
| `password` | `string` | **Gerekli**. Şifre |

#### Giriş Yap
```http
POST /api/auth/login
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `email` | `string` | **Gerekli**. E-posta adresi |
| `password` | `string` | **Gerekli**. Şifre |

### 📝 İçerik Paylaşımı

#### Ses Paylaşımı
```http
POST /api/posts
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `audio` | `file` | **Gerekli**. Ses dosyası (max 20s) |
| `photo` | `file` | Fotoğraf (opsiyonel) |
| `categories` | `array` | Kategori ID'leri |
| `hashtags` | `array` | Hashtag'ler |

### 💬 Mesajlaşma

#### Sesli Mesaj Gönderme
```http
POST /api/messages/:userId
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `audio` | `file` | **Gerekli**. Ses mesajı (max 20s) |

### 🎵 Ses Stüdyosu

#### Ses İyileştirme
```http
POST /api/audio-processor/enhance
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `audio` | `file` | **Gerekli**. Ses dosyası |

#### Efekt Uygulama
```http
POST /api/audio-effects/preview
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `audio` | `file` | **Gerekli**. Ses dosyası |
| `effects` | `array` | Uygulanacak efektler |

### 🔍 Arama ve Keşfet

#### İçerik Arama
```http
GET /api/search
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `query` | `string` | Arama terimi |
| `type` | `string` | Arama tipi (audio/user/hashtag) |
| `category` | `string` | Kategori filtresi |

### 👥 İşbirliği

#### İşbirliği Oluşturma
```http
POST /api/collaborations
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `type` | `string` | İşbirliği tipi (duet/remix) |
| `partnerId` | `string` | Partner kullanıcı ID |
| `terms` | `object` | İşbirliği şartları |

### 📊 Analitik

#### Kullanıcı Analizi
```http
GET /api/analytics/users
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `timeframe` | `string` | Zaman aralığı |
| `metrics` | `array` | İstenen metrikler |

## 🔔 WebSocket Olayları

### Bildirimler
```javascript
// Bağlantı
socket.on('connect', callback)

// Bildirim alma
socket.on('notification', callback)

// Mesaj alma
socket.on('message', callback)

// Ses senkronizasyonu
socket.on('audioSync', callback)
```

## 🛡️ Güvenlik

- JWT tabanlı kimlik doğrulama
- Rate limiting
- IP güvenlik kontrolleri
- İçerik moderasyonu
- Dosya güvenliği kontrolleri

## 📈 Performans

- Redis cache
- MongoDB indeksleme
- AWS CDN
- Dosya optimizasyonu
- Query optimizasyonu

## 🧪 Test

```bash
# Tüm testleri çalıştır
npm test

# Belirli bir test dosyasını çalıştır
npm test -- tests/auth.test.js

# Test coverage raporu
npm run test:coverage
```

## �� Lisans

Bu proje [GPL-3.0](https://github.com/ixayldz/Wake-UP/blob/main/LICENSE) lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 İletişim

- GitHub - [ixayldz/Wake-UP](https://github.com/ixayldz/Wake-UP)
- Website - [wakeup.com](https://wakeup.com)
- Email - info@wakeup.com
- Twitter - [@wakeupapp](https://twitter.com/wakeupapp)

## 📚 API Dokümantasyonu (Devamı)

### 🔔 Bildirimler

#### Bildirimleri Getir
```http
GET /api/notifications
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `page` | `number` | Sayfa numarası |
| `limit` | `number` | Sayfa başına bildirim |
| `unreadOnly` | `boolean` | Sadece okunmamışlar |

#### Bildirimleri Okundu İşaretle
```http
POST /api/notifications/mark-read
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `notificationIds` | `array` | Bildirim ID'leri |

### 🎨 Ses Efektleri

#### Preset Listesi
```http
GET /api/audio-effects/presets
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `category` | `string` | Efekt kategorisi |
| `isPublic` | `boolean` | Herkese açık presetler |

#### Preset Oluştur
```http
POST /api/audio-effects/presets
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `name` | `string` | Preset adı |
| `effects` | `array` | Efekt listesi |
| `isPublic` | `boolean` | Herkese açık mı |

### 📊 İstatistikler

#### Kullanıcı İstatistikleri
```http
GET /api/analytics/user-stats
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `userId` | `string` | Kullanıcı ID |
| `period` | `string` | Zaman aralığı |

#### İçerik Performansı
```http
GET /api/analytics/content-performance
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `postId` | `string` | İçerik ID |
| `metrics` | `array` | İstenen metrikler |

### 🛡️ Moderasyon

#### İçerik Raporlama
```http
POST /api/moderator/report
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `contentId` | `string` | İçerik ID |
| `reason` | `string` | Raporlama nedeni |
| `description` | `string` | Detaylı açıklama |

#### Raporlanmış İçerikler
```http
GET /api/moderator/reported-content
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `page` | `number` | Sayfa numarası |
| `status` | `string` | Moderasyon durumu |

### 🎯 Öneriler

#### Kişiselleştirilmiş Öneriler
```http
GET /api/recommendations/feed
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `limit` | `number` | Öneri sayısı |
| `categories` | `array` | Kategori filtreleri |

#### Benzer İçerikler
```http
GET /api/recommendations/similar/:postId
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `limit` | `number` | Öneri sayısı |

### 📱 Kullanıcı İlerleme

#### İlerleme Durumu
```http
GET /api/progress
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `feature` | `string` | Özellik adı |

#### Özellik Kullanımı Kaydet
```http
POST /api/progress/track/:feature
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `data` | `object` | Kullanım detayları |

### 🎵 Ses Senkronizasyonu

#### Senkronizasyon Başlat
```http
POST /api/audio-sync/start
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `collaborationId` | `string` | İşbirliği ID |
| `participants` | `array` | Katılımcı ID'leri |

#### Ses Durumu Güncelle
```http
POST /api/audio-sync/update
```
| Parametre | Tip     | Açıklama   |
| :-------- | :------ | :--------- |
| `sessionId` | `string` | Oturum ID |
| `state` | `object` | Ses durumu |

## 🚨 Hata Kodları

### Genel Hata Kodları

| Kod | Açıklama |
| :--- | :--- |
| `400` | Geçersiz istek |
| `401` | Kimlik doğrulama gerekli |
| `403` | Yetkisiz erişim |
| `404` | Kaynak bulunamadı |
| `429` | Çok fazla istek |
| `500` | Sunucu hatası |

### Özel Hata Kodları

| Kod | Açıklama |
| :--- | :--- |
| `1001` | Ses dosyası çok uzun (>20s) |
| `1002` | Desteklenmeyen ses formatı |
| `1003` | Geçersiz efekt parametreleri |
| `1004` | İşbirliği daveti zaman aşımı |
| `1005` | Yetersiz depolama alanı |

## 🔒 Güvenlik Kontrolleri

### Rate Limiting

```javascript
// Global limit
100 istek / 15 dakika

// Auth limit
5 başarısız deneme / saat

// Upload limit
50 yükleme / saat

// API limit
1000 istek / 15 dakika
```

### Dosya Güvenliği

- Maksimum ses dosyası boyutu: 5MB
- Maksimum fotoğraf boyutu: 5MB
- İzin verilen ses formatları: WAV, MP3, AAC
- İzin verilen fotoğraf formatları: JPG, PNG, WEBP

### İçerik Güvenliği

- Otomatik içerik moderasyonu
- Yasaklı kelime filtreleme
- Spam kontrolü
- IP güvenlik kontrolleri
- Dosya virüs taraması

## 📊 API Limitleri

### Genel Limitler

| Özellik | Limit |
| :--- | :--- |
| Maksimum ses süresi | 20 saniye |
| Maksimum dosya boyutu | 5MB |
| Günlük upload limiti | 100 |
| Eş zamanlı işbirliği | 5 |
| Aktif stüdyo oturumu | 1 |

### Plan Bazlı Limitler

#### Ücretsiz Plan
- 50 ses/gün
- 10 işbirliği/ay
- Temel ses efektleri
- 1GB depolama

#### Premium Plan
- Sınırsız ses
- Sınırsız işbirliği
- Tüm ses efektleri
- 50GB depolama

## 🔄 WebSocket Durum Kodları

| Kod | Durum | Açıklama |
| :--- | :--- | :--- |
| `0` | `CONNECTING` | Bağlantı kuruluyor |
| `1` | `CONNECTED` | Bağlantı kuruldu |
| `2` | `RECONNECTING` | Yeniden bağlanıyor |
| `3` | `DISCONNECTED` | Bağlantı kesildi |

## 📦 Response Format

### Başarılı Response

```json
{
  "status": "success",
  "data": {
    // Response data
  }
}
```

### Hata Response

```json
{
  "status": "error",
  "error": {
    "code": 1001,
    "message": "Hata mesajı"
  }
}
``` 