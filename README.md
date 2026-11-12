# TestMe

O‘zbek tilidagi kurslar va testlar platformasining ishlaydigan dastlabki prototipi.

## Ishga tushirish

Python 3 bilan:

```sh
python3 -m http.server 8000
```

Brauzerda http://localhost:8000 ni oching. Build yoki paket o‘rnatish talab qilinmaydi.

## Imkoniyatlar

- Moslashuvchan bosh sahifa va shaxsiy statistika
- Dasturlash, ingliz tili va matematika bo‘yicha 9 ta matnli dars
- Kurslarni nomi va yo‘nalishi bo‘yicha qidirish
- Darslarni tugatish va kurs rivojlanishini kuzatish
- Har bir kurs uchun 5 daqiqalik, 3 savolli test
- Avtomatik baholash va urinishlar tarixi
- Brauzer localStorage xotirasida rivojlanish va natijalarni saqlash

## Chegaralar

Bu frontend prototip. Hisoblar, autentifikatsiya, server, ma’lumotlar bazasi, video yuklash va o‘qituvchi/admin paneli hali yo‘q. Natijalar faqat shu brauzerda saqlanadi; brauzer ma’lumotlari o‘chirilsa yo‘qoladi. Savollar va to‘g‘ri javoblar klient kodida ochiq: haqiqiy imtihonlar uchun serverda tekshirish kerak. Kurs materiallari namuna uchun. Google Fonts ulanmasa tizim shrifti ishlatiladi.

Keyingi bosqich: foydalanuvchi rollari (o‘quvchi, o‘qituvchi, administrator), server va PostgreSQL, kurslarni boshqarish, server orqali test baholash.
