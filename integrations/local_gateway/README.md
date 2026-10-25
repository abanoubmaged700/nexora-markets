# NEXORA Markets — Local Windows Webhook Gateway

دليل الإعداد والتشغيل للبوابة المحلية الآمنة (`Local Gateway`) ضمن منظومة NEXORA Markets. تتيح هذه البوابة ربط الخادم السحابي (Google AI Studio) بتطبيق n8n المحلي على جهازك الـ Windows (`http://localhost:5678`) بشكل مشفر ومحمي.

---

## 1. متطلبات النظام
- **Node.js**: الإصدار 18 أو أحدث مثبت على جهازك الـ Windows.
- **n8n**: يعمل محلياً على المنفذ الافتراضي `5678`.

---

## 2. تثبيت الاعتمادات (`npm install`)
1. فتح موجه الأوامر (CMD أو PowerShell) والانتقال إلى مجلد البوابة:
   ```bash
   cd integrations/local_gateway
   ```
2. تثبيت الحزم المطلوبة (Express و sql.js):
   ```bash
   npm install
   ```

---

## 3. إعداد متغيرات البيئة (`.env`)
أنشئ ملفاً باسم `.env` في نفس مجلد البوابة (`integrations/local_gateway/.env`) مستعيناً بالملف `.env.example`:
```env
GATEWAY_PORT=3001
N8N_TARGET_URL=http://localhost:5678/webhook/nexora-publish
N8N_WEBHOOK_SECRET=your_cryptographically_secure_hmac_secret_here_min_16_chars
```

> **ملاحظة أمنية:** يجب أن يكون `N8N_WEBHOOK_SECRET` هو نفس المفتاح المشترك والمضبوط في الخادم السحابي لتجنب رفض الطلبات (برمز `403`).

---

## 4. أووامر التشغيل
* **تشغيل البوابة بشكل مباشر:**
  ```bash
  npm start
  ```
  أو:
  ```bash
  node gateway.js
  ```
  > سترد رسالة تأكيد بأن البوابة مرتبطة حصرياً بالعنوان المحلي: `🔒 NEXORA Secure Local Webhook Gateway listening strictly on http://127.0.0.1:3001`.

* **تشغيل اختبارات الأمان الآلية:**
  ```bash
  npm test
  ```

---

## 5. عقد التوقيع الموحد (Shared HMAC-SHA256 Contract)
لضمان الأمان التام ومنع هجمات الاعتراض والتلاعب، يتشارك الخادم السحابي والبوابة المحلية العقد الأمني التالي:
1. **الصيغة الكانونية للتوقيع (Canonical String):**
   $$\text{canonicalString} = \text{timestamp} + \text{"."} + \text{nonce} + \text{"."} + \text{rawBody}$$
2. **الخوارزمية:** `HMAC-SHA256` باستخدام المفتاح `N8N_WEBHOOK_SECRET`.
3. **المقارنة بزمن ثابت:** تستخدم البوابة دالة `crypto.timingSafeEqual` لمنع هجمات التوقيت (Timing Attacks).
4. **الرؤوس الأمنية (Security Headers) المرسلة مع كل طلب:**
   - `X-NEXORA-Timestamp`: الطابع الزمني للطلب (يُرفض الطلب إذا تجاوز الفارق 300 ثانية لمنع Replay Attacks).
   - `X-NEXORA-Nonce`: معرف فريد لكل طلب (يُحفظ في SQLite لمنع إعادة الاستخدام).
   - `X-NEXORA-Signature`: التوقيع الرقمي الست عشري (Hex Digest).
5. **شروط الاعتماد:** يُشترط أن يكون محتوى النشر معتمداً صراحةً (`human_approval_status = 'APPROVED'`) وأن يكون معرّف التشغيل (`run_id`) فريداً لمنع تكرار النشر (Idempotency).
