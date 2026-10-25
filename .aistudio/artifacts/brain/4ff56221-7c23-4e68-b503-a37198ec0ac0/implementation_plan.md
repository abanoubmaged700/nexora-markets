# خطة التدقيق الهندسي وتقوية الإنتاج لمنظومة NEXORA Markets Multi-Agent AI

توثق هذه الخطة المعمارية المحدثة التنفيذ الكامل للمهام الحرجة الثلاث لتقوية منظومة الوكلاء الستة:
1. **التخزين الدائم لسجلات التنفيذ ومسار التدقيق (SQLite WAL + PostgreSQL Migration Path)**.
2. **تأمين تكامل Webhook لمحرك n8n بتوقيع `HMAC-SHA256` ومنع هجمات الإعادة (`Replay Protection`)**.
3. **محرك التحقق المالي خماسي الطبقات ومنع الهلوسة (`5-Layer Financial Validation Engine`)**.

---

## 1. التخزين الدائم وسجل التدقيق (TASK 1 — Persistent Execution Logs & Audit Trail)

- **محرك قاعدة البيانات**: اعتماد `node:sqlite` (`DatabaseSync`) بوضع `WAL (Write-Ahead Logging)` في المسار `.data/nexora_production.sqlite` لضمان بقاء السجلات عبر عمليات إعادة تشغيل الخادم، مع توفير ملف ترحيل متكامل لـ PostgreSQL (`src/db/sql/001_initial_schema.postgres.sql`) لبيئات Cloud SQL السحابية.
- **الجداول الستة المنفذة والمفهرسة**:
  1. `agent_executions`: يحفظ كافة تفاصيل التشغيل وبصمة المحتوى `content_hash` (`SHA-256`).
  2. `agent_health`: يحفظ الحالة الصحية التراكمية للوكلاء الستة.
  3. `approval_decisions`: سجل تاريخي غير قابل للتلاعب لقرارات الاعتماد والرفض وإلغاء الاعتماد عند تعديل المحتوى.
  4. `publication_logs`: يوثق عمليات النشر ويمنع النشر المزدوج عبر `idempotency_key`.
  5. `api_error_logs`: يوثق محاولات الاتصال الفاشلة بـ Gemini API (`503`, `429`, `Timeout`).
  6. `webhook_nonces`: يحفظ الأرقام العشوائية المستهلكة مع تاريخ انتهاء صلاحيتها.
- **حماية الأسرار (Secret Scrubbing)**: تنقية كافة السجلات قبل الحفظ أو التصدير بصيغتي JSON و CSV لضمان خلوها التام من أي مفاتيح API أو رموز مصادقة.

---

## 2. تأمين تكامل Webhook مع n8n (TASK 2 — Secure HMAC-SHA256 Webhook Integration)

- **صيغة التوقيع القياسية (Canonical Signing Format)**:
  - يتم حساب التوقيع عبر `HMAC-SHA256` باستخدام السر الخلفي `N8N_WEBHOOK_SECRET` على السلسلة القياسية:
    `${X-NEXORA-Timestamp}.${X-NEXORA-Nonce}.${rawRequestBody}`
- **آليات الحماية المطبقة على `/api/n8n/webhook`**:
  - التحقق من التوقيع بزمن ثابت (`crypto.timingSafeEqual`).
  - التحقق من حداثة الطابع الزمني `X-NEXORA-Timestamp` ضمن نافذة ±300 ثانية.
  - التحقق من عدم تكرار `X-NEXORA-Nonce` وحفظه في جدول `webhook_nonces`.
  - منع تكرار التنفيذ عبر `idempotency_key` وتحديد حجم الطلب بـ `256kb` وفرض Rate Limiting لكل عنوان IP.

---

## 3. محرك التحقق المالي خماسي الطبقات (TASK 3 — 5-Layer Financial Validation Engine)

- **Layer A (Source Validation)**: التحقق من اسم المصدر، المعرف، الطابع الزمني، العملة، والحداثة، ورفض الادعاءات الكاذبة بأن البيانات المتأخرة هي بيانات حية (`LIVE`).
- **Layer B (Numeric Validation)**: مطابقة الأرقام الاقتصادية والأسعار مع المدخلات المعتمدة، والتحقق الحتمي من حسابات النسب المئوية والمخاطرة والعائد.
- **Layer C (AI Output Validation)**: فرض المخطط المهيكل الصارم لكل وكيل، وفصل الحقائق المرصودة عن التفسيرات الفنية، واشتراط الأدلة المرجعية.
- **Layer D (Human Approval & Content Version Integrity)**: اشتراط حالة `VALIDATED` وموافقة بشرية صريحة (`APPROVED`) قبل النشر، مع إلغاء الاعتماد تلقائياً إذا تغيرت بصمة المحتوى (`content_hash`) بعد الموافقة.
- **Layer E (Safe Failure)**: تطبيق إعادة المحاولة الأسية المحدودة مع `Jitter` والتبديل التلقائي إلى `gemini-3.1-flash-lite`، وإرجاع خطأ صريح (`HTTP 503`) عند الفشل الكلي دون تمرير أي محاكاة صامتة.
