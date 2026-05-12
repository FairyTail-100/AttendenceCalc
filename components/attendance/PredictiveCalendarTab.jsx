"use client";

import { useState, useMemo } from 'react';
import { format, addDays, eachDayOfInterval, isSameDay, isSunday } from 'date-fns';
import { projectAttendanceDetailed, calculateSubjectStatus, calculateDayImpact } from '@/lib/attendanceEngine';
import { Search, Shield, Lock, ChevronDown, CalendarCheck2, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Tiny Impact Dot ──────────────────────────────────────────────────────────
const ImpactDot = ({ impact }) => {
  if (impact === 0) return <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />;
  if (impact < 0.5)  return <span className="w-2 h-2 rounded-full bg-emerald-400 dark:bg-emerald-500" />;
  if (impact < 1.5)  return <span className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500" />;
  return                     <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400" />;
};

// ─── Mini Circular Dial ───────────────────────────────────────────────────────
const MiniDial = ({ percentage, ghost = false, size = 56, strokeWidth = 2 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  let colorClass = ghost
    ? 'text-slate-300 dark:text-slate-600'
    : percentage >= 85
      ? 'text-emerald-500 dark:text-emerald-400'
      : percentage >= 75
        ? 'text-amber-500 dark:text-amber-400'
        : 'text-red-500 dark:text-red-400';

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-slate-100 dark:text-slate-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius} cx={size / 2} cy={size / 2}
        />
        <circle
          className={`transition-all duration-700 ease-out ${colorClass}`}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius} cx={size / 2} cy={size / 2}
          opacity={ghost ? 0.12 : 1}
        />
      </svg>
      <span className="absolute text-[0.6rem] font-bold font-mono text-slate-700 dark:text-slate-300">
        {percentage}%
      </span>
    </div>
  );
};

// ─── Pattern Row ─────────────────────────────────────────────────────────────
const PatternRow = ({ pattern, isActive, onSelect, absenceDates, store, end }) => {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Calculate consumption and viability live
  const stats = useMemo(() => {
    const unconsumed = pattern.skips.filter(s => !absenceDates.some(a => isSameDay(new Date(a), new Date(s))));
    
    const viable = [];
    const exhausted = [];
    
    unconsumed.forEach(s => {
      // Check if this specific skip is safe on top of current manual state
      const testAbsences = [...absenceDates, s];
      const testProjections = projectAttendanceDetailed(
        store.baseline, store.blueprint, end, testAbsences, store.holidays, store.countToday !== false
      );
      if (testProjections.every(proj => proj.percentage >= 75)) {
        viable.push(s);
      } else {
        exhausted.push(s);
      }
    });

    // Derive live metrics for the entire pattern
    const fullProjections = projectAttendanceDetailed(
      store.baseline, store.blueprint, end, [...absenceDates, ...viable], store.holidays, store.countToday !== false
    );

    let limitingSubject = null;
    let limitingMargin = Infinity;
    let bufferSubject = null;
    let bufferMargin = -Infinity;

    fullProjections.forEach(proj => {
      const margin = proj.percentage - store.forecastTarget;
      if (margin < limitingMargin) {
        limitingMargin = margin;
        limitingSubject = proj;
      }
      if (margin > bufferMargin) {
        bufferMargin = margin;
        bufferSubject = proj;
      }
    });

    const group = (skips) => {
      const counts = {};
      skips.forEach(s => {
        const d = daysOfWeek[new Date(s).getDay()];
        counts[d] = (counts[d] || 0) + 1;
      });
      return Object.entries(counts).map(([day, count]) => ({ day, count }));
    };

    return {
      totalSafe: viable.length,
      viableGroups: group(viable),
      exhaustedGroups: group(exhausted),
      limitingSubject,
      bufferSubject
    };
  }, [pattern.skips, absenceDates, store.baseline, store.blueprint, end, store.holidays, store.countToday, store.forecastTarget]);

  return (
    <div 
      className={`flex flex-col sm:flex-row justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-3 ${isActive ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-4 w-full">
         <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center shrink-0 ${isActive ? 'border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
           {isActive && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
         </div>
         <div className="flex flex-col gap-1.5 w-full">
           
           {/* Primary: Weekday Flexibility */}
           <div className="flex items-center flex-wrap gap-2">
             <h4 className={`text-sm font-bold ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
               {stats.totalSafe} Safe Skip{stats.totalSafe !== 1 ? 's' : ''} Remaining:
             </h4>
             <div className="flex flex-wrap gap-1.5">
               {stats.totalSafe === 0 && stats.exhaustedGroups.length === 0 ? (
                 <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-1.5 py-0.5">Fully consumed</span>
               ) : (
                 <>
                   {stats.viableGroups.map(d => (
                     <span key={d.day} className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-sm" title="Mathematically safe to skip">
                       {d.day}: {d.count}
                     </span>
                   ))}
                   {stats.exhaustedGroups.map(d => (
                     <span key={d.day} className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 opacity-60 grayscale" title="No longer safe due to current absences">
                       {d.day}: {d.count} exhausted
                     </span>
                   ))}
                 </>
               )}
             </div>
           </div>

           {/* Secondary: Tactical Labels & Metrics */}
           <div className="flex flex-wrap items-center gap-3 text-[0.65rem] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
             <span className="uppercase tracking-wider font-bold text-[0.6rem] text-slate-400 dark:text-slate-500 mr-1">
               {pattern.tacticalName}
             </span>
             {stats.limitingSubject && (
               <span className="flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                 Limiting: {stats.limitingSubject.courseCode}
               </span>
             )}
             {stats.bufferSubject && stats.bufferSubject.courseCode !== stats.limitingSubject?.courseCode && (
               <span className="flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                 Buffer: {stats.bufferSubject.courseCode}
               </span>
             )}
           </div>
         </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PredictiveCalendarTab({ store }) {
  const { baseline, blueprint, absenceDates, setAbsenceDates, holidays, setHolidays, globalTarget } = store;
  const [targetDate, setTargetDate] = useState(addDays(new Date(), 14));
  const [forecastTarget, setForecastTarget] = useState(globalTarget || 85);
  const [plannedSkips, setPlannedSkips] = useState([]);
  const [generatedPatterns, setGeneratedPatterns] = useState([]);
  const [activePatternIndex, setActivePatternIndex] = useState(0);
  const [noSkipsFound, setNoSkipsFound] = useState(false);
  const [countToday, setCountToday] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [blockedWarning, setBlockedWarning] = useState(null); // { msg, dayKey }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!baseline || baseline.length === 0) {
    return (
      <div className="p-4 sm:p-6 md:p-10 max-w-[1600px] mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">Attendance Required</h1>
        <p className="text-slate-500 dark:text-slate-400">Provide attendance data in the Ingestion tab to unlock the Forecast.</p>
      </div>
    );
  }

  const hasBlueprint = Object.values(blueprint).some(arr => arr.length > 0);
  if (!hasBlueprint) {
    return (
      <div className="p-4 sm:p-6 md:p-10 max-w-[1600px] mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">Timetable Required</h1>
        <p className="text-slate-500 dark:text-slate-400">Provide a Timetable Blueprint in the Ingestion tab to unlock the Forecast.</p>
      </div>
    );
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const today     = new Date();
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endNorm   = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const end       = endNorm < todayNorm ? todayNorm : endNorm;
  const days      = eachDayOfInterval({ start: todayNorm, end });

  const baseProjections = baseline.map(s => calculateSubjectStatus(s));
  // Only manual absences drive projections. plannedSkips are advisory/visual only.
  const detailedProjections = projectAttendanceDetailed(baseline, blueprint, end, absenceDates, holidays, countToday);

  // Count total projected classes for the summary
  const totalProjectedClasses = detailedProjections.reduce((sum, proj) => {
    return sum + Object.values(proj.componentDeltas || {}).reduce((s, cd) => s + cd.addedConducted, 0);
  }, 0);
  const workingDays = days.filter(d => !isSunday(d) && !holidays.some(h => isSameDay(new Date(h), d))).length;

  const [expandedCards, setExpandedCards] = useState({});
  const toggleCard = (idx) => setExpandedCards(prev => ({ ...prev, [idx]: !prev[idx] }));

  const COMP_LABELS = { L: 'Lecture', P: 'Practical', S: 'Skilling' };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDateClick = (day) => {
    if (isSunday(day)) return;

    const isAbs = absenceDates.some(d => isSameDay(new Date(d), day));
    const isHol = holidays.some(h => isSameDay(new Date(h), day));

    if (!isAbs && !isHol) {
      // Safety check: simulate adding this absence and validate all subjects
      const testAbsences = [...absenceDates, day.toISOString()];
      const testProjections = projectAttendanceDetailed(baseline, blueprint, end, testAbsences, holidays, countToday);
      const failingSubject = testProjections.find(proj => proj.percentage < 75);

      if (failingSubject) {
        // Block the selection and show a brief inline warning
        const dayKey = format(day, 'yyyy-MM-dd');
        setBlockedWarning({ msg: `${failingSubject.courseCode} would drop below 75% (${failingSubject.percentage}%)`, dayKey });
        setTimeout(() => setBlockedWarning(null), 2800);
        return;
      }

      setAbsenceDates([...absenceDates, day.toISOString()]);
    } else if (isAbs) {
      setAbsenceDates(absenceDates.filter(d => !isSameDay(new Date(d), day)));
      setHolidays([...holidays, day.toISOString()]);
    } else {
      setHolidays(holidays.filter(h => !isSameDay(new Date(h), day)));
    }
  };

  const findBestSkip = () => {
    setNoSkipsFound(false);

    const candidateDays = days.filter(d => {
      if (isSunday(d)) return false;
      if (!countToday && isSameDay(d, todayNorm)) return false;
      if (absenceDates.some(a => isSameDay(new Date(a), d))) return false;
      if (holidays.some(h => isSameDay(new Date(h), d))) return false;
      return true;
    });

    const daysWithImpact = candidateDays
      .map(d => ({ date: d, impact: calculateDayImpact(d, baseline, blueprint) }))
      .filter(d => d.impact > 0);
      
    daysWithImpact.sort((a, b) => a.impact - b.impact);

    const buildPattern = (daysArray) => {
      let skips = [];
      let projections = null;
      for (const { date } of daysArray) {
        const testAbsences = [...absenceDates, ...skips, date.toISOString()];
        const testProjections = projectAttendanceDetailed(baseline, blueprint, end, testAbsences, holidays, countToday);

        const allSafe = testProjections.every(proj => proj.percentage >= forecastTarget);
        if (allSafe) {
          skips.push(date.toISOString());
          projections = testProjections;
        }
      }
      return skips.length > 0 ? { skips, projections } : null;
    };

    const strategies = [
      daysWithImpact.slice().sort((a, b) => a.impact - b.impact),
      daysWithImpact.slice().filter(({date}) => [1,5,6].includes(date.getDay())).sort((a, b) => a.impact - b.impact),
      daysWithImpact.slice().filter(({date}) => [2,3,4].includes(date.getDay())).sort((a, b) => a.impact - b.impact),
      daysWithImpact.slice().sort((a, b) => a.date.getTime() - b.date.getTime())
    ];

    const rawPatterns = [];
    for (const strat of strategies) {
      const p = buildPattern(strat);
      if (p && !rawPatterns.some(rp => rp.skips.join() === p.skips.join())) {
        rawPatterns.push(p);
      }
    }

    const patterns = rawPatterns.map(p => {
      let limitingSubject = null;
      let limitingMargin = Infinity;
      let bufferSubject = null;
      let bufferMargin = -Infinity;

      p.projections.forEach(proj => {
        const margin = proj.percentage - forecastTarget;
        if (margin < limitingMargin) {
          limitingMargin = margin;
          limitingSubject = proj;
        }
        if (margin > bufferMargin) {
          bufferMargin = margin;
          bufferSubject = proj;
        }
      });

      return {
        ...p,
        limitingMargin,
        limitingSubject,
        bufferSubject
      };
    });

    patterns.sort((a, b) => b.limitingMargin - a.limitingMargin); // Safest first

    patterns.forEach((p, idx) => {
      if (idx === 0) p.tacticalName = "Safest Combo";
      else if (idx === patterns.length - 1 && patterns.length > 2) p.tacticalName = "Riskiest Combo";
      else p.tacticalName = "Balanced Combo";
    });

    if (patterns.length > 0) {
      setGeneratedPatterns(patterns);
      setActivePatternIndex(0);
      setPlannedSkips(patterns[0].skips);
    } else {
      setGeneratedPatterns([]);
      setPlannedSkips([]);
      setNoSkipsFound(true);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#faf9f6] dark:bg-slate-950 min-h-screen p-4 sm:p-6 md:p-10">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-10">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Forecast</h1>
              <button 
                onClick={() => setShowInfo(!showInfo)}
                className={`p-1.5 rounded-full transition-colors ${showInfo ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200' : 'text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="How this works"
              >
                <Info size={18} strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Plan absences and see their exact impact.</p>
          </div>
          <input
            type="date"
            value={format(end, 'yyyy-MM-dd')}
            onChange={e => { 
              if (e.target.value) {
                setTargetDate(new Date(e.target.value)); 
                setPlannedSkips([]);
                setGeneratedPatterns([]);
                setNoSkipsFound(false);
              }
            }}
            className="text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700 transition-all [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>

        {/* Transparency Panel */}
        <AnimatePresence>
          {showInfo && (
            <motion.div 
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative">
                <button 
                  onClick={() => setShowInfo(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <Shield size={12} className="text-blue-500" /> Forecast Engine — Technical Reference
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[0.65rem] text-slate-600 dark:text-slate-400">
                  {/* 1. Projection Math */}
                  <div className="space-y-2.5">
                    <p className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[0.55rem] tracking-widest">Projection Recalculation</p>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 font-mono text-[0.6rem] leading-relaxed">
                      P_final = Current + Σ(Sandbox_Skips)
                    </div>
                    <div className="space-y-1.5 opacity-80">
                      <p>• Skip Day Impact: <span className="font-bold text-slate-700 dark:text-slate-300">C+1, A+0</span></p>
                      <p>• Manual Selection: <span className="font-bold text-slate-700 dark:text-slate-300">absenceDates</span></p>
                      <p>• Holiday: <span className="font-bold text-slate-700 dark:text-slate-300">Exempt (Impact=0)</span></p>
                    </div>
                  </div>

                  {/* 2. Safety Boundaries */}
                  <div className="space-y-2.5">
                    <p className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[0.55rem] tracking-widest">Safety Boundaries</p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded bg-red-500/10 flex items-center justify-center text-red-600 shrink-0 font-bold">!</div>
                        <p><span className="font-bold text-red-500">75% Hard Floor:</span> Absolute detention boundary. Selection is blocked if any subject falls below this.</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0 font-bold">?</div>
                        <p><span className="font-bold text-amber-600">{forecastTarget}% Warning:</span> Triggered if projection falls below selected Forecast Target.</p>
                      </div>
                    </div>
                  </div>

                  {/* 3. Viability Engine */}
                  <div className="space-y-2.5">
                    <p className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[0.55rem] tracking-widest">Viability Engine</p>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 font-mono text-[0.6rem] leading-relaxed">
                      isSafe = ∀subj(project(A_manual + S_cand) ≥ 75%)
                    </div>
                    <div className="space-y-1 opacity-80 leading-tight">
                      <p>• <span className="font-bold text-emerald-600 dark:text-emerald-400">Available:</span> Mathematically viable under current sandbox state.</p>
                      <p>• <span className="font-bold text-slate-500">Exhausted:</span> Recommended skip that violated 75% floor due to current absences.</p>
                    </div>
                    <p className="italic opacity-80">Revalidated live on every interaction.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Control Strip ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm px-5 py-4 flex flex-wrap items-center gap-4">
          {/* Bunk Optimizer */}
          <button
            onClick={findBestSkip}
            className="flex items-center gap-2 px-4 py-2 bg-[#faf9f6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Search size={13} strokeWidth={2.5} /> <span className="hidden sm:inline">Generate Skip Strategies</span><span className="sm:hidden">Generate</span>
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

          {/* Count Today Toggle */}
          <button
            onClick={() => {
              setCountToday(prev => !prev);
              setPlannedSkips([]);
              setGeneratedPatterns([]);
              setNoSkipsFound(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
              countToday
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-[#faf9f6] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            <CalendarCheck2 size={13} strokeWidth={2.5} />
            {countToday ? "Today Included" : "Today Excluded"}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

          {/* Forecast Target */}
          <div className="flex items-center gap-2">
            <Shield size={13} strokeWidth={2.5} className="text-slate-400 dark:text-slate-500" />
            <span className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Target</span>
            <select
              value={forecastTarget}
              onChange={(e) => {
                 setForecastTarget(Number(e.target.value));
                 setPlannedSkips([]);
                 setGeneratedPatterns([]);
                 setNoSkipsFound(false);
              }}
              className="bg-[#faf9f6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {Array.from({ length: 20 }, (_, i) => 76 + i).map(v => (
                <option key={v} value={v}>{v}%</option>
              ))}
            </select>
          </div>

          {noSkipsFound && (
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg ml-auto border border-amber-200 dark:border-amber-500/20">
              No safe skips found at {forecastTarget}%
            </span>
          )}
        </div>

        {/* ── Generated Skip Patterns ── */}
        {generatedPatterns.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recommended Skip Patterns</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Select a plan, then manually apply dates to simulate</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {generatedPatterns.map((pattern, i) => (
                  <PatternRow 
                    key={i} 
                    pattern={pattern} 
                    absenceDates={absenceDates}
                    store={store}
                    end={end}
                    isActive={i === activePatternIndex} 
                    onSelect={() => { setActivePatternIndex(i); setPlannedSkips(pattern.skips); }} 
                  />
              ))}
            </div>
          </div>
        )}

        {/* ── Main 2-column layout - Stacks on mobile ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10 items-start">

          {/* ── LEFT: Flex-Wrap Calendar Grid ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Absence Sandbox — click to toggle
              </p>
              <div className="flex items-center gap-3 text-[0.55rem] font-semibold uppercase text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Low</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Med</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />High</span>
              </div>
            </div>

            {/* Blocked warning toast */}
            {blockedWarning && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs font-semibold text-red-700 dark:text-red-400 animate-pulse">
                <span>⚠</span> Blocked — {blockedWarning.msg} (detention floor)
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {days.map((day, i) => {
                const isAbs   = absenceDates.some(d => isSameDay(new Date(d), day));
                const isHol   = holidays.some(h => isSameDay(new Date(h), day)) || isSunday(day);
                const isToday = isSameDay(day, today);
                const impact  = isSunday(day) ? 0 : calculateDayImpact(day, baseline, blueprint);
                const isBlocked = blockedWarning && format(day, 'yyyy-MM-dd') === blockedWarning.dayKey;

                // Token colour — purely manual state, no recommendation highlighting
                let tokenBg = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 hover:border-slate-400 dark:hover:border-slate-500';
                if (isAbs)        tokenBg = 'bg-red-500 border-red-400 text-white shadow-sm';
                else if (isBlocked) tokenBg = 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 ring-1 ring-red-400/50';
                else if (isHol)   tokenBg = 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500';
                else if (isToday) tokenBg = 'bg-white dark:bg-slate-900 border-slate-900 dark:border-slate-300 text-slate-900 dark:text-slate-100 ring-1 ring-slate-900 dark:ring-slate-300';

                return (
                  <div
                    key={i}
                    onClick={() => handleDateClick(day)}
                    title={isHol ? (isSunday(day) ? 'Sunday — auto holiday' : 'College Holiday') : isAbs ? 'Planned Absent' : 'Normal'}
                    className={`relative flex flex-col items-center justify-between w-[70px] h-[80px] py-2.5 px-1 border rounded-xl shadow-sm select-none transition-colors duration-150 ${tokenBg} ${!isSunday(day) ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                  >
                    {/* Holiday lock icon */}
                    {isHol && !isSunday(day) && (
                      <Lock size={8} className="absolute top-1.5 right-1.5 text-slate-400 dark:text-slate-500 opacity-70" />
                    )}

                    <span className="text-[0.5rem] font-bold uppercase tracking-widest opacity-60">
                      {format(day, 'EEE')}
                    </span>
                    <span className="text-lg font-extrabold leading-none">
                      {format(day, 'd')}
                    </span>
                    <ImpactDot impact={isHol ? 0 : impact} />
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              {[
                { color: 'bg-slate-200 dark:bg-slate-700', label: 'Normal' },
                { color: 'bg-red-500', label: 'Absent' },
                { color: 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700', label: 'Holiday' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-md ${color}`} />
                  <span className="text-[0.6rem] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Detailed Projection Results ── */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Projected Impact</p>
              <p className="text-[0.6rem] font-semibold text-slate-400 dark:text-slate-500">
                {workingDays} working day{workingDays !== 1 ? 's' : ''} · {totalProjectedClasses} class{totalProjectedClasses !== 1 ? 'es' : ''} projected
              </p>
            </div>
            {totalProjectedClasses === 0 && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">No classes found in this window. Check your timetable matches the attendance course codes, or extend the date range.</p>
              </div>
            )}
            <div className="flex flex-col gap-4">
              {detailedProjections.map((proj, idx) => {
                const base = baseProjections[idx];
                if (!base) return null;
                const delta = proj.delta;
                const isExpanded = !!expandedCards[idx];
                const compEntries = Object.entries(proj.componentDeltas || {});

                let borderClass = 'border-l-emerald-500 dark:border-l-emerald-400';
                let pillClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20';
                let statusLabel = 'Safe';
                
                if (proj.percentage < 75) {
                  statusLabel = 'Detained'; 
                  borderClass = 'border-l-red-500 dark:border-l-red-400';
                  pillClass = 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20';
                } else if (proj.percentage < forecastTarget) {
                  statusLabel = 'Warning'; 
                  borderClass = 'border-l-amber-500 dark:border-l-amber-400';
                  pillClass = 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20';
                }

                return (
                  <div key={idx} className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 ${borderClass} rounded-2xl shadow-sm overflow-hidden`}>
                    {/* ── Header row (clickable) ── */}
                    <button onClick={() => toggleCard(idx)} className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Subject info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-[0.55rem] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{proj.courseCode}</span>
                          <span className={`text-[0.5rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${pillClass}`}>{statusLabel}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">{proj.courseName}</p>
                      </div>

                      {/* Dual-Dial comparison */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-center gap-1">
                          <MiniDial percentage={base.percentage} />
                          <span className="text-[0.45rem] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Now</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className={`text-xs font-bold font-mono leading-none ${
                            delta < 0 ? 'text-red-500 dark:text-red-400' : delta > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'
                          }`}>
                            {delta === 0 ? '—' : `${delta > 0 ? '+' : ''}${delta}%`}
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <MiniDial percentage={proj.percentage} ghost={delta < 0} />
                          <span className="text-[0.45rem] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Projected</span>
                        </div>
                      </div>

                      {/* Expand chevron */}
                      <ChevronDown size={14} className={`shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {/* ── Expandable component breakdown ── */}
                    {isExpanded && compEntries.length > 0 && (
                      <div className="border-t border-slate-100 dark:border-slate-800 px-4 pb-4 pt-3">
                        <p className="text-[0.5rem] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5">Component Breakdown</p>
                        <div className="flex flex-col gap-2">
                          {compEntries.map(([compType, cd]) => {
                            const added = cd.addedConducted;
                            return (
                              <div key={compType} className="flex items-center justify-between gap-3 py-1.5 px-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40">
                                {/* Label */}
                                <span className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-16 shrink-0">
                                  {COMP_LABELS[compType]}
                                </span>

                                {/* Attended / Conducted transition */}
                                <div className="flex items-center gap-1.5 font-mono text-[0.65rem] font-semibold text-slate-700 dark:text-slate-300">
                                  <span>{cd.baseAttended}/{cd.baseConducted}</span>
                                  <span className="text-slate-300 dark:text-slate-600">→</span>
                                  <span>{cd.projAttended}/{cd.projConducted}</span>
                                </div>

                                {/* Pct transition */}
                                <div className="flex items-center gap-1.5 font-mono text-[0.65rem] font-semibold">
                                  <span className="text-slate-500 dark:text-slate-400">{cd.basePct}%</span>
                                  <span className="text-slate-300 dark:text-slate-600">→</span>
                                  <span className={cd.deltaPct < 0 ? 'text-red-500 dark:text-red-400' : cd.deltaPct > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
                                    {cd.projPct}%
                                  </span>
                                </div>

                                {/* Classes added pill */}
                                <span className={`text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                  added === 0
                                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                                    : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                                }`}>
                                  {added === 0 ? 'no change' : `+${added} cls`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {isExpanded && compEntries.length === 0 && (
                      <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
                        <p className="text-[0.6rem] text-slate-400 dark:text-slate-500 italic">No scheduled classes in this forecast window.</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
