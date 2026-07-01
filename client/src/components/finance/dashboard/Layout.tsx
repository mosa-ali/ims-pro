import React from 'react';
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/iconButton";
import { Button } from "@/components/ui/button";

/**
 * TopNavBar: Integrated header.
 */
export const TopNavBar: React.FC<{ title: string }> = ({ title }) => (
  <nav className="sticky top-0 z-[100] flex justify-between items-center px-8 w-full h-16 bg-white border-b border-border-subtle">
    <div className="flex items-center gap-4">
      <span className="text-headline-sm font-black text-primary tracking-tight">{title}</span>
    </div>
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-3">
        <IconButton icon="notifications" />
        <IconButton icon="settings" />
        <div className="w-8 h-8 rounded-full bg-surface-dim border border-border-subtle overflow-hidden">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQNpaV93ET6ZyYDY1nytJAVdVr4EUL8BgYrexsGMCOpkPFbNZuVkOp5fyvQoxoIPrgbJ_7wJq7EJTfbxaSVrEt1UZ75FKm-z04eaHDJGP1Nz6zaDktBCjWhbx_lq0fAySTOpiISTq3FZ5fFiuzS-vh3LLmnbgAUWP3ouY08_hMKCBTN8qdCD94fBftfQNon8YZlApxIqLJSgvb00UWomvzW5NwBaLuInJS8ILggYGdmaXMEPv4tKkVzhQWxDOzLeUgfkEEMTXwTJ71" alt="Profile" />
        </div>
      </div>
    </div>
  </nav>
);

/**
 * SideNavBar: Module-specific context bar.
 */
export const SideNavBar: React.FC<{ activeTab: string }> = ({ activeTab }) => (
  <aside className="w-64 h-screen bg-corporate-blue-dark text-white flex flex-col shrink-0">
    <div className="p-8">
      <h2 className="text-headline-sm font-black tracking-tight">Global Ops</h2>
      <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mt-1">CFO Intelligence Hub</p>
    </div>
    <nav className="flex-1 px-4 space-y-1">
      {[
        { label: 'Dashboard', icon: 'dashboard', active: activeTab === 'Dashboard' },
        { label: 'Portfolio', icon: 'account_balance_wallet', active: activeTab === 'Portfolio' },
        { label: 'Analytics', icon: 'query_stats', active: activeTab === 'Analytics' },
        { label: 'Compliance', icon: 'verified_user', active: activeTab === 'Compliance' },
        { label: 'Reports', icon: 'description', active: activeTab === 'Reports' },
      ].map((item, idx) => (
        <div 
          key={idx} 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${item.active ? 'bg-white/10 shadow-lg shadow-black/20 font-black' : 'opacity-70 hover:bg-white/5 hover:opacity-100'}`}
        >
          <span className="material-icons">{item.icon}</span>
          <span className="text-xs uppercase tracking-widest">{item.label}</span>
        </div>
      ))}
    </nav>
    <div className="p-6 border-t border-white/10">
      <Button variant="secondary" className="w-full bg-white/10 hover:bg-white/20 border-none text-white text-[10px] font-black uppercase h-10 rounded-lg">Support Center</Button>
    </div>
  </aside>
);