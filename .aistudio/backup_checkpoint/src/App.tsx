/**
 * NEXORA Markets Multi-Agent AI System Workbench
 * Lead AI Systems Architect Platform
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TabArchitecture } from './components/TabArchitecture';
import { TabAgentsConsole } from './components/TabAgentsConsole';
import { TabLiveRunner } from './components/TabLiveRunner';
import { TabN8nIntegration } from './components/TabN8nIntegration';
import { TabCodexHandoff } from './components/TabCodexHandoff';
import { TabTestingEvaluation } from './components/TabTestingEvaluation';
import { ShieldCheck, Cpu, Terminal, ArrowUpRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('architecture');
  const [systemStatus, setSystemStatus] = useState<{ hasApiKey: boolean; cairoTime: string }>({
    hasApiKey: false,
    cairoTime: '',
  });

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setSystemStatus({
          hasApiKey: data.hasApiKey,
          cairoTime: data.cairoTime,
        });
      })
      .catch((err) => {
        console.warn('Could not connect to health endpoint:', err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'architecture' && <TabArchitecture />}
        {activeTab === 'agents' && <TabAgentsConsole />}
        {activeTab === 'runner' && <TabLiveRunner />}
        {activeTab === 'n8n' && <TabN8nIntegration />}
        {activeTab === 'codex' && <TabCodexHandoff />}
        {activeTab === 'testing' && <TabTestingEvaluation />}
      </main>

      {/* Institutional Financial Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-6 text-xs text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white font-['Plus_Jakarta_Sans']">NEXORA Markets</span>
            <span>• قسم الذكاء الاصطناعي وهندسة النظم المالية المتقدمة</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>توقيت التشغيل الإجباري: Africa/Cairo</span>
            <span>•</span>
            <span>إصدار العقد الموحد: v1.2.0</span>
            <span>•</span>
            <span>النموذج القياسي: gemini-3.8-flash</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
