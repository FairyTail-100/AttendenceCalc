"use client";

import { useState } from 'react';
import { calculateSubjectStatus, calculateComponentProjections } from '@/lib/attendanceEngine';
import { Plus, Minus, Calculator, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CircularProgress = ({ percentage, size = 64, strokeWidth = 2 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  let colorClass = 'text-emerald-500 dark:text-emerald-400';
  if (percentage < 75) colorClass = 'text-red-500 dark:text-red-400';
  else if (percentage < 85) colorClass = 'text-amber-500 dark:text-amber-400';

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Dark-mode-aware track */}
        <circle 
          className="text-slate-100 dark:text-slate-800" 
          strokeWidth={strokeWidth} 
          stroke="currentColor" 
          fill="transparent" 
          r={radius} 
          cx={size/2} 
          cy={size/2} 
        />
        <circle 
          className={`transition-all duration-1000 ease-out ${colorClass}`}
          stroke="currentColor"
          strokeWidth={strokeWidth} 
          strokeDasharray={circumference} 
          strokeDashoffset={offset}
          strokeLinecap="round" 
          fill="transparent" 
          r={radius} 
          cx={size/2} 
          cy={size/2}
        />
      </svg>
      <div className="absolute">
        <motion.span 
          key={percentage}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-sm font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100"
        >
          {percentage}%
        </motion.span>
      </div>
    </div>
  );
};

const SubjectCard = ({ subject, blueprint, globalTarget }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sandboxOffsets, setSandboxOffsets] = useState({ L: 0, P: 0, S: 0 });

  const hasBlueprint = Object.values(blueprint).some(arr => arr.length > 0);
  const isScheduled = (compType) => {
    if (!hasBlueprint) return true;
    for (let day of Object.values(blueprint)) {
      if (day.some(c => c && c.courseCode === subject.courseCode && c.type === compType)) return true;
    }
    return false;
  };

  // Build simulated subject (reflects sandbox changes)
  const simSubject = JSON.parse(JSON.stringify(subject));
  const simStatus = (() => {
    Object.keys(sandboxOffsets).forEach(comp => {
      if (simSubject.components[comp]) {
        const isSafeBase = calculateSubjectStatus(subject).percentage >= globalTarget;
        if (isSafeBase) {
          // Skip mode: conducted++, attended stays
          simSubject.components[comp].conducted += sandboxOffsets[comp];
        } else {
          // Attend mode: both++
          simSubject.components[comp].conducted += sandboxOffsets[comp];
          simSubject.components[comp].attended += sandboxOffsets[comp];
        }
      }
    });
    return calculateSubjectStatus(simSubject);
  })();

  // Projections are computed on simSubject so they react to sandbox
  const projections = calculateComponentProjections(simSubject, globalTarget);

  const handleStep = (comp, amount) => {
    setSandboxOffsets(prev => ({ ...prev, [comp]: Math.max(0, prev[comp] + amount) }));
  };

  const activeComponents = ['L', 'P', 'S'].filter(t => simSubject.components[t] && isScheduled(t));

  // Status styling
  let borderClass = 'border-l-emerald-500 dark:border-l-emerald-400';
  let pillClass   = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20';
  let statusLabel = 'Safe';
  if (simStatus.detained) {
    borderClass = 'border-l-red-500 dark:border-l-red-400';
    pillClass   = 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20';
    statusLabel = 'Action Required';
  } else if (simStatus.condonation) {
    borderClass = 'border-l-amber-500 dark:border-l-amber-400';
    pillClass   = 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20';
    statusLabel = 'Warning';
  }

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 border-l-4 ${borderClass} overflow-hidden flex flex-col`}>

      {/* ─── HEADER ─── */}
      <div
        className="p-5 md:p-6 cursor-pointer flex items-center justify-between hover:bg-[#faf9f6] dark:hover:bg-slate-800/40 transition-colors group"
        onClick={() => setIsExpanded(v => !v)}
      >
        <div className="flex flex-col flex-1 pr-4 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">{simStatus.courseCode}</span>
            <span className={`text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${pillClass}`}>{statusLabel}</span>
          </div>
          <h3 className="text-base font-semibold tracking-tight leading-tight text-slate-900 dark:text-slate-100 line-clamp-2 truncate" title={simStatus.courseName}>
            {simStatus.courseName}
          </h3>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <CircularProgress percentage={simStatus.percentage} />
          <div className="w-7 h-7 rounded-full bg-[#faf9f6] dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
            <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* ─── EXPANDED BODY ─── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row min-h-[300px]">

              {/* LEFT — Component Breakdown */}
              <div className="flex-1 p-6 lg:border-r border-slate-100 dark:border-slate-800 flex flex-col">
                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Component Breakdown</p>
                <div className="flex flex-col gap-5 flex-1">
                  {activeComponents.map(type => {
                    const counts = simSubject.components[type];
                    const pct = counts.conducted > 0 ? (counts.attended / counts.conducted) * 100 : 0;
                    return (
                      <div key={type} className="pb-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {type === 'L' ? 'Lecture' : type === 'P' ? 'Practical' : 'Skilling'}
                          </span>
                          <span className="text-xs font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">{counts.attended}/{counts.conducted}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-800 dark:bg-slate-300 transition-all duration-700 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT — Projections + Sandbox */}
              <div className="flex-[1.2] flex flex-col">

                {/* Projections */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
                    {projections && Object.values(projections).some(r => r?.type === 'skip')
                      ? `Safety Margin (${globalTarget}%)`
                      : `Classes Needed (${globalTarget}%)`}
                  </p>
                  <div className="flex flex-col gap-2">
                    {activeComponents.map(comp => {
                      const data = projections[comp];
                      if (!data) return null;
                      const compName = comp === 'L' ? 'Lecture' : comp === 'P' ? 'Practical' : 'Skilling';

                      let valueEl;
                      if (data.type === 'skip') {
                        if (data.value === 'Infinity' || data.value >= 9999) {
                          valueEl = <span className="font-mono text-sm font-bold text-slate-400 dark:text-slate-500">No Limit</span>;
                        } else {
                          valueEl = <span className="font-mono text-sm font-bold tabular-nums text-blue-500 dark:text-slate-300">−{data.value} can skip</span>;
                        }
                      } else {
                        if (data.value === 0) {
                          valueEl = <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">Safe</span>;
                        } else if (data.value >= 9999) {
                          valueEl = <span className="font-mono text-sm font-bold text-slate-400 dark:text-slate-500">N/A</span>;
                        } else {
                          valueEl = (
                            <motion.span
                              key={data.value}
                              initial={{ y: -4, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              className="font-mono text-sm font-bold tabular-nums text-red-500 dark:text-red-400"
                            >
                              +{data.value} to reach {globalTarget}%
                            </motion.span>
                          );
                        }
                      }

                      return (
                        <div key={comp} className="flex items-center justify-between px-3 py-2.5 bg-[#faf9f6] dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{compName}</span>
                          {valueEl}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sandbox */}
                <div className="p-6 flex flex-col gap-2.5">
                  <p className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-1">
                    <Calculator size={11} strokeWidth={2.5} />
                    {simStatus.percentage >= globalTarget ? 'Simulate Absences' : 'Simulate Attendance'}
                  </p>
                  {activeComponents.map(comp => {
                    const compName = comp === 'L' ? 'Lecture' : comp === 'P' ? 'Practical' : 'Skilling';
                    return (
                      <div key={comp} className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{compName}</span>
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-0.5 shadow-sm">
                          <button
                            onClick={() => handleStep(comp, -1)}
                            disabled={sandboxOffsets[comp] === 0}
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-25"
                          >
                            <Minus size={13} strokeWidth={2.5} />
                          </button>
                          <span className="font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100 w-5 text-center">{sandboxOffsets[comp]}</span>
                          <button
                            onClick={() => handleStep(comp, 1)}
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Plus size={13} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function DashboardTab({ store }) {
  const { baseline, blueprint, globalTarget, setGlobalTarget } = store;

  if (!baseline || baseline.length === 0) {
    return (
      <div className="p-4 sm:p-6 md:p-10 max-w-[1600px] mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">No Data</h1>
        <p className="text-slate-500 dark:text-slate-400">Provide attendance data in the Ingestion tab to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#faf9f6] dark:bg-slate-950 min-h-screen p-4 sm:p-6 md:p-10">
      {/* Page header + Global Toggle */}
      <div className="mb-8 max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Click a subject to see projections and run simulations.</p>
        </div>

        {/* Pill Toggle */}
        <div className="flex bg-slate-200/60 dark:bg-slate-900 rounded-full p-1 border border-slate-200 dark:border-slate-800">
          {[{ label: '75% Minimum', value: 75 }, { label: '85% Safe Zone', value: 85 }].map(opt => (
            <button
              key={opt.value}
              onClick={() => setGlobalTarget(opt.value)}
              className={`relative px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition-colors z-10 ${
                globalTarget === opt.value
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {globalTarget === opt.value && (
                <motion.div
                  layoutId="pill-bg"
                  className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full shadow-sm -z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid - Forced 2 Column Optimization on Desktop, 1 on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 max-w-[1600px] mx-auto items-start">
        {baseline.map((subject, idx) => (
          <SubjectCard key={idx} subject={subject} blueprint={blueprint} globalTarget={globalTarget} />
        ))}
      </div>
    </div>
  );
}
