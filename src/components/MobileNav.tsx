import React from 'react';
import {
  LayoutDashboard,
  Hammer,
  Package,
  Clock,
  Mail,
  ShieldCheck,
  Users
} from 'lucide-react';
import { UserRole } from '../types';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: UserRole;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, userRole }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patching', label: 'Patching', icon: Hammer },
    { id: 'material', label: 'Material', icon: Package },
    { id: 'alat', label: 'Alat', icon: Clock },
    { id: 'surat', label: 'Surat', icon: Mail },
    ...(userRole === 'admin'
      ? [{ id: 'users', label: 'User', icon: Users }]
      : [{ id: 'audit', label: 'Audit', icon: ShieldCheck }]),
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f2347] shadow-xl border-t border-[#1e3a8a] text-white pb-safe">
      <div className="grid grid-cols-6 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 transition-all ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <div className={`p-1 rounded-md ${isActive ? 'bg-amber-400 text-[#0f2347]' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
