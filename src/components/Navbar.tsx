import React, { useEffect, useState } from 'react';
import { ShieldCheck, Clock, Cpu, Activity, Download, ExternalLink, Zap, Terminal, HeartPulse } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemStatus: { hasApiKey: boolean; cairoTime: string };
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, systemStatus }) => {
  const [cairoLiveTime, setCairoLiveTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const timeStr = new Intl.DateTimeFormat('ar-EG', {
          timeZone: 'Africa/Cairo',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date());
        setCairoLiveTime(timeStr);
      } catch (e) {
        setCairoLiveTime(new Date().toLocaleTimeString());
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'architecture', label: '1. الهندسة والموديلات', icon: Cpu },
    { id: 'agents', label: '2. مركز الوكلاء الستة', icon: ShieldCheck },
    { id: 'health', label: '3. صحة الوكلاء (Health)', icon: HeartPulse },
    { id: 'logs', label: '4. سجل التنفيذ المركزي (Logs)', icon: Terminal },
    { id: 'runner', label: '5. المختبر الحي', icon: Zap },
    { id: 'n8n', label: '6. تكامل n8n وتيليجرام', icon: Activity },
    { id: 'codex', label: '7. حزمة تسليم Codex', icon: ExternalLink },
    { id: 'testing', label: '8. خطة الاختبار', icon: Clock },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Branding */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
              <span className="font-extrabold text-2xl tracking-tighter text-slate-950 font-['JetBrains_Mono']">NX</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white font-['Plus_Jakarta_Sans']">NEXORA</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  MARKETS
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Hardened v1.2
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block font-medium">
                منظومة الوكلاء الأذكياء المتعددين للأبحاث المالية والتحليل الاقتصادي
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3">
            {/* Cairo Time Ticker */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
              <Clock className="w-4 h-4 text-amber-400 animate-spin-slow" />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-sans">توقيت القاهرة (Africa/Cairo)</div>
                <div className="font-mono font-bold text-amber-300 text-sm tracking-wider dir-ltr">
                  {cairoLiveTime || '15:30:00'}
                </div>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-ping"></div>
              <span className="text-slate-300 font-medium">جاهز للإنتاج الصارم</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
