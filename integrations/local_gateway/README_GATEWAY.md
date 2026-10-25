# NEXORA Markets — Local Windows Webhook Gateway Setup Guide

تتيح لك هذه البوابة المحلية (Local Webhook Gateway) تشغيل نقطة استقبال آمنة على جهازك الـ Windows (مثال: المنفذ `3001`) للتحقق من تواقيع `HMAC-SHA256` والطوابع الزمنية ومنع التكرار قبل تمرير الطلبات بأمان إلى خادم n8n المحلي على (`http://localhost:5678`).

---

## 1. المتطلبات والبيئة
- Node.js (v18 أو أعلى) مثبت على جهازك الـ Windows.
- خادم n8n المحلي يعمل على المنفذ الافتراضي `5678`.

---

## 2. متغيرات البيئة المطلوبة (.env)
أنشئ ملف `.env` في مجلد البوابة أو قم بتعيين المتغيرات في موجه القيادة:
```env
GATEWAY_PORT=3001
N8N_TARGET_URL=http://localhost:5678/webhook/nexora-publish
N8N_WEBHOOK_SECRET=nexora_secure_shared_secret_2026
```

---

## 3. تعليمات التثبيت والتشغيل على Windows

1. افتح موجه الأوامر (CMD أو PowerShell) وانتقل إلى مجلد البوابة:
   ```bash
   cd integrations/local_gateway
   ```
2. ثبّت الحزم المطلوبة (Express):
   ```bash
   npm init -y && npm install express
   ```
3. شغّل البوابة:
   ```bash
   node gateway.js
   ```

---

## 4. ربط النفق الآمن (ngrok Tunnel)
لكي يتمكن تطبيق Google AI Studio السحابي من إرسال الطلبات إلى بوابتك المحلية عبر الإنترنت بشكل آمن ومشفّر (HTTPS)، شغّل ngrok على المنفذ `3001`:
```bash
ngrok http 3001
```
خذ الرابط الناتج (مثال: `https://xxxx.ngrok-free.app`) واستخدم المسار `/gateway/publish` كوجهة للويب هوك في التطبيق السحابي.
