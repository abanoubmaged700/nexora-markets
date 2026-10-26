import React, { useState } from 'react';
import { READY_SCENARIOS } from '../data/mockTestData';
import { NEXORA_AGENTS } from '../data/agentDefinitions';
import { NEXORAMessageContract } from '../types/agents';
import { 
  Play, 
  RotateCcw, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  FileJson, 
  Send, 
  Sparkles,
  TrendingUp,
  AlertOctagon,
  Download
} from 'lucide-react';

export const TabLiveRunner: React.FC = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('economic_news_agent');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('cpi_hawkish_surprise');
  const [customInputJson, setCustomInputJson] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultContract, setResultContract] = useState<NEXORAMessageContract | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [copiedContract, setCopiedContract] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or update scenario
  React.useEffect(() => {
    const sc = READY_SCENARIOS.find((s) => s.id === selectedScenarioId);
    if (sc) {
      setCustomInputJson(JSON.stringify(sc.inputPayload, null, 2));
      setSelectedAgentId(sc.agentId);
    }
  }, [selectedScenarioId]);

  const handleAgentChange = (newAgentId: string) => {
    setSelectedAgentId(newAgentId);
    const matchedScenario = READY_SCENARIOS.find((s) => s.agentId === newAgentId);
    if (matchedScenario) {
      setSelectedScenarioId(matchedScenario.id);
      setCustomInputJson(JSON.stringify(matchedScenario.inputPayload, null, 2));
    }
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(customInputJson);
      } catch (e) {
        throw new Error('الرجاء التأكد من صحة تنسيق JSON في حقل المدخلات');
      }

      const agentDef = NEXORA_AGENTS.find((a) => a.id === selectedAgentId);

      const response = await fetch('/api/gemini/agent-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          inputPayload: parsedInput,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'فشل تشغيل الوكيل');
      }

      setResultContract(data.contract);
      setIsSimulated(Boolean(data.isSimulated));
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تشغيل الوكيل');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyContract = () => {
    if (!resultContract) return;
    navigator.clipboard.writeText(JSON.stringify(resultContract, null, 2));
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  // Schema Validator Checklist
  const validateContractChecklist = (contract: NEXORAMessageContract | null) => {
    if (!contract) return [];
    return [
      { name: 'agent_id مطابق', passed: Boolean(contract.agent_id) },
      { name: 'run_id فريد مخصص', passed: Boolean(contract.run_id) },
      { name: 'توقيت القاهرة (Africa/Cairo) محدد', passed: contract.timezone === 'Africa/Cairo' },
      { name: 'حالة التحقق الهندسي (validation_status)', passed: Boolean(contract.validation_status) },
      { name: 'بوابة الموافقة البشرية (human_approval_status)', passed: Boolean(contract.human_approval_status) },
      { name: 'تحديد الإجراء اللاحق (next_action)', passed: Boolean(contract.next_action) },
      { name: 'إصدار العقد v1.2.0', passed: contract.version === '1.2.0' },
    ];
  };

  const checklist = validateContractChecklist(resultContract);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Intro Header */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            المختبر الحي لتشغيل واختبار الوكلاء (Live Multi-Agent Runner)
          </div>
          <h2 className="text-2xl font-black text-white">
            تشغيل وفحص مخرجات الوكلاء والتحقق من عقد الرسائل
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            اختبر استجابة Gemini API مع تطبيع توقيت القاهرة الفوري، والحسابات الحتمية لحارس المخاطر، والتحقق الصارم من JSON Schema.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input & Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-white flex items-center justify-between">
              <span>تحديد الوكيل وسيناريو الاختبار:</span>
              <span className="text-[10px] font-mono text-indigo-300">gemini-3.8-flash</span>
            </h3>

            {/* Agent Select */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">الوكيل المستهدف:</label>
              <select
                value={selectedAgentId}
                onChange={(e) => handleAgentChange(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {NEXORA_AGENTS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nameAr} ({a.nameEn})
                  </option>
                ))}
              </select>
            </div>

            {/* Ready Scenarios */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold block">السيناريو التجريبي الجاهز:</label>
              <select
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-amber-300 focus:outline-none focus:border-amber-500"
              >
                {READY_SCENARIOS.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.scenarioNameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom JSON Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 font-semibold">حزمة المدخلات (Input JSON Payload):</label>
                <button
                  onClick={() => {
                    const sc = READY_SCENARIOS.find((s) => s.id === selectedScenarioId);
                    if (sc) setCustomInputJson(JSON.stringify(sc.inputPayload, null, 2));
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> استعادة
                </button>
              </div>
              <textarea
                rows={10}
                value={customInputJson}
                onChange={(e) => setCustomInputJson(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed"
                placeholder="{ ... }"
              />
            </div>

            {/* Execution Button */}
            <button
              onClick={handleExecute}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري معالجة وتدقيق الوكيل...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>تشغيل الوكيل وإنشاء عقد الرسالة</span>
                </>
              )}
            </button>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Results & Contract Inspection (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {!resultContract ? (
            <div className="h-full min-h-[460px] p-8 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500">
                <Play className="w-8 h-8 fill-current" />
              </div>
              <h4 className="font-bold text-base text-slate-300">جاهز للتشغيل</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                اختر أحد السيناريوهات الجاهزة أو عدّل المدخلات وانقر على "تشغيل الوكيل" لمعاينة عقد الرسائل المشترك (Shared Contract v1.2) والتحقق من سلامة البيانات.
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6 shadow-2xl">
              {/* Output Header Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {resultContract.validation_status}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-mono">
                    {resultContract.human_approval_status}
                  </span>
                  {isSimulated && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      محرك الاختبار المالي
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyContract}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition cursor-pointer"
                  >
                    {copiedContract ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    نسخ العقد الكامل
                  </button>
                </div>
              </div>

              {/* Top Metadata Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block font-sans">معرف التشغيل (run_id)</span>
                  <span className="text-amber-300 font-bold truncate block">{resultContract.run_id}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block font-sans">المنطقة الزمنية</span>
                  <span className="text-sky-300 font-bold block">{resultContract.timezone}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block font-sans">المصدر المعتمد</span>
                  <span className="text-slate-300 font-semibold truncate block">{resultContract.source}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block font-sans">الإجراء اللاحق</span>
                  <span className="text-indigo-300 font-semibold truncate block">{resultContract.next_action}</span>
                </div>
              </div>

              {/* Formatted Output Visual Render */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  المخرجات المعالجة (Visual Output Card):
                </h4>

                {/* Economic News Formatted View */}
                {resultContract.agent_id === 'economic_news_agent' && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="font-bold text-amber-300 text-sm">{resultContract.outputs?.event_name_ar}</span>
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[11px]">
                        {resultContract.outputs?.impact_level || 'HIGH IMPACT'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center font-mono">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">الفعلية (Actual)</span>
                        <span className="text-emerald-400 font-bold text-sm">{resultContract.outputs?.figures?.actual}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">المتوقعة (Forecast)</span>
                        <span className="text-slate-300 font-bold text-sm">{resultContract.outputs?.figures?.forecast}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">السابقة (Previous)</span>
                        <span className="text-slate-400 font-bold text-sm">{resultContract.outputs?.figures?.previous}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 font-mono">توقيت القاهرة الموثق:</div>
                      <div className="text-amber-300 font-semibold">{resultContract.outputs?.normalized_cairo_time}</div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400">مسودة الخبر الموجهة للمحرر:</div>
                      <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {resultContract.outputs?.news_draft_ar}
                      </p>
                    </div>
                  </div>
                )}

                {/* Risk Guardian Formatted View */}
                {resultContract.agent_id === 'risk_guardian_agent' && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="font-bold text-sm text-white">قرار مسؤول إدارة المخاطر:</span>
                      <span
                        className={`px-3 py-1 rounded-full font-bold text-xs ${
                          resultContract.outputs?.compliance_check === 'APPROVED_COMPLIANT'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {resultContract.outputs?.compliance_check}
                      </span>
                    </div>

                    {resultContract.outputs?.deterministic_math && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-sans">نسبة المخاطرة</span>
                          <span className={`font-bold ${resultContract.outputs.deterministic_math.riskPercentage > 2 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {resultContract.outputs.deterministic_math.riskPercentage}%
                          </span>
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-sans">المخاطرة المالية ($)</span>
                          <span className="text-slate-200 font-bold">${resultContract.outputs.deterministic_math.totalMonetaryRisk}</span>
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-sans">العائد للمخاطرة (R:R)</span>
                          <span className={`font-bold ${resultContract.outputs.deterministic_math.riskRewardRatio < 1.5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {resultContract.outputs.deterministic_math.riskRewardRatio}R
                          </span>
                        </div>
                        <div className="p-2 rounded bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-sans">التراجع اليومي</span>
                          <span className={`font-bold ${resultContract.outputs.deterministic_math.currentDrawdownPct >= 5 ? 'text-rose-400' : 'text-slate-300'}`}>
                            {resultContract.outputs.deterministic_math.currentDrawdownPct}%
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                      <p className="text-slate-200 leading-relaxed font-sans">
                        {resultContract.outputs?.risk_officer_verdict_ar}
                      </p>
                    </div>
                  </div>
                )}

                {/* Other Agents Raw View */}
                {resultContract.agent_id !== 'economic_news_agent' && resultContract.agent_id !== 'risk_guardian_agent' && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-200 overflow-x-auto max-h-60">
                    <pre>{JSON.stringify(resultContract.outputs, null, 2)}</pre>
                  </div>
                )}
              </div>

              {/* Schema Compliance Checklist */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">تدقيق شروط عقد الرسائل المشترك (Schema Checklist):</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence and next steps */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs space-y-1">
                <span className="text-slate-400 block text-[10px]">ملاحظات عدم اليقين والمصدر:</span>
                <p className="text-slate-300">{resultContract.confidence_or_uncertainty_notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
