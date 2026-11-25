# Zinciri Kırma

Günlük planlamayı senin yerine yapan, oyunlaştırılmış kişisel koç. Her gün bir halka;
görevleri bitirdikçe halka dolar, tamamlanan günler geriye uzanan bir zincir oluşturur.

**Teknoloji:** Expo SDK 58 (React Native + Expo Router), react-native-svg + Reanimated,
Zustand (yerel kalıcı veri), Supabase (isteğe bağlı bulut senkronu). Web'de PWA olarak çalışır.

## Özellikler

- **Ana ekran:** yazısız büyük halka + perspektifli geçmiş zinciri, dokununca ön/arka yüz çevirme,
  geçmiş halkaya dokununca o günün özeti
- **Rutin · Projeler · Alınacaklar · Aranacaklar** listeleri
- **Yapacağım saat** ile öngörülebilir sıralama (saatli görevler saat sırasıyla, diğerleri önceliğe göre)
- Sabit (tekrarlı) görevler: her gün / 3 günde / haftada / 2 haftada
- Zor gün modu (yalnızca ⭐ kritik görevlerle halkayı kurtarma)
- Turkuaz–turuncu gündüz/akşam teması, Zaman Test Paneli (Hafıza sekmesinden açılır)

## Geliştirme

```bash
npm install
npx expo start          # telefonda Expo Go ile QR kodu okut
npx expo start --web    # tarayıcıda
npx tsc --noEmit        # tip kontrolü
npx eslint src          # lint
```

## Bulut senkronu (isteğe bağlı)

1. supabase.com'da proje aç, `supabase/migrations/20261125000000_init.sql` dosyasını SQL Editor'de çalıştır.
2. Authentication → URL Configuration → **Site URL**'yi yayın adresine (örn. `https://zinciri-kirma.vercel.app`) ayarla;
   hesap onay e-postasındaki bağlantı oraya döner.
3. `.env.example` dosyasını `.env` olarak kopyala, Supabase adresini ve publishable anahtarını yaz.

Giriş e-posta + şifre ile yapılır (Hafıza sekmesi). Bağlantılı giriş bilerek kullanılmıyor: iPhone'da bağlantı
Safari'de açılır ve Safari ile ana ekran uygulamasının verisi ayrıdır.

`.env` git'e gönderilmez. Vercel'de aynı iki değişkeni **Project Settings → Environment Variables** altına ekle.

## Vercel'de PWA olarak yayınlama

Ayarlar `vercel.json` içinde (derleme: `npx expo export --platform web`, çıktı: `dist`, SPA yönlendirmesi).

- **CLI:** `npx vercel --prod`
- **GitHub:** depoyu GitHub'a gönder → Vercel → *Add New Project* → depoyu seç → *Deploy*

iPhone'da yayın adresini **Safari** ile aç → **Paylaş → Ana Ekrana Ekle**. Uygulama tam ekran açılır.
Not: Safari sekmesi ile ana ekran uygulamasının verileri ayrıdır; uygulamayı ana ekrandan kullan.

## Klasör yapısı

```
src/app/          ekranlar (Expo Router)
src/components/   halka, zincir sahnesi, listeler, paneller
src/lib/          zaman, sıralama, zincir hesapları, senkron
src/store/        kalıcı uygulama verisi (Zustand)
supabase/         veritabanı şeması
public/           PWA şablonu, manifest, ikonlar
```
