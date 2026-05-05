"use client";

import { useState } from 'react';
import { format, addDays, eachDayOfInterval, isSameDay, isSunday } from 'date-fns';
import { projectAttendanceDetailed, calculateSubjectStatus, calculateDayImpact } from '@/lib/attendanceEngine';
import { Search, Shield, Lock, ChevronDown, CalendarCheck2 } from 'lucide-react';

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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PredictiveCalendarTab({ store }) {
  const { baseline, blueprint, absenceDates, setAbsenceDates, holidays, setHolidays, globalTarget } = store;
  const [targetDate, setTargetDate] = useState(addDays(new Date(), 14));
  const [cushion, setCushion]       = useState(0);
  const [bestDay, setBestDay]       = useState(null);
  const [countToday, setCountToday] = useState(true);

  const effectiveTarget = (globalTarget || 85) + cushion;

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
      setAbsenceDates([...absenceDates, day.toISOString()]);
    } else if (isAbs) {
      setAbsenceDates(absenceDates.filter(d => !isSameDay(new Date(d), day)));
      setHolidays([...holidays, day.toISOString()]);
    } else {
      setHolidays(holidays.filter(h => !isSameDay(new Date(h), day)));
    }
    setBestDay(null);
  };

  const findBestSkip = () => {
    let best = null, lowestImpact = Infinity;
    for (let i = 1; i <= 7; i++) {
      const d = addDays(today, i);
      if (isSunday(d)) continue;
      const impact = calculateDayImpact(d, baseline, blueprint);
      if (impact < lowestImpact) { lowestImpact = impact; best = d; }
    }
    setBestDay(best);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#faf9f6] dark:bg-slate-950 min-h-screen p-4 sm:p-6 md:p-10">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-10">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Forecast</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Plan absences and see their exact impact.</p>
          </div>
          <input
            type="date"
            value={format(end, 'yyyy-MM-dd')}
            onChange={e => { if (e.target.value) setTargetDate(new Date(e.target.value)); }}
            className="text-sm font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700 transition-all [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>

        {/* ── Control Strip ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm px-5 py-4 flex flex-wrap items-center gap-4">
          {/* Bunk Optimizer */}
          <button
            onClick={findBestSkip}
            className="flex items-center gap-2 px-4 py-2 bg-[#faf9f6] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Search size={13} strokeWidth={2.5} /> Find Best Day to Skip
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

          {/* Count Today Toggle */}
          <button
            onClick={() => setCountToday(prev => !prev)}
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

          {/* Safety Cushion */}
          <div className="flex items-center gap-2">
            <Shield size={13} strokeWidth={2.5} className="text-slate-400 dark:text-slate-500" />
            <span className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Safety Buffer</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(v => (
                <button
                  key={v}
                  onClick={() => setCushion(v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    cushion === v
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {v === 0 ? 'Off' : `+${v}%`}
                </button>
              ))}
            </div>
          </div>

          {cushion > 0 && (
            <span className="text-xs text-slate-400 dark:text-slate-500 italic ml-auto">
              Effective target: {effectiveTarget}%
            </span>
          )}
        </div>

        {/* ── Main 2-column layout - Stacks on mobile ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10 items-start">

          {/* ── LEFT: Flex-Wrap Calendar Grid ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Absence Planner — click to cycle
              </p>
              <div className="flex items-center gap-3 text-[0.55rem] font-semibold uppercase text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Low</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Med</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />High</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {days.map((day, i) => {
                const isAbs   = absenceDates.some(d => isSameDay(new Date(d), day));
                const isHol   = holidays.some(h => isSameDay(new Date(h), day)) || isSunday(day);
                const isToday = isSameDay(day, today);
                const isBest  = bestDay && isSameDay(day, bestDay);
                const impact  = isSunday(day) ? 0 : calculateDayImpact(day, baseline, blueprint);

                // Token colour
                let tokenBg = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 hover:border-slate-400 dark:hover:border-slate-500';
                if (isAbs)        tokenBg = 'bg-red-500 border-red-400 text-white shadow-sm';
                else if (isHol)   tokenBg = 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500';
                else if (isBest)  tokenBg = 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200';
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

                    {isBest && (
                      <span className="absolute -bottom-3.5 text-[0.45rem] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Best</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              {[
                { color: 'bg-slate-200 dark:bg-slate-700', label: 'Normal' },
                { color: 'bg-red-500', label: 'Planned Absent' },
                { color: 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700', label: 'Holiday' },
                { color: 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300', label: 'Best Skip' },
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
                if (proj.detained) borderClass = 'border-l-red-500 dark:border-l-red-400';
                else if (proj.condonation) borderClass = 'border-l-amber-500 dark:border-l-amber-400';

                let pillClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20';
                let statusLabel = 'Safe';
                if (proj.detained) {
                  statusLabel = 'Detained'; pillClass = 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20';
                } else if (proj.condonation) {
                  statusLabel = 'Warning'; pillClass = 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20';
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
