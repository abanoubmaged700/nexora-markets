import React, { useState } from 'react';
import { CODEX_INTEGRATION_HANDOFF } from '../data/architectureDocs';
import { NEXORA_AGENTS } from '../data/agentDefinitions';
import { 
  Terminal, 
  Copy, 
  Check, 
  FolderTree, 
  ShieldCheck, 
  Download, 
  FileCode2, 
  FileText,
  Sparkles
} from 'lucide-react';

export const TabCodexHandoff: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedPromptAgentId, setSelectedPromptAgentId] = useState<string>('economic_news_agent');

  const selectedAgent = NEXORA_AGENTS.find((a) => a.id === selectedPromptAgentId) || NEXORA_AGENTS[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadAllPromptsZip = () => {
    // Generate concatenated markdown package
    let fullDoc = `# NEXORA Markets - Codex Agent Prompts Package\n\n`;
    NEXORA_AGENTS.forEach((agent) => {
      fullDoc += `## Agent 0${agent.priority}: ${agent.nameEn} (${agent.nameAr})\n`;
      fullDoc += `ID: ${agent.id}\nModel: ${agent.recommendedModel}\n\n`;
      fullDoc += `### System Instructions:\n\`\`\`\n${agent.systemPrompt}\n\`\`\`\n\n`;
      fullDoc += `### Structured Output Schema:\n\`\`\`json\n${JSON.stringify(agent.outputSchemaJson, null, 2)}\n\`\`\`\n\n---\n\n`;
    });

    const blob = new Blob([fullDoc], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NEXORA_Codex_Prompts_Pack.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Intro Header */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-2">
            <Terminal className="w-3.5 h-3.5" />
            حزمة تسليم مهندسي Codex والمطورين (Engineering Handoff)
          </div>
          <h2 className="text-2xl font-black text-white">
            ملفات التهيئة والمطالبات النظامية لنظام Codex البرمجي
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            توثيق متكامل للهيكل الشجري للمشروع، ومطالبات الوكلاء الستة بصيغة Markdown، وقواعد الأمان لمهندسي البرمجيات.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadAllPromptsZip}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            تحميل حزمة المطالبات (Markdown)
          </button>
        </div>
      </div>

      {/* Directory Structure & Architecture Principles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Repo Structure (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-emerald-400" />
              الهيكل المعماري المقترح لمستودع الكود (Repository Tree):
            </h3>
            <button
              onClick={() => handleCopy(CODEX_INTEGRATION_HANDOFF.repositoryStructure, 'repo_tree')}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'repo_tree' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              نسخ
            </button>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-96 leading-relaxed">
            <pre>{CODEX_INTEGRATION_HANDOFF.repositoryStructure}</pre>
          </div>
        </div>

        {/* Core Principles & Checklist (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Principles */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-amber-400" />
              مبادئ التطوير لـ Codex:
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              {CODEX_INTEGRATION_HANDOFF.architecturePrinciples.map((p, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Security Checklist */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              قائمة التحقق الأمني الإلزامية:
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              {CODEX_INTEGRATION_HANDOFF.securityChecklist.map((c, idx) => (
                <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-sky-400 font-bold">✓</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Individual Agent Prompts Inspector for Codex */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            معاينة واستخراج مطالبات الوكلاء لـ Codex:
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedPromptAgentId}
              onChange={(e) => setSelectedPromptAgentId(e.target.value)}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-amber-300 focus:outline-none"
            >
              {NEXORA_AGENTS.map((a) => (
                <option key={a.id} value={a.id}>
                  0{a.priority} - {a.nameEn}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleCopy(selectedAgent.systemPrompt, 'single_prompt')}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              {copiedKey === 'single_prompt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              نسخ المطالبة
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-80 leading-relaxed">
          <pre className="whitespace-pre-wrap">{selectedAgent.systemPrompt}</pre>
        </div>
      </div>
    </div>
  );
};
