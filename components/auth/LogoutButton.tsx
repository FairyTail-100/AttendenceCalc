"use client";

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LogoutButton({ store }: { store: any }) {
  const router = useRouter();

  const handleLogout = () => {
    store.clearAll();
    router.push('/');
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-4 w-full px-3 py-3 rounded-xl transition-all duration-200 overflow-hidden text-red-500 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
    >
      <LogOut size={20} strokeWidth={2} className="shrink-0" />
      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm font-semibold whitespace-nowrap tracking-tight">
        Sign Out & Clear Data
      </span>
    </button>
  );
}
