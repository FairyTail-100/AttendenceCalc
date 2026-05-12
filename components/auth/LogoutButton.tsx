"use client";

import { useState, useEffect } from 'react';
import { LogOut, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function LogoutButton({ store }: { store: any }) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'logging-out' | 'cleared'>('idle');

  // Reset status to idle if data is populated again (e.g. after logging back in)
  useEffect(() => {
    if (status !== 'idle' && store.baseline?.length > 0) {
      setStatus('idle');
    }
  }, [store.baseline, status]);

  const handleLogout = async () => {
    setStatus('logging-out');
    
    // Artificial delay to show feedback
    await new Promise(resolve => setTimeout(resolve, 800));
    
    store.clearAll();
    setStatus('cleared');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    router.push('/');
  };

  return (
    <button
      onClick={handleLogout}
      disabled={status !== 'idle'}
      className={`flex items-center gap-4 w-full px-3 py-3 rounded-xl transition-all duration-300 overflow-hidden relative ${
        status === 'idle' 
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400' 
          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
      }`}
    >
      <div className="shrink-0 relative w-5 h-5 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div
              key="logout-icon"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <LogOut size={20} strokeWidth={2} />
            </motion.div>
          )}
          {status === 'logging-out' && (
            <motion.div
              key="loading-icon"
              initial={{ rotate: 0, opacity: 0 }}
              animate={{ rotate: 360, opacity: 1 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Loader2 size={20} strokeWidth={2} className="text-indigo-500" />
            </motion.div>
          )}
          {status === 'cleared' && (
            <motion.div
              key="cleared-icon"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-emerald-500"
            >
              <CheckCircle2 size={20} strokeWidth={2} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 text-left">
        <AnimatePresence mode="wait">
          <motion.span 
            key={status}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className="block text-sm font-semibold whitespace-nowrap tracking-tight"
          >
            {status === 'idle' && (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Sign Out & Clear Data
              </span>
            )}
            {status === 'logging-out' && "Signing out..."}
            {status === 'cleared' && "Data Cleared!"}
          </motion.span>
        </AnimatePresence>
      </div>
    </button>
  );
}
