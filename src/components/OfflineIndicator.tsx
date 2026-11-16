import React from 'react';
import { WifiOff } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useAppState();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="print:hidden border-b border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-200"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-2">
        <WifiOff className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
        <span>{t('common.offlineBanner')}</span>
      </div>
    </div>
  );
};
