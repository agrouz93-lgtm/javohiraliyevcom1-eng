# USTA PRO

O‘zbek tilidagi qurilish ish maydoni. Next.js interfeysi FastAPI xizmatiga bir xil domen orqali murojaat qiladi. PostgreSQL har bir hisobning loyihalarini alohida saqlaydi.

## Lokal ishga tushirish

Node.js 22 yoki 24 LTS, npm, Python 3.12, uv va Docker Compose kerak. Docker o‘rniga o‘rnatilgan PostgreSQL ishlatilsa, `usta` bazasini yarating va `backend/schema.sql` faylini shu bazaga qo‘llang.

PowerShell orqali, loyiha papkasida:

```powershell
Copy-Item .env.example .env
```

`.env` dagi `POSTGRES_PASSWORD` va `DATABASE_URL` parolini bir xil kuchli qiymatga almashtiring. URL ichida maxsus belgilarni foizli kodlash kerak. Keyin:

```powershell
docker compose up -d db
uv venv --python 3.12
uv pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --env-file .env --host 127.0.0.1 --port 8000
```

Ikkinchi oynada:

```powershell
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) manzilini oching. Kamera uchun brauzer ruxsatini bering. Telefon orqali boshqa qurilmadan kirishda HTTPS zarur. Shunda `APP_ORIGINS` va `APP_URL` ni HTTPS manzilga moslang va `COOKIE_SECURE=1` qo‘ying. FastAPI portini Internetga ochish shart emas.

Mavjud PostgreSQL hajmida Docker init fayli avtomatik qayta ishlamaydi. Sxemani yangilash uchun:

```powershell
Get-Content -Raw backend/schema.sql | docker compose exec -T db psql -U usta -d usta -v ON_ERROR_STOP=1
```

## Funksiyalar va konfiguratsiya

- O‘lchovda bir tekislikdagi kontur burchaklarini tartib bilan belgilang. Masshtab rejimida rasmda ma’lum masofadagi ikkita nuqtani belgilang va metrda qiymat kiriting. Perspektiva kuchli bo‘lsa, natija sezilarli og‘ishi mumkin. Kontur taklifi OpenCV asosida ishlaydi. LiDAR integratsiyasi mavjud emas.
- Avtomatik sanoq uchun ishonchli manbadan olingan, qurilish materiallariga o‘rgatilgan Ultralytics YOLO `.pt` model faylini `MATERIAL_MODEL` ga yozing. Sinf nomlari `slate`, `board`, `beam`, `brick` yoki `shifer`, `taxta`, `brus`, `gisht` bo‘lishi kerak. So‘ng `uv pip install ultralytics` buyrug‘ini bajaring va backendni qayta ishga tushiring. Model fayli loyihaga kiritilmagan. Qo‘lda ramka yoki to‘plam qo‘shish uchun model kerak emas.
- Reja taklifi matndan o‘lcham, xona soni va ayrim xona turlarini ajratadigan qoidalarga asoslanadi. Rejani JSON orqali almashish mumkin. Bo‘sh rejadagi qoralama shu brauzerda avtomatik saqlanadi. Hisobga kirgach loyihani PostgreSQL’ga saqlash yoki nusxalash mumkin. 3D rejim uchun WebGL kerak. Eshik va derazalar shu qavatdagi kesishadigan devorlarda haqiqiy geometriya ochilmasini hosil qiladi. Reja muhandis tasdig‘ini talab qiladi.
- Parolni tiklash uchun `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASSWORD` va `APP_URL` ni sozlang. SMTP xizmati STARTTLS’ni qo‘llashi kerak. Kirish email va parol bilan ishlaydi.
- Saqlangan o‘lchov, sanoq, reja va smetani **Hisobotlar** orqali PDF fayl qilib oling. Rasm loyihaga yuklab saqlanmaydi. Belgilar, kalibrlash qiymati va natijalar saqlanadi.
- Kalkulyatorda bir birlik narxi va ish haqini o‘zingiz kiriting. Tom formulasi simmetrik ikki nishabli tomga mo‘ljallangan. Devor sarflarida teshiklar avtomatik ayirilmaydi.

## Tekshirish

```powershell
npm test
npm run build
```

`node --test tests/*.test.mjs` npm kutubxonalarisiz ham hisoblash testlarini bajaradi.

### Mahalliy AI yordamchisi

Ixtiyoriy Ollama servisini backend bilan bir kompyuterda ishga tushiring. Masalan, `ollama pull qwen2.5:7b` buyrug‘ini bajaring va `.env` faylida `OLLAMA_MODEL=qwen2.5:7b` yozing. Qayta ishga tushirgach, hisobga kiring va uy dizaynida **Mahalliy AI modelidan foydalanish** tanlovini belgilang. Model javobi 2D yoki 3D rejasiga qo‘llanishidan avval o‘lchamlari va elementlari tekshiriladi.

Backend kutubxonalari o‘rnatilgach, OpenCV, model topilmagandagi javob va parol xeshlash testlarini ham bajaring:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -p test_backend.py
```

## Android APK

Tayyor fayl: `android/USTA-PRO.apk`. Android 8.0 (API 26) va yangiroq qurilmaga o‘rnating. Ilova avval o‘z ichidagi mobil sahifani ochadi. Kalkulyator, qo‘lda o‘lchash va sanash, 2D/3D reja hamda JSON/PNG eksporti uchun server talab qilinmaydi. Kamera ishlatilganda Android ruxsatini so‘raydi.

Hisob, PostgreSQL loyihalari, avtomatik tahlil va PDF hisobot uchun ilovaning **Server sozlamalari** bo‘limiga Next.js va FastAPI ishlayotgan USTA PRO saytining haqiqiy HTTPS manzilini kiriting. Telefon uchun kompyuterdagi `127.0.0.1` manzili ishlamaydi. Sertifikat qurilma tomonidan ishonchli deb tan olinishi kerak.

APK’ni qayta yig‘ish uchun Node.js, JDK 21, Android Platform 35 va Build Tools 35.0.0 kerak:

```powershell
npm ci
.\android\build.ps1 -Jdk 'C:\path\jdk-21' -BuildTools 'C:\path\build-tools\35.0.0' -AndroidJar 'C:\path\platforms\android-35\android.jar'
```

Skript mahalliy o‘rnatish uchun alohida ishlab chiqish kaliti bilan APK’ni imzolaydi. Keyingi yangilanishlarni shu kalit bilan imzolash uchun `android/.build/usta-debug.p12` faylini saqlang.
## Yangilangan login va AI sozlamalari

Ma’lumotlar saqlanib qolishi uchun mavjud bazaga yangilangan `backend/schema.sql` faylini qo‘llang. Undagi qo‘shimchalar oldingi foydalanuvchi va loyiha yozuvlarini saqlaydi. Docker hajmini o‘chirmang.

Google Cloud Console’da **Google Auth Platform → Clients → Create client → Web application** yarating. Authorized JavaScript origin uchun saytning asosiy HTTPS manzilini, Authorized redirect URI uchun `https://SAYT-MANZILI/api/auth/google/callback` manzilini qo‘shing. Mahalliy sinovda `http://localhost:3000/api/auth/google/callback` ishlatiladi. Audience test rejimida sinov foydalanuvchilarini qo‘shing. Olingan qiymatlarni backendning `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` o‘zgaruvchilariga yozing. `APP_URL` sayt manziliga mos bo‘lsin. HTTPS muhitida `COOKIE_SECURE=1` qo‘ying. Frontendga client secret qo‘shilmaydi. Google akkauntining tasdiqlangan email manzili avvalgi hisobga mos kelsa, mavjud loyihalari shu hisobda saqlanadi.

Telefon orqali kirish Twilio Verify bilan ishlaydi. Twilio’da Verify Service yarating va `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` qiymatlarini backendga yozing. Telefon E.164 shaklida, masalan `+998901234567`, kiritiladi. SMS yuborish provayder tarifiga bog‘liq. Email va telefon hisoblari avtomatik birlashtirilmaydi.

Login va shaxsiy dashboard ajratildi. Android’ning ichki oflayn rejimida avvalgi kamera, kalkulyator va reja vositalarini alohida ochish mumkin. Shaxsiy loyihalar va hisobga bog‘liq amallar server sessiyasini talab qiladi.

AI Usta chat mavjud `OLLAMA_MODEL` orqali haqiqiy mahalliy modelga ulanadi. Model bo‘lmasa xatolik holati ko‘rsatiladi. Suhbat matni foydalanuvchi yuborgandan keyin mahalliy model xizmatiga uzatiladi.

## Qurilish materiallari modelini o‘qitish

Avtomatik material turini aniqlash uchun haqiqiy belgilangan tasvirlar kerak. Turli yorug‘lik, masofa, ustma-ust taxlash va material ko‘rinishlaridan olingan tasvirlarda har bir **ko‘rinadigan alohida predmetni** bounding box bilan belgilang. Sinflar `slate, board, beam, brick, block, pipe`. YOLO formatida har bir label qatori `class x_center y_center width height` qiymatlaridan iborat va koordinatalar 0–1 oralig‘ida bo‘lsin.

Tasvirlarni qurilish joyi bo‘yicha train, val va test guruhlariga ajrating. Bir joyning o‘xshash kadrlari turli guruhlarga tushmasin. `backend/material-dataset.example.yaml` nusxasida haqiqiy papka yo‘lini kiriting.

```powershell
uv pip install ultralytics pyyaml
.\.venv\Scripts\python.exe backend/train_materials.py --data C:/datasets/materials/dataset.yaml --epochs 100 --device cpu
```

GPU muhitida mos CUDA o‘rnatilgach `--device 0` ishlatiladi. Skript eng yaxshi checkpointni validation guruhida baholaydi va `validation.json` hisobotini yozadi. Keyin alohida test tasvirlarida sanash xatosini material turi va yopilish darajasi bo‘yicha tekshiring. Tekshirilgan `best.pt` faylini `MATERIAL_MODEL` ga ulang va backendni qayta ishga tushiring. Dataset va o‘qitilgan model bu loyihaga kiritilmagan.

Android’da Google kirishi tashqi brauzerda ochiladi va `ustapro://signin` havolasi orqali ilovaga qaytadi. Qaytishda server yaratgan ikki daqiqalik bir martalik kod ilova saqlagan PKCE tekshiruvi bilan almashtiriladi. Bu oqimda ham haqiqiy HTTPS serveri va Google Client sozlamalari zarur.

Backend integratsiya testlari uchun alohida bo‘sh PostgreSQL test bazasi yarating. `USTA_TEST_DATABASE_URL` ni shu bazaga yo‘naltiring. Testlar eski foydalanuvchi sxemasidan migratsiya, loyiha ajratilishi, qayta login, PDF, OAuth holati va mobil kodning bir martalik ishlatilishini tekshiradi. OAuth provayderi javoblari testda almashtiriladi. Haqiqiy Google akkaunti va SMS yuborish alohida sozlangan muhitda sinovdan o‘tkaziladi.

```powershell
uv pip install httpx
$env:USTA_TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:5432/usta_test'
.\.venv\Scripts\python.exe -m unittest discover -s tests -p test_*.py -v
```


## Uy konstruktori

«Uy dizayni» bo‘limida element turini tanlang va «Rejada chizish»ni yoqing. 2D rejada sudrab devor yoki xona yarating. Eshik va derazani devorga joylashtirganda 3D devorda ochilma hosil bo‘ladi. Elementlar qavatga bog‘langan. Qavat qo‘shish va nusxalash mavjud, hozirgi chegara 20 qavat. 3+ qavat hamda konstruktiv o‘zgarishlar muhandis tekshiruvini talab qiladi.

Tom tekis, ikki yoki to‘rt nishabli bo‘lishi mumkin. Balandligi, materiali va rangi tahrirlanadi. Fasad uchun suvoq, g‘isht, yog‘och va betonning dasturda yaratilgan teksturalari ishlatiladi. 3D obyektni bosib tanlang, joyini o‘zgartirish uchun sudrab qo‘yib yuboring. Ichkaridan ko‘rishda yurish tugmalari mavjud. PNG, GLB va JSON eksportlari mavjud.

Ovoz tugmasi brauzerning uz-UZ nutq tanish xizmatidan foydalanadi. Qo‘llab-quvvatlash brauzer va xizmatga bog‘liq. Qisqa buyruqlar ko‘rsatilgan ro‘yxat bo‘yicha bajariladi. Erkin AI orqali ovozli loyihalash uchun tashqi AI integratsiyasi hali kerak.

Autosave qoralamalari foydalanuvchi va loyiha identifikatoriga ajratilgan. 100 ta Undo/Redo holati saqlanadi. Material hisobida devor ochilmalari ayiriladi. Yopma qalinligi modelda 0.16 m. Beton ko‘rsatkichi yopmalar va ustunlarni qamrab oladi, armatura va barcha konstruktiv elementlarning yakuniy smetasi hisoblanmaydi.

## Mebel do‘koni

Katalogda 13 ta ushbu loyiha uchun original kod orqali yaratilgan GLB model mavjud. Tashqi ishlab chiqaruvchilarning savdo narxlari yoki mahsulotlari da’vo qilinmaydi. Dastlab narxlar bo‘sh. Har bir rasm aynan o‘sha GLB modeldan render qilingan. three.js va GLTFExporter MIT kutubxonalaridan foydalaniladi. Modellarning manbasi `app/furniture-builder.mjs`, manifesti `public/furniture-catalog.json`. `scripts/build-furniture.mjs` mavjud model baytlarini o‘zgartirishdan himoyalangan. Geometriyani yangilashda yangi versiya papkasi yarating.

«Loyihaga qo‘shish» orqali qoralama yoki o‘z hisobingizdagi uy loyihasi, qavat va xona tanlanadi. Mebel sahnada tanlanadi, suriladi, aylantiriladi, bo‘yaladi va nusxalanadi. Uy, xona, devor va boshqa mebellar bilan to‘qnashuv o‘lcham qutilari orqali konservativ tekshiriladi. Modelning ruxsat etilgan masshtabi 50–150%. Polga o‘tirish va model o‘lchami normalizatsiya bilan ta’minlanadi. Oldingi loyihalarda model URL, versiya, rang, material, narx va joylashuv snapshot sifatida saqlanadi.

Mebel smetasi uy muharririda chiqadi va saqlangan loyihaning umumiy PDF hisobotiga ham qo‘shiladi. Biror narx bo‘sh bo‘lsa, jami «to‘liq emas» deb belgilanadi. Mahalliy smetani brauzerning PDF/chop etish oynasi orqali olish mumkin.

Administrator huquqi faqat backendning `FURNITURE_ADMIN_IDS` o‘zgaruvchisida sanab o‘tilgan foydalanuvchi ID’lariga beriladi. ID’ni kirilgan hisobning `/api/me` javobidan aniqlang. ID’ni frontendda o‘zgartirish administrator huquqini bermaydi. Yangilangan `backend/schema.sql` sxemasini mavjud bazaga qo‘llang va serverni qayta ishga tushiring. Katalog boshqaruvi oddiy hisobda ko‘rsatilmaydi va API tomonidan ham rad etiladi.

Administrator rasm va embedded GLB/GLTF yuklay oladi. Fayl chegarasi 8 MB. Tashqi resurslarga bog‘langan yoki qo‘llab-quvvatlanmaydigan siqilgan modellarga ruxsat berilmaydi. Model fayllari kontent xeshi bilan o‘zgarmas saqlanadi. Katalogdan olib tashlash eski loyiha fayllarini o‘chirmaydi. Serverga yuklangan qo‘shimcha assetlar uchun telefonning serverga ulanishi talab qilinadi. APK ichidagi original katalog oflayn mavjud.

Qisqa mebel ovozli buyruqlari mavjud, masalan «Zalga oq divan qo‘y» va tanlangan mebel rangini o‘zgartirish. Xona noaniq bo‘lsa aniqlashtirish so‘raladi. «Derazadan uzoqroqqa» kabi murakkab erkin ko‘rsatmalar uchun tashqi AI xizmati hali ulanmagan. Haqiqiy o‘zbekcha nutq tanish brauzer xizmatiga bog‘liq.

Mebel tanlovi va sevimlilar foydalanuvchi kesimida qurilmada saqlanadi. Devor tomoniga tekislash to‘rtta yo‘nalishda ishlaydi va aylantirilgan modelning o‘lcham qutisi hisobga olinadi. Katalogdan mebel qo‘shish ham Undo/Redo tarixiga kiradi.

Standart modellar uchun yengil 64×64 mato/yog‘och/metall sirt teksturalari qo‘llanadi. Asl model teksturasi mavjud bo‘lsa saqlanadi. Rang o‘zgarishi asosiy sirtga qo‘llanadi, karkas, oyoq va o‘simlik barglari ranglari saqlanadi. Serverga yuklanadigan model teksturasi har bir tomonda 2048 px dan, umumiy tekstura maydoni 16 megapikseldan oshmasin.
