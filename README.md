# NEXORA Markets — Multi-Agent AI System

منظومة الوكلاء الأذكياء المتعددين لشركة نكسورا ماركتس للأبحاث المالية وتحليل الأسواق.

## نظرة عامة
منظومة مؤسسية متكاملة تضم 6 وكلاء أذكياء مدعومين بنماذج Gemini API، مع واجهة مستخدم عربية (RTL) بتصميم فخم (Navy & Gold)، وقاعدة بيانات SQLite محلية مستدامة، وبوابات اعتماد بشري (HITL)، وتكامل آمن مع n8n وتيليجرام.

## الوكلاء الستة
1. **Economic News Agent**: تحليل التقويم الاقتصادي والأحداث الكلية مع تطبيع التوقيت إلى `Africa/Cairo`.
2. **Market Analysis Agent**: تحليل هيكل السوق (ICT/SMC) ومناطق السيولة وضرورة إبطال السيناريو.
3. **Stock Radar Agent**: رادار أسهم البورصة المصرية والسوق السعودية (EGX & TASI) مع تنبيهات تأخر البيانات.
4. **Content Creator Agent**: صياغة المحتوى المالي لتيليجرام ولينكدإن وشرائط الفيديو دون تهويل.
5. **Risk Guardian Agent**: حسابات حتمية 100% لإدارة المخاطر والتحقق من التراجع وحدود اللوت.
6. **Business & Portfolio Agent**: توثيق إجراءات التشغيل القياسية (SOPs) ودراسات الحالة المؤسسية.

## التقنيات المستخدمة
- React 19 + TypeScript + Vite + Tailwind CSS v4
- Node.js + Express + Google GenAI SDK (`@google/genai`)
- SQLite (`sql.js`) مع استمرارية على القرص (`nexora_persistence.sqlite`)
- تحقّق من المخططات (Schema Validation) ومنع الهلوسة الرقمية.
