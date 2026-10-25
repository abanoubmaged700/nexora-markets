# NEXORA Markets — Hardened Multi-Agent Financial AI System (v1.2 Production)

منظومة الوكلاء الأذكياء المتعددين للأبحاث المالية، التحليل الفني وفق منهجية ICT/SMC، فحص الأسهم الإقليمية (EGX/TASI)، وحوكمة المخاطر الحتمية.

---

## 1. المعمارية الأمنية وتقوية الإنتاج (Production Hardening Architecture)

تمت تقوية النظام عبر ثلاث ركائز هندسية أساسية:

### أ. التخزين الدائم وسجل التدقيق (Persistent SQLite WAL & PostgreSQL Migration Path)
- **التطوير المحلي والخوادم ذات الأقراص الدائمة**: يستخدم الخادم محرك `node:sqlite` (`DatabaseSync`) بوضع `WAL (Write-Ahead Logging)` في المسار `.data/nexora_production.sqlite`.
- **الجداول الستة المفهرسة**:
  1. `agent_executions`: يحفظ جميع عمليات تشغيل الوكلاء، النموذج المطلوب، النموذج الفعلي، المحاولات، زمن الاستجابة، الرموز، التكلفة، بصمة المحتوى `content_hash`، وحالات التحقق والاعتماد والنشر.
  2. `agent_health`: يحفظ مؤشرات صحة الوكلاء الستة وإحصائياتهم التراكمية.
  3. `approval_decisions`: سجل التدقيق التاريخي لقرارات المراجعة البشرية (`APPROVED`, `REJECTED`, `INVALIDATED_BY_EDIT`).
  4. `publication_logs`: سجل النشر الفعلي المحمي بمفتاح عدم التكرار (`idempotency_key`).
  5. `api_error_logs`: يوثق أي أخطاء `HTTP 503` أو `429` أو `Timeout` أثناء محاولات الاتصال بـ Gemini API.
  6. `webhook_nonces`: يحفظ الأرقام العشوائية (`X-NEXORA-Nonce`) مع وقت انتهاء الصلاحية لمنع هجمات الإعادة (`Replay Attacks`).
- **متطلبات النشر السحابي (Deployment Durability Requirements)**:
  - في بيئات الخوادم الافتراضية (VPS) أو الحاويات المزودة بقرص دائم (Persistent Volume)، يحتفظ ملف SQLite بجميع السجلات عبر عمليات إعادة تشغيل الخادم.
  - في البيئات السحابية العديمة الحالة (Stateless Ephemeral Containers مثل Google Cloud Run بدون Volume Mount)، يجب ربط قاعدة بيانات **Cloud SQL for PostgreSQL** عبر المتغير البيئي `DATABASE_URL` وتطبيق ملف الترحيل الجاهز `src/db/sql/001_initial_schema.postgres.sql`.
- **تنقية الأسرار (Secret Scrubbing)**: تقوم الدالة `sanitizeForPersistence` بحذف وتعمية أي مفاتيح API أو رموز سرية قبل الحفظ في قاعدة البيانات أو التصدير بصيغة JSON/CSV.

### ب. تأمين عقد تكامل n8n عبر `HMAC-SHA256`
- الصيغة القياسية للتوقيع (Canonical String):
  ```text
  <X-NEXORA-Timestamp>.<X-NEXORA-Nonce>.<Exact_Raw_Request_Body>
  ```
- الترويسات الإلزامية في طلبات `/api/n8n/webhook`:
  - `X-NEXORA-Timestamp`: الطابع الزمني بالثواني (يُرفض أي طلب يتجاوز فارق ±300 ثانية).
  - `X-NEXORA-Nonce`: رقم عشوائي فريد يُحفظ في `webhook_nonces` لمنع إعادة استخدام نفس الطلب.
  - `X-NEXORA-Signature`: توقيع `HMAC-SHA256` يُفحص عبر `crypto.timingSafeEqual` بزمن ثابت.

### ج. محرك التحقق المالي خماسي الطبقات (5-Layer Financial Validation Engine)
- **Layer A (Source Validation)**: يوثق اسم المصدر، المعرف، العملة، وعمر البيانات، ويرفض البيانات المجهولة المصدر أو البيانات المتأخرة المصنفة زوراً بأنها حية (`LIVE`).
- **Layer B (Numeric Validation)**: يطابق الأرقام الاقتصادية والأسعار مع المدخلات المعتمدة، وينفذ حسابات النسب المئوية والمخاطرة والعائد بالكود الحتمي 100%.
- **Layer C (AI Output Validation)**: يفرض مخططات `@google/genai` المهيكلة الصارمة، ويفصل الحقائق السعرية المرصودة عن التفسيرات الفنية.
- **Layer D (Human Approval & Content Hash Integrity)**: يربط قرار الاعتماد البشري ببصمة `SHA-256` للمحتوى؛ إذا تم تعديل المحتوى بعد اعتماده يُلغى الاعتماد فوراً (`PENDING_HUMAN_APPROVAL`) ويُمنع النشر حتى يعاد اعتماده.
- **Layer E (Safe Failure)**: يعيد المحاولة أُسياً مع التبديل التلقائي إلى `gemini-3.1-flash-lite`، ويرجع خطأ صريحاً (`HTTP 503`) عند الفشل الكلي دون تمرير أي محاكاة صامتة.

---

## 2. التشغيل والاختبار (Commands)

```bash
# تشغيل الخادم وواجهة المستخدم على المنفذ 3000
npm run dev

# التحقق من سلامة الأنواع البرمجية (TypeScript)
npm run lint

# بناء حزمة الإنتاج
npm run build
```
