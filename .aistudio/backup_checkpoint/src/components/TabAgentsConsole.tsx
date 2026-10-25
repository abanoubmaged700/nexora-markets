import React, { useState } from 'react';
import { NEXORA_AGENTS } from '../data/agentDefinitions';
import { AgentDefinition } from '../types/agents';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Terminal, 
  Code2, 
  Workflow, 
  FileCheck2, 
  Coins, 
  AlertOctagon, 
  Wrench,
  Sparkles
} from 'lucide-react';

export const TabAgentsConsole: React.FC = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('economic_news_agent');
  const [activeSubTab, setActiveSubTab] = useState<'prompt' | 'schema' | 'tools' | 'boundaries' | 'n8n' | 'tests'>('prompt');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedAgent = NEXORA_AGENTS.find((a) => a.id === selectedAgentId) || NEXORA_AGENTS[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            مركز تصميم وتعريف الوكلاء الستة (The 6 Production Agents)
          </div>
          <h2 className="text-2xl font-black text-white">
            مواصفات طبقة الذكاء والمطالبات المهيكلة
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تم إعطاء الأولوية القصوى لوكيل الأخبار الاقتصادية (P1)، يليه وكلاء التحليل الفني، الرادار، المحتوى، حارس المخاطر، والتوثيق.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono">
            Structured Outputs Enforced
          </span>
        </div>
      </div>

      {/* Agents Selection Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {NEXORA_AGENTS.map((agent) => {
          const isSelected = agent.id === selectedAgentId;
          const isP1 = agent.priority === 1;
          return (
            <button
              key={agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              className={`p-3.5 rounded-xl text-right transition-all border flex flex-col justify-between cursor-pointer relative ${
                isSelected
                  ? 'bg-gradient-to-b from-amber-500/20 to-slate-900 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              }`}
            >
              {isP1 && (
                <span className="absolute -top-2 -left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-slate-950 font-mono">
                  P1 Priority
                </span>
              )}
              <div className="space-y-1">
                <div className="text-[10px] font-mono text-amber-400 font-semibold">
                  0{agent.priority} / {agent.nameEn}
                </div>
                <div className="font-bold text-xs sm:text-sm text-slate-100 line-clamp-1">
                  {agent.nameAr}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-mono text-indigo-300">{agent.recommendedModel}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Agent Detailed View */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 md:p-8 space-y-6">
        {/* Agent Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                {selectedAgent.badge}
              </span>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                ID: {selectedAgent.id}
              </span>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 border border-indigo-700/40">
                Model: {selectedAgent.recommendedModel} (Temp: {selectedAgent.temperature})
              </span>
            </div>
            <h3 className="text-2xl font-black text-white">{selectedAgent.nameAr}</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {selectedAgent.descriptionAr}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => handleCopy(selectedAgent.systemPrompt, 'sys_prompt')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-medium transition cursor-pointer"
            >
              {copiedKey === 'sys_prompt' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              نسخ System Prompt
            </button>
          </div>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'prompt', label: 'التعليمات النظامية (System Instructions)', icon: Terminal },
            { id: 'boundaries', label: 'الحدود ومنع الهلوسة وقواعد المصادر', icon: AlertOctagon },
            { id: 'schema', label: 'المخطط المهيكل (JSON Output Schema)', icon: Code2 },
            { id: 'tools', label: 'الأدوات والدوال (Tools & Functions)', icon: Wrench },
            { id: 'n8n', label: 'التكامل مع n8n وتيليجرام', icon: Workflow },
            { id: 'tests', label: 'حالات الاختبار وتقييم الأداء', icon: FileCheck2 },
          ].map((st) => {
            const Icon = st.icon;
            const isSubActive = activeSubTab === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setActiveSubTab(st.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSubActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSubActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: System Prompt */}
        {activeSubTab === 'prompt' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>نص المطالبة النظامية المعتمدة لـ Google AI Studio و Gemini API:</span>
              <span className="font-mono text-indigo-300">English Prompt Core + Arabic Output Directives</span>
            </div>
            <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-96 leading-relaxed">
              <pre className="whitespace-pre-wrap">{selectedAgent.systemPrompt}</pre>
            </div>
          </div>
        )}

        {/* Tab 2: Boundaries & Hallucination Prevention */}
        {activeSubTab === 'boundaries' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Specific Boundaries */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
              <h4 className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" />
                الحدود والمسؤوليات غير القابلة للتفاوض
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {selectedAgent.specificBoundaries.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Source Validation Rules */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
              <h4 className="font-bold text-sm text-sky-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                قواعد تدقيق المصادر (Source Validation)
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {selectedAgent.sourceValidationRules.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-sky-400 font-bold">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hallucination Prevention */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
              <h4 className="font-bold text-sm text-rose-400 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" />
                آليات منع الهلوسة (Anti-Hallucination)
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {selectedAgent.hallucinationPreventionRules.map((h, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tab 3: JSON Output Schema */}
        {activeSubTab === 'schema' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>المخطط المهيكل الإلزامي (Strict Structured Output Schema):</span>
              <button
                onClick={() => handleCopy(JSON.stringify(selectedAgent.outputSchemaJson, null, 2), 'schema_json')}
                className="flex items-center gap-1 text-amber-300 hover:text-amber-200 cursor-pointer"
              >
                {copiedKey === 'schema_json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                نسخ المخطط
              </button>
            </div>
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-amber-200 overflow-x-auto max-h-96">
              <pre>{JSON.stringify(selectedAgent.outputSchemaJson, null, 2)}</pre>
            </div>

            {/* Required Input Parameters Table */}
            <div className="pt-4 space-y-2">
              <h4 className="font-bold text-sm text-white">البيانات المدخلة الإلزامية (Required Input Data):</h4>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-800/60 text-slate-300 font-semibold border-b border-slate-700">
                    <tr>
                      <th className="p-2.5 font-mono">الحقل (Field)</th>
                      <th className="p-2.5">النوع (Type)</th>
                      <th className="p-2.5">إلزامي؟</th>
                      <th className="p-2.5">الوصف والمتطلبات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-sans">
                    {selectedAgent.requiredInputData.map((inp, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-mono text-amber-300">{inp.field}</td>
                        <td className="p-2.5 font-mono text-slate-400">{inp.type}</td>
                        <td className="p-2.5 text-emerald-400">{inp.required ? 'نعم' : 'اختياري'}</td>
                        <td className="p-2.5">{inp.descriptionAr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Tools & Functions */}
        {activeSubTab === 'tools' && (
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-white">الدوال والأدوات المعرفة (Tool / Function Declarations):</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedAgent.toolsDefinitions.map((tool, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      {tool.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                      Function Tool
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{tool.descriptionAr}</p>
                  <div className="p-2.5 rounded bg-slate-950 font-mono text-[11px] text-slate-400 overflow-x-auto">
                    <pre>{JSON.stringify(tool.parameters, null, 2)}</pre>
                  </div>
                </div>
              ))}
            </div>

            {/* Error Handling & Retry Strategy */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 mt-4 space-y-2">
              <h5 className="font-bold text-xs text-slate-200">استراتيجية الأخطاء وإعادة المحاولة (Retry Strategy):</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-900/80">
                  <span className="text-slate-400 block text-[10px]">الاستراتيجية</span>
                  <span className="text-slate-200 font-medium">{selectedAgent.errorHandlingAndRetry.strategy}</span>
                </div>
                <div className="p-2.5 rounded bg-slate-900/80">
                  <span className="text-slate-400 block text-[10px]">الحد الأقصى للمحاولات</span>
                  <span className="text-amber-400 font-mono font-bold">{selectedAgent.errorHandlingAndRetry.maxRetries} محاولات</span>
                </div>
                <div className="p-2.5 rounded bg-slate-900/80">
                  <span className="text-slate-400 block text-[10px]">معادلة التراجع (Backoff)</span>
                  <span className="text-indigo-300 font-mono text-[11px]">{selectedAgent.errorHandlingAndRetry.backoffFormula}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: n8n Integration */}
        {activeSubTab === 'n8n' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/40 space-y-2">
              <h4 className="font-bold text-sm text-sky-300 flex items-center gap-1.5">
                <Workflow className="w-4 h-4" />
                تكامل الوكيل داخل خط معالجة n8n:
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedAgent.n8nIntegration.stepExplanationAr}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">وجهة تيليجرام:</span>
                  <span className="block text-sky-200 font-mono">{selectedAgent.n8nIntegration.telegramDestination}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">قاعدة بيانات Notion:</span>
                  <span className="block text-sky-200 font-mono">{selectedAgent.n8nIntegration.notionDatabase}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>كود معالجة n8n Code Node الجاهز:</span>
                <button
                  onClick={() => handleCopy(selectedAgent.n8nIntegration.codeNodeSnippet, 'n8n_code')}
                  className="flex items-center gap-1 text-amber-300 hover:text-amber-200 cursor-pointer"
                >
                  {copiedKey === 'n8n_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  نسخ الكود
                </button>
              </div>
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-sky-200 overflow-x-auto max-h-80">
                <pre>{selectedAgent.n8nIntegration.codeNodeSnippet}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Test Cases */}
        {activeSubTab === 'tests' && (
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-white">مجموعات الاختبار المعتمدة ومعايير التقييم:</h4>
            {selectedAgent.testCases.map((tc, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs sm:text-sm text-amber-300">{tc.title}</h5>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-emerald-400 font-mono">
                    Golden Benchmark
                  </span>
                </div>
                <div className="p-3 rounded bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto">
                  <pre>{JSON.stringify(tc.input, null, 2)}</pre>
                </div>
                <p className="text-xs text-slate-300">
                  <strong className="text-slate-200">السلوك المتوقع:</strong> {tc.expectedBehavior}
                </p>
                <div className="pt-2 border-t border-slate-700/60">
                  <span className="text-xs font-semibold text-emerald-400 block mb-1">شروط اجتياز الاختبار:</span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                    {tc.passCriteria.map((crit, cIdx) => (
                      <li key={cIdx}>{crit}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
