"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { scrapeResultToBaseline, timetableResultToBlueprint } from '@/lib/erpDataBridge';

export default function LoginModal({ onClose, onSuccess, store }: { onClose: () => void, onSuccess: () => void, store: any }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState({ csrfToken: '', jar: '' });
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [year, setYear] = useState('19');
  const [semester, setSemester] = useState('4');
  
  const [captchaUrl, setCaptchaUrl] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(''); // 'Logging in...', 'Fetching Data...', etc.

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/session');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize session');
      
      setSession({ csrfToken: data.csrfToken, jar: data.jar });
      refreshCaptcha(data.jar);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCaptcha = useCallback((jarToUse: string = session.jar) => {
    if (!jarToUse) return;
    // URL-encode the jar to prevent truncation issues
    setCaptchaUrl(`/api/captcha?jar=${encodeURIComponent(jarToUse)}&t=${Date.now()}`);
  }, [session.jar]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !captchaText) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSubmitLoading(true);
      setError('');
      setSubmitStatus('Authenticating...');

      // 1. Login
      const loginRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          captcha: captchaText,
          csrfToken: session.csrfToken,
          jar: session.jar
        })
      });
      const loginData = await loginRes.json();
      
      if (!loginRes.ok) {
        throw new Error(loginData.error || 'Login failed');
      }

      const authenticatedJar = loginData.jar;

      setSubmitStatus('Fetching Attendance & Timetable...');

      // 2. Fetch Scrape and Timetable in parallel
      const [scrapeRes, timetableRes] = await Promise.all([
        fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jar: authenticatedJar, year, semester })
        }),
        fetch('/api/timetable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jar: authenticatedJar, academicyear: year, semesterid: semester })
        })
      ]);

      const scrapeData = await scrapeRes.json();
      const timetableData = await timetableRes.json();

      if (!scrapeRes.ok || !scrapeData.success) {
        throw new Error(scrapeData.error || 'Failed to fetch attendance data');
      }
      if (!timetableRes.ok || !timetableData.success) {
        console.warn('Timetable fetch failed:', timetableData.error);
        // We might not want to fail completely if only timetable fails, but for now we log it.
      }

      setSubmitStatus('Processing Data...');

      // 3. Bridge the data
      const baseline = scrapeResultToBaseline(scrapeData.data || []);
      const blueprint = timetableResultToBlueprint(timetableData || { days: [] });

      // 4. Update store
      store.setBaseline(baseline);
      store.setBlueprint(blueprint);
      
      onSuccess();

    } catch (err: any) {
      setError(err.message);
      // If error is likely captcha/login related, refresh captcha
      refreshCaptcha();
      setCaptchaText('');
    } finally {
      setSubmitLoading(false);
      setSubmitStatus('');
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">KLU ERP Login</h2>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-500/20">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="animate-spin text-indigo-500 mb-2" size={32} />
                <p className="text-sm text-slate-500">Initializing secure session...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Year</label>
                    <select 
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="29">2026-2027</option>
                      <option value="19">2025-2026</option>
                      <option value="16">2024-2025</option>
                      <option value="15">2023-2024</option>
                      <option value="14">2022-2023</option>
                      <option value="13">2021-2022</option>
                      <option value="10">2020-2021</option>
                      <option value="9">2019-2020</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Semester</label>
                    <select 
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="1">Odd Sem</option>
                      <option value="2">Even Sem</option>
                      <option value="3">Summer Term</option>
                      <option value="4">Term3</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">University ID</label>
                  <input 
                    type="text" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    placeholder="Enter University ID"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    placeholder="Enter Password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Security Code</label>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      required
                      value={captchaText}
                      onChange={(e) => setCaptchaText(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      placeholder="Code"
                    />
                    {captchaUrl ? (
                      <div 
                        className="h-[42px] bg-white rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer relative group"
                        onClick={() => refreshCaptcha()}
                        title="Click to refresh captcha"
                      >
                        <img src={captchaUrl} alt="Captcha" className="h-full object-contain" />
                        <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <RefreshCw size={16} className="text-slate-700 bg-white/80 p-0.5 rounded-full" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-[100px] h-[42px] bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                    )}
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={submitLoading || !session.csrfToken}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      {submitStatus}
                    </>
                  ) : 'Login & Sync Data'}
                </button>
              </form>
            )}
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-center text-slate-500">
              Your credentials are never stored. The session is discarded immediately after data is fetched.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
