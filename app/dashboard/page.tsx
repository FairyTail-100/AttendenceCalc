"use client";

import { useState, useEffect } from 'react';
import { LayoutDashboard, UploadCloud, Moon, Sun, Trash2, Table2, TrendingUp, MoreHorizontal, X, Settings } from 'lucide-react';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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
          <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white dark:text-slate-900 font-black text-[0.7rem] leading-tight text-center">AA</span>
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
          
          <LogoutButton store={store} />
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
          onClick={() => setShowMobileMenu(true)}
          className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500"
        >
          <Settings size={20} />
          <span className="text-[0.6rem] font-bold uppercase tracking-wider">More</span>
        </button>
      </nav>

      {/* ── MOBILE MORE MENU OVERLAY ── */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowMobileMenu(false)}
          />
          
          {/* Menu Card */}
          <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Settings</h2>
              <button 
                onClick={() => setShowMobileMenu(false)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Theme Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isDarkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-indigo-500" />}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </button>

              {/* Clear Data Section */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Selective Clear</p>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => { handleClearData('attendance'); setShowMobileMenu(false); }}
                    className="flex items-center gap-3 w-full p-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <Trash2 size={16} className="text-slate-400" />
                    Attendance Data
                  </button>
                  <button 
                    onClick={() => { handleClearData('timetable'); setShowMobileMenu(false); }}
                    className="flex items-center gap-3 w-full p-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <Table2 size={16} className="text-slate-400" />
                    Timetable Blueprint
                  </button>
                  <button 
                    onClick={() => { handleClearData('all'); setShowMobileMenu(false); }}
                    className="flex items-center gap-3 w-full p-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                  >
                    <Trash2 size={16} />
                    Clear Everything
                  </button>
                </div>
              </div>

              {/* Logout */}
              <div className="mt-2">
                <LogoutButton store={store} showLabel={true} />
              </div>
            </div>
          </div>
        </div>
      )}

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
