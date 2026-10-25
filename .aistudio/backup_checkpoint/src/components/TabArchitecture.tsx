import React, { useState } from 'react';
import { GEMINI_MODEL_COMPARISON, SHARED_CONTRACT_SCHEMA } from '../data/architectureDocs';
import { 
  Cpu, 
  ShieldAlert, 
  Server, 
  Workflow, 
  FileJson, 
  KeyRound, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Send,
  Database
} from 'lucide-react';

export const TabArchitecture: React.FC = () => {
  const [monthlyQueries, setMonthlyQueries] = useState<number>(50000);
  const [showFullSchema, setShowFullSchema] = useState<boolean>(false);

  // Cost estimates based on 400 input tokens and 500 output tokens per run
  const flashInputCost = (monthlyQueries * 400 / 1000000) * 0.075;
  const flashOutputCost = (monthlyQueries * 500 / 1000000) * 0.30;
  const totalFlashCost = flashInputCost + flashOutputCost;

  const argonInputCost = (monthlyQueries * 400 / 1000000) * 2.0;
  const argonOutputCost = (monthlyQueries * 500 / 1000000) * 8.0;
  const totalArgonCost = argonInputCost + argonOutputCost;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Executive Overview Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <span>وثيقة الهندسة المعمارية الشاملة - NEXORA Multi-Agent v1.2</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">
            طبقة الذكاء الاصطناعي وهندسة الوكلاء المتعددين منخفضة التكلفة
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            نظام إنتاجي متكامل مصمم خصيصاً لشركة <strong className="text-amber-300">NEXORA Markets</strong> للأبحاث المالية والتعليم والتداول. 
            يربط بين قوة نماذج <strong className="text-indigo-300 font-mono">Gemini 3.8 Flash</strong> ومحرك الأتمتة <strong className="text-amber-300">n8n</strong> وقنوات النشر على <strong className="text-sky-400">Telegram</strong> والتوثيق في <strong className="text-rose-400">Notion</strong> وأدوات البرمجة في <strong className="text-emerald-400">Codex</strong>، 
            مع ضمان عدم الهلوسة وفصل الحسابات المالية الحتمية وحماية رأس المال بنسبة 100%.
          </p>
        </div>
      </div>

      {/* System Flow & Topology Diagram */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Workflow className="w-5 h-5 text-amber-400" />
              مخطط تدفق البيانات بين الوكلاء والأنظمة (End-to-End Pipeline)
            </h2>
            <p className="text-xs text-slate-400">
              كيف تنتقل البيانات من المصادر المعتمدة وحتى القنوات العامة بعد التحقق والاعتماد البشري
            </p>
          </div>
          <span className="px-3 py-1 rounded-md bg-slate-800 text-amber-400 text-xs font-mono border border-slate-700">
            Idempotency & Zero-Hallucination Gate
          </span>
        </div>

        {/* Visual pipeline blocks */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-[11px] font-mono text-amber-400 font-semibold mb-1">المرحلة 1: التدفق المصدر</div>
              <h3 className="font-bold text-white text-sm">المزودون المعتمدون</h3>
              <p className="text-xs text-slate-400 mt-2">
                بيانات التقويم الاقتصادي (ForexFactory/BLS)، وبيانات الأسهم وشموع OHLC عبر Webhook.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 font-mono">
              Whitelist Domains Only
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-[11px] font-mono text-sky-400 font-semibold mb-1">المرحلة 2: المعالجة الأولية</div>
              <h3 className="font-bold text-white text-sm">محرك n8n Orchestrator</h3>
              <p className="text-xs text-slate-400 mt-2">
                توليد run_id فريد، وتطبيع التوقيت إجبارياً إلى توقيت القاهرة (Africa/Cairo)، ومنع التكرار (Deduplication).
              </p>
            </div>
            <div className="pt-2 border-t border-slate-700/60 text-[10px] text-sky-300 font-mono">
              Deterministic Cairo Time
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-b from-indigo-950/60 to-slate-800/80 border border-indigo-700/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-[11px] font-mono text-indigo-300 font-semibold mb-1">المرحلة 3: طبقة الذكاء</div>
              <h3 className="font-bold text-white text-sm">Gemini API (3.8 Flash)</h3>
              <p className="text-xs text-slate-400 mt-2">
                تنفيذ الوكيل المطلوب بدقة متناهية وحرارة منخفضة (0.1 - 0.2) وإرجاع JSON منضبط بمخطط العقد الموحد.
              </p>
            </div>
            <div className="pt-2 border-t border-indigo-700/40 text-[10px] text-indigo-300 font-mono">
              Zero Verbosity & Schemas
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-700/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-[11px] font-mono text-rose-300 font-semibold mb-1">المرحلة 4: التدقيق الحسابي</div>
              <h3 className="font-bold text-white text-sm">حارس المخاطر الحتمي</h3>
              <p className="text-xs text-slate-400 mt-2">
                حساب اللوت ونسبة المخاطرة وتراجع المحفظة بكود برمجي حتمي 100%؛ وحظر فوري لأي صفقة مخالفة.
              </p>
            </div>
            <div className="pt-2 border-t border-rose-700/30 text-[10px] text-rose-300 font-mono">
              Deterministic Math Engine
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="text-[11px] font-mono text-emerald-300 font-semibold mb-1">المرحلة 5: الاعتماد والنشر</div>
              <h3 className="font-bold text-white text-sm">بوابة الموافقة البشرية (HITL)</h3>
              <p className="text-xs text-slate-400 mt-2">
                إرسال بطاقة مراجعة تفاعلية لبوت تيليجرام بأزرار [اعتماد / تعديل / رفض]، ثم النشر العام والأرشفة في Notion.
              </p>
            </div>
            <div className="pt-2 border-t border-emerald-700/30 text-[10px] text-emerald-300 font-mono">
              Telegram Inline + Notion DB
            </div>
          </div>
        </div>
      </div>

      {/* Model Comparison & Economics Matrix */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              مقارنة نماذج Gemini API واختيار النموذج الأمثل لأعباء نكسورا
            </h2>
            <p className="text-xs text-slate-400">
              تحليل الكفاءة المالية وزمن الاستجابة (Latency) وقدرات التفكير لكل فئة من الوكلاء
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            Current Active Family: Gemini 3 & 4
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {GEMINI_MODEL_COMPARISON.map((m) => {
            const isFlash = m.modelId === 'gemini-3.8-flash';
            return (
              <div
                key={m.modelId}
                className={`rounded-xl p-5 flex flex-col justify-between space-y-4 border transition-all ${
                  isFlash
                    ? 'bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                    : 'bg-slate-800/60 border-slate-700/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-white">{m.modelId}</span>
                    {isFlash && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                        موصى به للإنتاج ⭐
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-200">{m.commonName}</h3>

                  <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 rounded-lg bg-slate-900/60 text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-slate-400">سعر المدخلات</div>
                      <div className="text-slate-200 font-semibold">{m.inputPricing}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">سعر المخرجات</div>
                      <div className="text-slate-200 font-semibold">{m.outputPricing}</div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold text-slate-300">الوكلاء المتوافقون:</div>
                    <div className="flex flex-wrap gap-1">
                      {m.bestFitAgents.map((ag, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {ag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                    <div className="font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> المزايا:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 pr-2">
                      {m.pros.map((p, idx) => (
                        <li key={idx} className="text-[11px] leading-relaxed">{p}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700/60">
                  <p className="text-[11px] text-amber-300/90 leading-relaxed font-sans">
                    💡 {m.recommendationReasonAr}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Cost Calculator */}
        <div className="p-6 rounded-xl bg-slate-800/70 border border-slate-700 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-sm">حاسبة تكاليف تشغيل الوكلاء الشهرية التقديرية (API Cost Calculator)</h3>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              متوسط 400 رمز إدخال + 500 رمز إخراج لكل استدعاء
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>عدد استدعاءات الوكلاء شهرياً:</span>
              <span className="font-mono font-bold text-amber-400">{monthlyQueries.toLocaleString()} استدعاء</span>
            </div>
            <input
              type="range"
              min="5000"
              max="200000"
              step="5000"
              value={monthlyQueries}
              onChange={(e) => setMonthlyQueries(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-700 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-indigo-950/40 border border-indigo-500/40 space-y-1">
              <div className="text-xs text-indigo-300 font-semibold">التكلفة التقديرية عبر Gemini 3.8 Flash (المعتمد):</div>
              <div className="text-2xl font-black font-mono text-white">
                ${totalFlashCost.toFixed(2)} <span className="text-xs text-slate-400 font-sans">شهرياً (أو مجاني ضمن الكوتا)</span>
              </div>
              <p className="text-[11px] text-emerald-400">
                وفورات تفوق 95% مقارنة بالنماذج الضخمة مع سرعة استجابة لحظية تلائم قنوات التداول الحية.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700 space-y-1">
              <div className="text-xs text-slate-400 font-semibold">التكلفة لو تم استخدام النماذج الضخمة (Argon / Pro):</div>
              <div className="text-2xl font-black font-mono text-slate-400">
                ${totalArgonCost.toFixed(2)} <span className="text-xs text-slate-500 font-sans">شهرياً</span>
              </div>
              <p className="text-[11px] text-rose-300/80">
                تكلفة باهظة غير مبررة للعمليات اليومية اللحظية (تثبت صحة قرارنا المعماري باعتماد Flash).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Operational Realities & Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security & Least Privilege */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <KeyRound className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">بروتوكول الأمان والصلاحيات الأدنى (Least Privilege)</h3>
          </div>
          <ul className="space-y-3 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>عزل مفاتيح الـ API تماماً:</strong> حظر كتابة مفتاح Gemini API في كود الفرونت إند أو في نصوص المطالبات (Prompts)؛ يتم حفظها حصراً في متغيرات البيئة السرية للخادم وسحبها عبر مسارات خادم خلفية آمنة (/api/*).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>صلاحيات قنوات تيليجرام ونوشن:</strong> بوت تيليجرام لا يمتلك أي صلاحيات إدارية على القنوات سوى النشر التحريري؛ وتكامل Notion مقيد بقواعد البيانات المخصصة دون النفاذ لبقية مساحة العمل.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>عدم تكرار العمليات (Idempotency):</strong> استخدام مفتاح run_id بصيغة فريدة ومطابقة البصمة لمنع إرسال نفس التحليل أو الإشعار مرتين عند تكرار التنبيهات.</span>
            </li>
          </ul>
        </div>

        {/* Operational Realities: AI Studio vs Production Hosting */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">حقائق تشغيلية حاسمة (Operational Realities)</h3>
          </div>
          <ul className="space-y-3 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span><strong>طبيعة Google AI Studio:</strong> منصة Google AI Studio هي بيئة تطوير، هندسة مطالبات (Prompt Engineering)، اختبار وتكامل للنماذج؛ ولا توفر خوادم مجدولة تعمل على مدار الساعة تلقائياً (No persistent cron workers inside AI Studio). الجدولة الدورية المستمرة (Cron) تقع حصراً على عاتق محرك n8n المستضاف على خادم VPS أو Cloud Run.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span><strong>حسابات وفواتير Gemini API:</strong> اشتراكات المستهلكين للأفراد (مثل Gemini Advanced أو Google One AI Premium) لا تتضمن أرصدة لاستخدام واجهة المطورين (Gemini API SDK). استدعاءات البرمجة تتطلب مشروع Google Cloud أو حساب Google AI Studio مزوداً ببطاقة سداد بعد انتهاء الكوتا المجانية.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span><strong>الفصل الحتمي للعمليات الحسابية:</strong> النماذج اللغوية ممتازة في الفهم والتحليل ولكنها غير موثوقة في الحسابات الرياضية الدقيقة؛ لذلك تم عزل جميع معادلات إدارة المخاطر في كود TypeScript حتمي مستقل تماماً.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Shared Message Contract v1.2 Specification */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileJson className="w-5 h-5 text-amber-400" />
              عقد الرسائل الموحد المشترك (Shared Message Contract v1.2)
            </h2>
            <p className="text-xs text-slate-400">
              الميثاق البرمجي الموحد لجميع الوكلاء الستة لضمان التوافق التام مع n8n و Notion
            </p>
          </div>
          <button
            onClick={() => setShowFullSchema(!showFullSchema)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-mono border border-slate-700 transition cursor-pointer"
          >
            {showFullSchema ? 'إخفاء المخطط الخام' : 'عرض JSON Schema الكامل'}
          </button>
        </div>

        {/* Visual Fields Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700">
              <tr>
                <th className="p-3 font-mono">الحقل (Field)</th>
                <th className="p-3">النوع (Type)</th>
                <th className="p-3">إلزامي؟</th>
                <th className="p-3">الوظيفة والقيود المعمارية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40 text-slate-300 font-sans">
              <tr>
                <td className="p-3 font-mono text-amber-300">agent_id</td>
                <td className="p-3 font-mono text-slate-400">Enum (string)</td>
                <td className="p-3 text-emerald-400">نعم</td>
                <td className="p-3">معرف الوكيل المنفذ (مثل economic_news_agent) لفرز المعالجة في n8n.</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-amber-300">run_id</td>
                <td className="p-3 font-mono text-slate-400">string</td>
                <td className="p-3 text-emerald-400">نعم</td>
                <td className="p-3">معرف التشغيل الفريد لمنع تكرار الإرسال وتتبع السجلات في Notion.</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-amber-300">timestamp</td>
                <td className="p-3 font-mono text-slate-400">ISO 8601 string</td>
                <td className="p-3 text-emerald-400">نعم</td>
                <td className="p-3">الختم الزمني العالمي للعملية.</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-amber-300">timezone</td>
                <td className="p-3 font-mono text-slate-400">Const: 'Africa/Cairo'</td>
                <td className="p-3 text-emerald-400">نعم</td>
                <td className="p-3">التطبيع الإجباري لتوقيت القاهرة لتوحيد المعايير الإقليمية لنكسورا ماركتس.</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-amber-300">source</td>
                <td className="p-3 font-mono text-slate-400">string</td>
                <td className="p-3 text-emerald-400">نعم</td>
                <td className="p-3">اسم المزود المعتمد الموثق لمنع انتحال المصادر أو تزييف البيانات.</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-amber-300">inputs</td>
                <td className="p-3 font-mono text-slate-400">object</td>
                <td className="p-3 text-emerald-400">نعم</td>
                <td className="p-3">البيانات الخام المدخلة للمراجعة والتدقيق العكسي (Audit Trail).</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-amber-300">outputs</td>
                <td className="p-3 font-mono text-slate-400">object (Schema-bound)</td>
                <td className="p-3 text-emerald-400">نعم</td>
                <td className="p-3">المخرجات المهيكلة الدقيقة الخاصة بالوكيل دون أي نصوص حرة غير منضبطة.</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-amber-300">validation_status</td>
                <td className="p-3 font-mono text-slate-400">Enum</td>
                <td className="p-3 text-emerald-400">نعم</td>
                <td className="p-3">حالة السلامة: VALIDATED, VALIDATION_FAILED, DEGRADED_SOURCE.</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-amber-300">human_approval_status</td>
                <td className="p-3 font-mono text-slate-400">Enum</td>
                <td className="p-3 text-emerald-400">نعم</td>
                <td className="p-3">بوابة التدخل البشري: PENDING_HUMAN_APPROVAL أو BLOCKED_BY_RISK_RULE.</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-amber-300">next_action</td>
                <td className="p-3 font-mono text-slate-400">Enum</td>
                <td className="p-3 text-emerald-400">نعم</td>
                <td className="p-3">أمر التوجيه التالي لمحرك n8n (نشر، حظر، حفظ في Notion).</td>
              </tr>
            </tbody>
          </table>
        </div>

        {showFullSchema && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-200 overflow-x-auto max-h-96">
            <pre>{JSON.stringify(SHARED_CONTRACT_SCHEMA, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
