"use client";

import { Calendar as CalendarIcon } from 'lucide-react';

export default function TimetableTab({ store }) {
  const { baseline, blueprint } = store;
  
  const hasBlueprint = Object.values(blueprint).some(arr => arr.length > 0);
  
  if (!hasBlueprint) {
    return (
      <div className="p-4 sm:p-6 md:p-10 max-w-[1600px] mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">Timetable Required</h1>
        <p className="text-slate-500 dark:text-slate-400">Please provide a Timetable Blueprint in the Ingestion tab to view your schedule.</p>
      </div>
    );
  }

  const getCourseName = (code) => {
     const sub = baseline.find(s => s.courseCode === code);
     return sub ? sub.courseName : code;
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayIndices = [1, 2, 3, 4, 5, 6];

  const getTypeStyles = (type) => {
    switch (type) {
      case 'L':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-800/40 dark:hover:bg-indigo-500/20';
      case 'P':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-800/40 dark:hover:bg-emerald-500/20';
      case 'S':
        return 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-800/40 dark:hover:bg-amber-500/20';
      default:
        return 'bg-[#faf9f6] text-slate-600 border-slate-100 hover:bg-slate-100 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800/50';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Weekly Schedule</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-gray-400 mt-1">Calendar-aligned blueprint.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)] border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[64px_repeat(8,1fr)] bg-[#faf9f6] dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/50">
               {/* Header Row */}
               <div className="p-4 border-r border-slate-200 dark:border-slate-800/50 font-bold text-slate-400 dark:text-slate-500 text-xs uppercase tracking-widest flex items-center justify-center sticky left-0 bg-[#faf9f6] dark:bg-slate-950 z-10">Day</div>
               {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                 <div key={period} className="p-2 border-r border-slate-200 dark:border-slate-800/50 last:border-r-0 text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider text-center">
                   Period {period}
                 </div>
               ))}
            </div>

            <div className="flex flex-col">
              {dayIndices.map((dayIdx, i) => {
                const classes = blueprint[dayIdx] || [];
                const paddedClasses = Array.from({ length: 8 }).map((_, slotIdx) => classes[slotIdx] || null);
                
                return (
                  <div key={dayIdx} className="grid grid-cols-[64px_repeat(8,1fr)] border-b border-slate-200 dark:border-slate-800/50 last:border-b-0">
                    {/* Day Header - Sticky */}
                    <div className="p-4 border-r border-slate-200 dark:border-slate-800/50 bg-[#faf9f6]/50 dark:bg-slate-950/50 flex flex-col justify-center items-center sticky left-0 z-10 backdrop-blur-md">
                      <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-widest">{dayLabels[i]}</span>
                    </div>
                    
                    {/* Period Cells */}
                    {paddedClasses.map((cls, slotIdx) => (
                      <div key={slotIdx} className={`relative p-2 md:p-3 border-r border-slate-100 dark:border-slate-800/50 last:border-r-0 min-h-[80px] transition-colors group ${cls ? getTypeStyles(cls.type) : 'hover:bg-[#faf9f6] dark:hover:bg-slate-800/30'}`}>
                        <span className={`absolute top-1.5 left-2 text-[0.55rem] font-bold ${cls ? 'opacity-50' : 'text-slate-300 dark:text-slate-600'}`}>
                          {slotIdx + 1}
                        </span>
                        
                        {cls ? (
                          <div className="h-full flex flex-col justify-center items-center text-center mt-2">
                            <span className="text-[0.65rem] font-bold mb-0.5" title={getCourseName(cls.courseCode)}>
                              {cls.courseCode}
                            </span>
                            <span className="text-[0.55rem] font-bold uppercase tracking-widest opacity-80 border px-1 rounded-sm border-current bg-white/50 dark:bg-black/20">
                              {cls.type === 'L' ? 'Lec' : cls.type === 'P' ? 'Prac' : 'Skill'}
                            </span>
                            {/* Optional metadata: section and room */}
                            {cls.section && (
                              <span className="text-[0.5rem] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 opacity-70">
                                {cls.section}
                              </span>
                            )}
                            {cls.roomNumber && (
                              <span className="text-[0.5rem] font-medium text-slate-400 dark:text-slate-500 opacity-60">
                                {cls.roomNumber}
                              </span>
                            )}
                            {/* Tooltip for full name */}
                            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs rounded px-2 py-1 -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-10 shadow-lg border border-slate-700">
                              {getCourseName(cls.courseCode)}
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                             {/* Empty space */}
                          </div>
                        )}
                      </div>
                    ))}
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
