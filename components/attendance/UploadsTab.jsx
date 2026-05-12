"use client";

import { useState } from 'react';
import { parseAttendance, parseTimetable } from '@/lib/universalParser';
import LoginModal from '../auth/LoginModal';

export default function UploadsTab({ store, onSwitchTab }) {
  const [attendanceHtml, setAttendanceHtml] = useState('');
  const [timetableHtml, setTimetableHtml] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeFeedback, setActiveFeedback] = useState(null);
  
  // New state for mode selection
  const [mode, setMode] = useState(null); // 'erp' or 'manual' or null
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleAttendance = () => {
    try {
      if (!attendanceHtml) throw new Error("Attendance data is required.");
      const subjects = parseAttendance(attendanceHtml);
      store.setBaseline(subjects);
      setError('');
      setSuccessMsg('Attendance Baseline successfully updated!');
      setActiveFeedback('attendance');
      setTimeout(() => { setSuccessMsg(''); setActiveFeedback(null); }, 3000);
    } catch (err) {
      setError(err.message);
      setSuccessMsg('');
      setActiveFeedback('attendance');
      setTimeout(() => { setError(''); setActiveFeedback(null); }, 5000);
    }
  };

  const handleTimetable = () => {
    try {
      if (!timetableHtml) throw new Error("Timetable data is required.");
      const blueprint = parseTimetable(timetableHtml);
      store.setBlueprint(blueprint);
      setError('');
      setSuccessMsg('Timetable Blueprint successfully updated!');
      setActiveFeedback('timetable');
      setTimeout(() => { setSuccessMsg(''); setActiveFeedback(null); }, 3000);
    } catch (err) {
      setError(err.message);
      setSuccessMsg('');
      setActiveFeedback('timetable');
      setTimeout(() => { setError(''); setActiveFeedback(null); }, 5000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10 pb-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">Data Ingestion</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
          Note: You need to login to the ERP to update to the latest attendance.
        </p>
      </div>
      
      {/* Global feedback */}
      <div className="h-0 overflow-visible relative">
        {activeFeedback === null && (error || successMsg) && (
          <div className={`absolute top-0 left-0 right-0 z-10 rounded-xl px-6 py-4 mb-8 text-sm font-medium shadow-sm transition-all duration-300 ${
            error ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20' : 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-500/20'
          }`}>
            {error || successMsg}
          </div>
        )}
      </div>

      {!mode ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-10 shadow-sm mb-8 text-center">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">How would you like to load data?</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Choose between automatic fetching or manual text pasting.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => setShowLoginModal(true)}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-transparent bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer group"
            >
              <span className="text-3xl">🔗</span>
              <div>
                <div className="font-bold">KLU ERP</div>
                <div className="text-xs opacity-80 mt-1">Auto-import attendance & timetable</div>
              </div>
            </button>

            <button 
              onClick={() => setMode('manual')}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all cursor-pointer group"
            >
              <span className="text-3xl">📋</span>
              <div>
                <div className="font-bold">Paste Manually</div>
                <div className="text-xs opacity-80 mt-1">HTML or Text from ERP</div>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex justify-between items-center">
          <button 
            onClick={() => setMode(null)}
            className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline"
          >
            ← Back to options
          </button>
        </div>
      )}

      {/* Manual Paste UI */}
      {mode === 'manual' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-8 shadow-sm mb-8 transition-shadow hover:shadow-md duration-300">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h2 id="attendance-label" className="text-lg font-medium text-gray-900 dark:text-white">Attendance Baseline</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Paste raw HTML or copied text from the ERP here.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {activeFeedback === 'attendance' && (error || successMsg) && (
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg animate-in fade-in zoom-in duration-300 ${
                    error ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                  }`}>
                    {error || successMsg}
                  </span>
                )}
                <button 
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm py-2 px-4 rounded-xl transition-colors duration-200 shadow-sm shadow-purple-600/20 active:scale-[0.98]"
                  onClick={handleAttendance}
                  aria-label="Process and Publish Attendance Data"
                >
                  Publish Attendance
                </button>
              </div>
            </div>
            <textarea 
              id="attendance-input"
              rows="6" 
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-y text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
              value={attendanceHtml}
              onChange={e => setAttendanceHtml(e.target.value)}
              placeholder="Paste data here..."
              aria-labelledby="attendance-label"
            />
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-8 shadow-sm mb-8 transition-shadow hover:shadow-md duration-300">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h2 id="timetable-label" className="text-lg font-medium text-gray-900 dark:text-white">Timetable Blueprint</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Paste raw HTML or copied text of your timetable.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {activeFeedback === 'timetable' && (error || successMsg) && (
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg animate-in fade-in zoom-in duration-300 ${
                    error ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                  }`}>
                    {error || successMsg}
                  </span>
                )}
                <button 
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm py-2 px-4 rounded-xl transition-colors duration-200 shadow-sm shadow-purple-600/20 active:scale-[0.98]"
                  onClick={handleTimetable}
                  aria-label="Process and Publish Timetable Data"
                >
                  Publish Timetable
                </button>
              </div>
            </div>
            <textarea 
              id="timetable-input"
              rows="6" 
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-y text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
              value={timetableHtml}
              onChange={e => setTimetableHtml(e.target.value)}
              placeholder="Paste data here..."
              aria-labelledby="timetable-label"
            />
          </div>
        </div>
      )}

      {/* Render Login Modal if open */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)} 
          onSuccess={() => {
            setShowLoginModal(false);
            if (onSwitchTab) onSwitchTab();
          }}
          store={store}
        />
      )}
    </div>
  );
}
