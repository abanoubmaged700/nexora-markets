import React, { useState } from 'react';
import { N8N_WORKFLOW_TEMPLATE } from '../data/architectureDocs';
import {
  Workflow,
  Copy,
  Check,
  Database,
  Key,
  Download,
  Bot,
  Layers,
  ShieldCheck,
  Play,
  CheckCircle2,
  XCircle,
  Lock,
  RefreshCw,
} from 'lucide-react';

interface WebhookTestResult {
  testId: string;
  nameAr: string;
  expectedOutcome: string;
  actualStatus: number;
  errorCode: string | null;
  passed: boolean;
  details: string;
}

const N8N_HMAC_SIGNING_SNIPPET = `// n8n Code Node (JavaScript) — Generate Canonical HMAC-SHA256 Headers for NEXORA
const crypto = require('crypto');

const secret = $env.N8N_WEBHOOK_SECRET; // Stored securely in n8n Environment Variables
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = 'n8n_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');

const bodyObject = {
  idempotency_key: 'idem_' + $execution.id,
  agent_id: 'economic_news_agent',
  payload: $input.first().json
};

// Exact serialized JSON body
const rawBody = JSON.stringify(bodyObject);

// Canonical signing string: "<timestamp>.<nonce>.<rawBody>"
const canonicalString = \`\${timestamp}.\${nonce}.\${rawBody}\`;
const signature = crypto
  .createHmac('sha256', secret)
  .update(canonicalString, 'utf8')
  .digest('hex');

return [{
  json: {
    rawBody,
    headers: {
      'Content-Type': 'application/json',
      'X-NEXORA-Timestamp': timestamp,
      'X-NEXORA-Nonce': nonce,
      'X-NEXORA-Signature': signature
    }
  }
}];`;

export const TabN8nIntegration: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRunningSuite, setIsRunningSuite] = useState<boolean>(false);
  const [suiteResults, setSuiteResults] = useState<WebhookTestResult[] | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadN8nJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(N8N_WORKFLOW_TEMPLATE, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'nexora_master_n8n_workflow.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRunWebhookSecuritySuite = async () => {
    setIsRunningSuite(true);
    try {
      const res = await fetch('/api/n8n/test-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setSuiteResults(data.results);
      }
    } catch (err) {
      console.error('Webhook test suite error:', err);
    } finally {
      setIsRunningSuite(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold mb-2">
            <Lock className="w-3.5 h-3.5" />
            تأمين تكامل n8n عبر توقيع HMAC-SHA256 ومنع هجمات الإعادة (Replay Protection)
          </div>
          <h2 className="text-2xl font-black text-white">
            عقد التكامل الخلفي الآمن مع n8n وتيليجرام و Notion
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            يوقّع جسم الطلب الخام مع الطابع الزمني والـ Nonce عبر <code className="text-amber-300">HMAC-SHA256</code> ويقارن التواقيع بزمن ثابت (<code className="text-emerald-300">crypto.timingSafeEqual</code>) دون كشف أي أسرار في المتصفح.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(JSON.stringify(N8N_WORKFLOW_TEMPLATE, null, 2), 'n8n_full')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            {copiedKey === 'n8n_full' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            نسخ JSON المخطط
          </button>
          <button
            onClick={downloadN8nJson}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-lg shadow-sky-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            تحميل ملف n8n.json
          </button>
        </div>
      </div>

      {/* Interactive Webhook Security Acceptance Test Runner (7 Tests) */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>مختبر اختبارات القبول الأمنية لـ Webhook n8n (7 حالات اختبار حية)</span>
            </h3>
            <p className="text-xs text-slate-400">
              يختبر فعلياً: الطلب الموقّع الصحيح، التلاعب بجسم الطلب، التوقيع الخاطئ، انتهاء صلاحية الطابع الزمني، إعادة استخدام الـ Nonce، منع تكرار النشر، وغياب المصادقة.
            </p>
          </div>
          <button
            onClick={handleRunWebhookSecuritySuite}
            disabled={isRunningSuite}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isRunningSuite ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري تنفيذ الاختبارات الـ 7...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>تشغيل اختبارات أمان Webhook الـ 7</span>
              </>
            )}
          </button>
        </div>

        {suiteResults && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 text-xs">
            <table className="w-full text-right">
              <thead className="bg-slate-800 text-slate-300 font-semibold border-b border-slate-700">
                <tr>
                  <th className="p-3">حالة الاختبار الأمني</th>
                  <th className="p-3">السلوك المتوقع</th>
                  <th className="p-3">كود الاستجابة الفعلي</th>
                  <th className="p-3">التفاصيل الهندسية</th>
                  <th className="p-3">النتيجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/60 text-slate-300">
                {suiteResults.map((r) => (
                  <tr key={r.testId}>
                    <td className="p-3 font-semibold text-white">{r.nameAr}</td>
                    <td className="p-3 font-mono text-[11px] text-amber-300">{r.expectedOutcome}</td>
                    <td className="p-3 font-mono text-[11px] text-sky-300">
                      HTTP {r.actualStatus} {r.errorCode ? `(${r.errorCode})` : ''}
                    </td>
                    <td className="p-3 text-slate-400">{r.details}</td>
                    <td className="p-3">
                      {r.passed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[11px] border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-[11px] border border-rose-500/30">
                          <XCircle className="w-3.5 h-3.5" /> FAIL
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Canonical HMAC-SHA256 Signing Guide & n8n Code Snippet */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-sm text-white">
              دليل التوقيع القياسي في n8n (Canonical HMAC-SHA256 Signing Format)
            </h3>
            <p className="text-xs text-slate-400">
              يُحظر تعريض خادم n8n المحلي للإنترنت العام مباشرة؛ يتصل n8n بالخادم عبر HTTPS موقّع بالترويسات الثلاث التالية:
            </p>
          </div>
          <button
            onClick={() => handleCopy(N8N_HMAC_SIGNING_SNIPPET, 'hmac_snippet')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            {copiedKey === 'hmac_snippet' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            نسخ كود التوقيع لـ n8n
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-amber-300 font-bold block">X-NEXORA-Timestamp</span>
            <span className="text-slate-400 font-sans text-[11px]">
              الطابع الزمني بالثواني (Unix Epoch). يرفض الخادم أي طلب يتجاوز فارق ±300 ثانية (5 دقائق).
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-sky-300 font-bold block">X-NEXORA-Nonce</span>
            <span className="text-slate-400 font-sans text-[11px]">
              معرف عشوائي فريد لكل طلب؛ يُحفظ في جدول <code className="text-slate-200">webhook_nonces</code> لمنع Replay Attacks.
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-emerald-300 font-bold block">X-NEXORA-Signature</span>
            <span className="text-slate-400 font-sans text-[11px]">
              توقيع <code className="text-slate-200">HMAC_SHA256(secret, timestamp + "." + nonce + "." + rawBody)</code>.
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed dir-ltr text-left">
          <pre>{N8N_HMAC_SIGNING_SNIPPET}</pre>
        </div>
      </div>

      {/* 3 Steps Pipeline Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sky-400">
            <Layers className="w-5 h-5" />
            <h3 className="font-bold text-white text-sm">1. طريقة استيراد مخطط n8n</h3>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 pr-2">
            <li>افتح لوحة تحكم n8n الخاصة بك خلف الشبكة الخاصة أو VPN.</li>
            <li>انقر على قائمة العمليات واختر <strong className="text-white">Import from JSON</strong>.</li>
            <li>ألصق كود الـ JSON المنسوخ وأضف عقدة الكود أعلاه لتوليد توقيع HMAC-SHA256.</li>
            <li>عيّن <code className="bg-slate-800 px-1 rounded text-amber-300">N8N_WEBHOOK_SECRET</code> في بيئة الخادم فقط.</li>
          </ol>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Bot className="w-5 h-5" />
            <h3 className="font-bold text-white text-sm">2. إعداد بوت تيليجرام للاعتماد البشري</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            <li>أنشئ بوتاً عبر <strong className="text-sky-300">@BotFather</strong> واحفظ الـ <code className="bg-slate-800 px-1 text-slate-300">Bot Token</code> في متغيرات البيئة الخلفية.</li>
            <li>أنشئ مجموعة خاصة للمحررين (Editorial Review Group) وأضف البوت فيها.</li>
            <li>يرسل n8n كل مسودة إخبارية مع أزرار اعتماد تستدعي <code className="text-amber-300">/api/executions/:runId/approval</code>.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <Database className="w-5 h-5" />
            <h3 className="font-bold text-white text-sm">3. هيكلة قاعدة بيانات Notion</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li>أنشئ قاعدة بيانات باسم: <strong className="text-white">NEXORA Research Logs</strong></li>
            <li>الخصائص الإلزامية: <code className="text-amber-300">Run ID</code>, <code className="text-sky-300">Agent</code>, <code className="text-emerald-300">Status</code>, <code className="text-rose-300">Approval</code>, <code className="text-slate-300">Content Hash</code>.</li>
          </ul>
        </div>
      </div>

      {/* JSON Viewer */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Workflow className="w-4 h-4 text-sky-400" />
            معاينة كود مخطط سير العمل n8n (Master Workflow JSON):
          </h3>
          <span className="text-xs font-mono text-slate-400">6 Connected Nodes</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-sky-200 overflow-x-auto max-h-80 leading-relaxed">
          <pre>{JSON.stringify(N8N_WORKFLOW_TEMPLATE, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};
