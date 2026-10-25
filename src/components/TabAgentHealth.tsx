import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity, Cpu, Coins, Clock, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

interface AgentHealthItem {
  agent_id: string;
  status: 'HEALTHY' | 'DEGRADED' | 'ERROR' | 'IDLE';
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  success_rate: number;
  avg_latency_ms: number;
  last_successful_run: string | null;
  last_error: string | null;
  total_tokens: number;
  estimated_cost_usd: number;
  model_used: string;
  last_validation: string;
}

export const TabAgentHealth: React.FC = () => {
  const [agents, setAgents] = useState<AgentHealthItem[]>([]);
  const [globalStats, setGlobalStats] = useState({ total_executions: 0, total_tokens: 0, total_cost_usd: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTelemetry = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/telemetry/metrics');
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents);
        setGlobalStats(data.global_stats);
      }
    } catch (err) {
      console.warn('Failed to fetch telemetry metrics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-2">
            <Activity className="w-3.5 h-3.5" />
            لوحة صحة الوكلاء والتحليلات الحية (Agent Health Dashboard)
          </div>
          <h2 className="text-2xl font-black text-white">
            مراقبة الأداء، زمن الاستجابة، والتكلفة للوكلاء الستة
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            بيانات حية من ذاكرة الخادم المركزي تراقب معدلات النجاح، أخطاء API، والتحقق من المخططات لكل وكيل.
          </p>
        </div>

        <button
          onClick={fetchTelemetry}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer border border-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث المقاييس</span>
        </button>
      </div>

      {/* Global Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">إجمالي التشغيلات الناجحة</span>
          <div className="text-3xl font-black font-mono text-emerald-400">{globalStats.total_executions}</div>
          <span className="text-[10px] text-slate-400">منذ بدء جلسة الخادم الحالية</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">إجمالي الرموز المستهلكة (Tokens)</span>
          <div className="text-3xl font-black font-mono text-indigo-300">{globalStats.total_tokens.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400">مدخلات + مخرجات عبر Gemini API</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">التكلفة التقديرية التشغيلية (USD)</span>
          <div className="text-3xl font-black font-mono text-amber-400">${globalStats.total_cost_usd.toFixed(4)}</div>
          <span className="text-[10px] text-slate-400">وفورات هائلة عبر نماذج Flash</span>
        </div>
      </div>

      {/* Agents Table / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((ag) => {
          const isHealthy = ag.status === 'HEALTHY';
          const isIdle = ag.status === 'IDLE';
          return (
            <div key={ag.agent_id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-amber-300 font-semibold">{ag.agent_id}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                      isHealthy
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : isIdle
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {ag.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block font-sans">معدل النجاح</span>
                    <span className="text-emerald-400 font-bold">{ag.success_rate}%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block font-sans">متوسط الاستجابة</span>
                    <span className="text-indigo-300 font-bold">{ag.avg_latency_ms} ms</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">النموذج المستخدم:</span>
                    <span className="font-mono text-sky-300">{ag.model_used}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">آخر نجاح:</span>
                    <span className="font-mono text-slate-200">{ag.last_successful_run || 'لم يتم التشغيل بعد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الرموز المستهلكة:</span>
                    <span className="font-mono text-amber-300">{ag.total_tokens.toLocaleString()}</span>
                  </div>
                </div>

                {ag.last_error && (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-[11px] text-rose-300">
                    <span className="font-semibold block mb-0.5">آخر خطأ مسجل:</span>
                    <span className="font-mono truncate block">{ag.last_error}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>التكلفة: ${ag.estimated_cost_usd.toFixed(4)}</span>
                <span className="text-emerald-400">{ag.last_validation}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
