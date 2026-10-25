import React, { useState } from 'react';
import { N8N_WORKFLOW_TEMPLATE } from '../data/architectureDocs';
import { 
  Workflow, 
  Copy, 
  Check, 
  Send, 
  Database, 
  Key, 
  Download, 
  ExternalLink,
  Bot,
  Layers,
  ArrowRight
} from 'lucide-react';

export const TabN8nIntegration: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadN8nJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(N8N_WORKFLOW_TEMPLATE, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'nexora_master_n8n_workflow.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold mb-2">
            <Workflow className="w-3.5 h-3.5" />
            حزمة تكامل الأتمتة السحابية عبر n8n (Production Orchestrator)
          </div>
          <h2 className="text-2xl font-black text-white">
            مخطط n8n الجاهز للاستيراد وبوابات المراجعة التحريرية
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            يربط بين خطوط إمداد البيانات (Webhooks)، وواجهة Gemini API، وأزرار اعتماد تيليجرام التفاعلية، وقواعد بيانات Notion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(JSON.stringify(N8N_WORKFLOW_TEMPLATE, null, 2), 'n8n_full')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            {copiedKey === 'n8n_full' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
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

      {/* 3 Steps Pipeline Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: n8n Workflow Blueprint */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sky-400">
            <Layers className="w-5 h-5" />
            <h3 className="font-bold text-white text-sm">1. طريقة استيراد مخطط n8n</h3>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 pr-2">
            <li>افتح لوحة تحكم n8n الخاصة بك (سواء كانت Self-hosted أو Cloud).</li>
            <li>انقر على قائمة العمليات واختر <strong className="text-white">Import from JSON</strong> أو اضغط <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">Ctrl + V</code> مباشرة.</li>
            <li>ألصق كود الـ JSON المنسوخ من هذا القسم.</li>
            <li>عيّن المتغيرات البيئية (Credentials) الموضحة بالأسفل لبوت تيليجرام و Notion ومفتاح Gemini API.</li>
          </ol>
        </div>

        {/* Step 2: Telegram Inline Approval */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Bot className="w-5 h-5" />
            <h3 className="font-bold text-white text-sm">2. إعداد بوت تيليجرام للاعتماد البشري</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            <li>أنشئ بوتاً عبر <strong className="text-sky-300">@BotFather</strong> واحصل على الـ <code className="bg-slate-800 px-1 text-slate-300">Bot Token</code>.</li>
            <li>أنشئ مجموعة خاصة للمحررين (Editorial Review Group) وأضف البوت فيها.</li>
            <li>استخرج معرّف المحادثة <code className="bg-slate-800 px-1 text-amber-300">TELEGRAM_EDITORIAL_CHAT_ID</code>.</li>
            <li>يرسل n8n كل مسودة إخبارية مع زر تفاعلي:
              <div className="mt-2 p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-center gap-2 text-[11px]">
                <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">✅ نشر فوري</span>
                <span className="px-2 py-1 rounded bg-rose-950 text-rose-300 border border-rose-800">❌ رفض وأرشفة</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Step 3: Notion Knowledge Base */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <Database className="w-5 h-5" />
            <h3 className="font-bold text-white text-sm">3. هيكلة قاعدة بيانات Notion</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li>أنشئ قاعدة بيانات باسم: <strong className="text-white">NEXORA Research Logs</strong></li>
            <li>الخصائص الإلزامية (Properties):
              <ul className="list-disc list-inside pr-3 mt-1 space-y-0.5 text-slate-400 text-[11px]">
                <li><code className="text-amber-300">Run ID</code> (Title)</li>
                <li><code className="text-sky-300">Agent</code> (Select: 6 Agents)</li>
                <li><code className="text-emerald-300">Status</code> (Status: Validated / Failed)</li>
                <li><code className="text-rose-300">Approval</code> (Select: Approved / Pending)</li>
                <li><code className="text-slate-300">Timestamp</code> (Date with Cairo Time)</li>
              </ul>
            </li>
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
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-sky-200 overflow-x-auto max-h-96 leading-relaxed">
          <pre>{JSON.stringify(N8N_WORKFLOW_TEMPLATE, null, 2)}</pre>
        </div>
      </div>

      {/* Environment Variables Reference Table */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-400" />
          متغيرات البيئة المطلوبة لخادم n8n (Environment Variables):
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-800 text-xs">
          <table className="w-full text-right">
            <thead className="bg-slate-800 text-slate-300 font-semibold border-b border-slate-700">
              <tr>
                <th className="p-3 font-mono">اسم المتغير (Key)</th>
                <th className="p-3">الوصف والوظيفة</th>
                <th className="p-3">حساسية الأمان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40 text-slate-300 font-mono">
              <tr>
                <td className="p-3 text-amber-300">NEXORA_APP_URL</td>
                <td className="p-3 font-sans">عنوان خادم تطبيق نكسورا المستضاف على Cloud Run أو VPS.</td>
                <td className="p-3 text-slate-400 font-sans">عام (Public / Internal)</td>
              </tr>
              <tr>
                <td className="p-3 text-amber-300">GEMINI_API_KEY</td>
                <td className="p-3 font-sans">مفتاح API الخاص بـ Google GenAI SDK (يُحفظ سراً على الخادم فقط).</td>
                <td className="p-3 text-rose-400 font-sans">سري للغاية (High Secret)</td>
              </tr>
              <tr>
                <td className="p-3 text-amber-300">TELEGRAM_BOT_TOKEN</td>
                <td className="p-3 font-sans">رمز التوثيق الخاص ببوت تيليجرام لنشر التنبيهات وبطاقات المراجعة.</td>
                <td className="p-3 text-rose-400 font-sans">سري للغاية (High Secret)</td>
              </tr>
              <tr>
                <td className="p-3 text-amber-300">TELEGRAM_EDITORIAL_CHAT_ID</td>
                <td className="p-3 font-sans">معرف محادثة غرفة المراجعة التحريرية المغلقة.</td>
                <td className="p-3 text-amber-300 font-sans">محمي (Internal)</td>
              </tr>
              <tr>
                <td className="p-3 text-amber-300">NOTION_INTELLIGENCE_DB_ID</td>
                <td className="p-3 font-sans">معرف قاعدة بيانات التوثيق والأبحاث في Notion.</td>
                <td className="p-3 text-amber-300 font-sans">محمي (Internal)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
