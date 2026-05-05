import { useState, useEffect, useCallback } from 'react';

export const useAttendanceStore = () => {
  const [baseline, setBaseline] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('attendance_baseline') : null;
    return saved ? JSON.parse(saved) : [];
  });
  
  const [blueprint, setBlueprint] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('attendance_blueprint') : null;
    return saved ? JSON.parse(saved) : { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  });
  
  const [absenceDates, setAbsenceDates] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('attendance_absences') : null;
    return saved ? JSON.parse(saved) : [];
  });
  
  const [holidays, setHolidays] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('attendance_holidays') : null;
    return saved ? JSON.parse(saved) : [];
  });

  const [globalTarget, setGlobalTarget] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('attendance_globalTarget') : null;
    return saved ? parseInt(saved, 10) : 85;
  });

  useEffect(() => {
    localStorage.setItem('attendance_baseline', JSON.stringify(baseline));
  }, [baseline]);
  
  useEffect(() => {
    localStorage.setItem('attendance_blueprint', JSON.stringify(blueprint));
  }, [blueprint]);
  
  useEffect(() => {
    localStorage.setItem('attendance_absences', JSON.stringify(absenceDates));
  }, [absenceDates]);
  
  useEffect(() => {
    localStorage.setItem('attendance_holidays', JSON.stringify(holidays));
  }, [holidays]);
  
  useEffect(() => {
    localStorage.setItem('attendance_globalTarget', globalTarget.toString());
  }, [globalTarget]);
  
  const clearAttendance = () => {
    setBaseline([]);
  };

  const clearTimetable = () => {
    setBlueprint({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });
  };

  const clearPlanner = () => {
    setAbsenceDates([]);
    setHolidays([]);
  };

  const clearData = () => {
    clearAttendance();
    clearTimetable();
    clearPlanner();
  };

  // ADD: Clear all attendance data (for logout)
  const clearAll = useCallback(() => {
    const keysToRemove = [
      'attendance_baseline',
      'attendance_blueprint',
      'attendance_absences',
      'attendance_holidays',
      'attendance_globalTarget'
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    setBaseline([]);
    setBlueprint({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });
    setAbsenceDates([]);
    setHolidays([]);
    setGlobalTarget(85);
  }, []);

  return {
    baseline, setBaseline,
    blueprint, setBlueprint,
    absenceDates, setAbsenceDates,
    holidays, setHolidays,
    globalTarget, setGlobalTarget,
    clearAttendance,
    clearTimetable,
    clearPlanner,
    clearData,
    clearAll
  };
};
