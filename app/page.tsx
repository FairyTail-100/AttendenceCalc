"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { LayoutDashboard, UploadCloud, Moon, Sun, Trash2, Table2, TrendingUp } from 'lucide-react';
import UploadsTab from '@/components/attendance/UploadsTab';
import DashboardTab from '@/components/attendance/DashboardTab';
import PredictiveCalendarTab from '@/components/attendance/PredictiveCalendarTab';
import TimetableTab from '@/components/attendance/TimetableTab';
import { useAttendanceStore } from '@/hooks/useAttendanceStore';
import LogoutButton from '@/components/auth/LogoutButton';

const NAV_ITEMS = [
  { id: 'uploads',   label: 'Ingestion',  Icon: UploadCloud },
  { id: 'dashboard', label: 'Overview',   Icon: LayoutDashboard },
  { id: 'timetable', label: 'Timetable',  Icon: Table2 },
  { id: 'calendar',  label: 'Forecast',   Icon: TrendingUp },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('uploads');
  const [showClearMenu, setShowClearMenu] = useState(false);
  const store = useAttendanceStore();
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDarkMode(localStorage.getItem('theme') === 'dark');
    
    // Check if we already have data on mount, if so, default to dashboard tab
    const saved = localStorage.getItem('attendance_baseline');
    if (saved && JSON.parse(saved).length > 0) {
      setActiveTab('dashboard');
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode, mounted]);

  const handleClearData = (type = 'all') => {
    let msg = 'Are you sure you want to clear all current data?';
    if (type === 'attendance') msg = 'Clear all attendance baseline data?';
    if (type === 'timetable')  msg = 'Clear the timetable blueprint?';
    if (type === 'planner')    msg = 'Clear all planned absences and holidays?';

    if (confirm(msg)) {
      if (type === 'attendance') store.clearAttendance();
      else if (type === 'timetable')  store.clearTimetable();
      else if (type === 'planner')    store.clearPlanner();
      else store.clearData();
      
      if (type === 'all' || type === 'attendance') setActiveTab('uploads');
      setShowClearMenu(false);
    }
  };

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans dark:bg-slate-950 transition-colors duration-200">
      
      {/* ── FIXED OVERLAY SIDEBAR (Desktop) ── */}
      <aside className="group fixed left-0 top-0 h-screen w-20 hover:w-64 transition-all duration-300 ease-in-out bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-100 dark:border-slate-800/50 hidden md:flex flex-col py-6 z-40 overflow-hidden shadow-sm hover:shadow-2xl">
        
        {/* Brand mark */}
        <div className="px-4 mb-8 flex items-center gap-4 overflow-hidden">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1.5 ${
            activeTab === 'dashboard' 
              ? 'bg-white dark:bg-slate-800' 
              : 'bg-slate-900 dark:bg-slate-100'
          }`}>
            {activeTab === 'dashboard' ? (
              <Image 
                src="/assets/logo.svg" 
                alt="KL University Attendance Architect Logo" 
                width={40} 
                height={40} 
                className="object-contain"
                priority
              />
            ) : (
              <span className="text-white dark:text-slate-900 font-black text-[0.7rem] leading-tight text-center">AA</span>
            )}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 overflow-hidden whitespace-nowrap">
            <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">Attendance</p>
            <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">Architect</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-2 px-3 flex-1">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                title={label}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 w-full overflow-hidden ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'text-slate-500 dark:text-slate-500 hover:bg-[#faf9f6] dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm font-semibold whitespace-nowrap tracking-tight">
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div className="px-3 flex flex-col gap-2">
          {/* Dark mode */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle theme"
            className="flex items-center gap-4 px-3 py-3 rounded-xl text-slate-500 dark:text-slate-500 hover:bg-[#faf9f6] dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 w-full overflow-hidden"
          >
            {isDarkMode
              ? <Sun size={20} strokeWidth={2} className="shrink-0" />
              : <Moon size={20} strokeWidth={2} className="shrink-0" />}
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm font-semibold whitespace-nowrap tracking-tight">
              {isDarkMode ? 'Light mode' : 'Dark mode'}
            </span>
          </button>

          {/* Clear data */}
          <div className="relative">
            <button
              onClick={() => setShowClearMenu(!showClearMenu)}
              title="Clear options"
              className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 w-full overflow-hidden ${
                showClearMenu 
                  ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' 
                  : 'text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400'
              }`}
            >
              <Trash2 size={20} strokeWidth={2} className="shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm font-semibold whitespace-nowrap tracking-tight">
                Clear options
              </span>
            </button>

            {showClearMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
                <p className="px-3 py-2 text-[0.6rem] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Selective Clear</p>
                <button onClick={() => handleClearData('attendance')} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Attendance Data</button>
                <button onClick={() => handleClearData('timetable')}  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Timetable Blueprint</button>
                <button onClick={() => handleClearData('planner')}    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Absences & Holidays</button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button onClick={() => handleClearData('all')}        className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">Clear Everything</button>
              </div>
            )}
          </div>
          
          <div className="w-[44px] group-hover:w-full transition-all duration-300 overflow-hidden">
            <LogoutButton store={store} />
          </div>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAVIGATION ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-around py-3 px-2 z-40 md:hidden">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[0.6rem] font-bold uppercase tracking-wider">{label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span className="text-[0.6rem] font-bold uppercase tracking-wider">{isDarkMode ? 'Light' : 'Dark'}</span>
        </button>
      </nav>

      {/* ── MAIN CONTENT (pl-20 on desktop, pb-20 on mobile) ── */}
      <main className="flex-1 overflow-y-auto min-w-0 md:pl-20 pb-20 md:pb-0">
        <div className={activeTab === 'uploads' || activeTab === 'timetable' ? 'p-4 sm:p-8 md:p-12 lg:p-16' : ''}>
          {activeTab === 'uploads'   && <UploadsTab store={store} onSwitchTab={() => setActiveTab('dashboard')} />}
          {activeTab === 'timetable' && <TimetableTab store={store} />}
        </div>
        {activeTab === 'dashboard' && <DashboardTab store={store} />}
        {activeTab === 'calendar'  && <PredictiveCalendarTab store={store} />}
      </main>
    </div>
  );
}
