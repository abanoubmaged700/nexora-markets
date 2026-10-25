import React, { useEffect, useState } from 'react';
import { Terminal, ShieldCheck, CheckCircle2, XCircle, Clock, Copy, Check, Filter, Search } from 'lucide-react';

export const TabExecutionLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [filterAgent, setFilterAgent] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedRunId, setCopiedRunId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/telemetry/metrics');
      const data = await res.json();
      if (data.success) {
        setLogs(data.recent_logs || []);
      }
    } catch (err) {
      console.warn('Failed to fetch execution logs', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApproval = async (runId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch(`/api/executions/${runId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, editorId: 'Editor_Lead_Admin' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to update approval status', err);
    }
  };

  const handleCopy = (runId: string) => {
    navigator.clipboard.writeText(runId);
    setCopiedRunId(runId);
    setTimeout(() => setCopiedRunId(null), 2000);
  };

  const filteredLogs = logs.filter((l) => {
    const matchAgent = filterAgent === 'ALL' || l.agent_id === filterAgent;
    const matchSearch = searchQuery === '' || l.run_id.includes(searchQuery) || l.agent_id.includes(searchQuery);
    return matchAgent && matchSearch;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-2">
            <Terminal className="w-3.5 h-3.5" />
            سجل التنفيذ المركزي (Central Execution Log & HITL Gate)
          </div>
          <h2 className="text-2xl font-black text-white">
            مراجعة واعتماد المخرجات المالية وسجلات التشغيل
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            سجل موحد لجميع العمليات متضمنة run_id، زمن الاستجابة، حالة التحقق، بوابات الاعتماد البشري، وتفاصيل الأخطاء.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-sans"
            >
              <option value="ALL">جميع الوكلاء</option>
              <option value="economic_news_agent">Economic News Agent</option>
              <option value="market_analysis_agent">Market Analysis Agent</option>
              <option value="stock_radar_agent">Stock Radar Agent</option>
              <option value="content_creator_agent">Content Creator Agent</option>
              <option value="risk_guardian_agent">Risk Guardian Agent</option>
              <option value="business_portfolio_agent">Business & Portfolio Agent</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بـ run_id..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none placeholder:text-slate-500 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white">السجلات النشطة في الذاكرة ({filteredLogs.length} عملية):</h3>
          <span className="text-xs font-mono text-slate-400">Idempotency & Audit Trail</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 text-xs">
          <table className="w-full text-right">
            <thead className="bg-slate-800 text-slate-300 font-semibold border-b border-slate-700">
              <tr>
                <th className="p-3 font-mono">Run ID</th>
                <th className="p-3">الوكيل (Agent ID)</th>
                <th className="p-3 font-mono">المصدر / النموذج</th>
                <th className="p-3">الزمن (Latency)</th>
                <th className="p-3">حالة التحقق</th>
                <th className="p-3">الاعتماد البشري (HITL)</th>
                <th className="p-3">الإجراء التحريري</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40 text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    لا توجد سجلات تنفيذ مطابقة في الذاكرة حالياً. قم بتشغيل بعض الوكلاء من تبويب "المختبر الحي".
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isApproved = log.human_approval_status === 'APPROVED';
                  const isRejected = log.human_approval_status === 'REJECTED' || log.human_approval_status === 'BLOCKED_BY_RISK_RULE';
                  return (
                    <tr key={log.run_id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono text-amber-300 flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(log.run_id)}
                          className="hover:text-amber-200 cursor-pointer"
                          title="نسخ run_id"
                        >
                          {copiedRunId === log.run_id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <span>{log.run_id}</span>
                      </td>
                      <td className="p-3 font-mono font-semibold text-white">{log.agent_id}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        <div>{log.source}</div>
                        <div className="text-indigo-300">{log.model_used}</div>
                      </td>
                      <td className="p-3 font-mono text-indigo-300">{log.latency_ms} ms</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          log.validation_status === 'VALIDATED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {log.validation_status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isRejected
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {log.human_approval_status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApproval(log.run_id, 'APPROVE')}
                            disabled={isApproved}
                            className="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-medium transition cursor-pointer disabled:opacity-40"
                          >
                            اعتماد
                          </button>
                          <button
                            onClick={() => handleApproval(log.run_id, 'REJECT')}
                            disabled={isRejected}
                            className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-[11px] font-medium transition cursor-pointer disabled:opacity-40"
                          >
                            رفض
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
