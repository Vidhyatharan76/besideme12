import React from 'react';
import { LogIn, LogOut, Settings } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';

export const AuthBar: React.FC = () => {
  const {
    user,
    userProfile,
    authLoading,
    isSyncing,
    syncError,
    openAccountSetup,
    signOut,
    t,
  } = useAppState();

  if (authLoading) {
    return null;
  }

  const roleText =
    userProfile.familyRole === 'teen_helper'
      ? t('profile.roleHelper')
      : userProfile.familyRole === 'together'
        ? t('profile.roleTogether')
        : t('profile.roleParent');

  const displayLabel =
    userProfile.displayName ||
    user?.email ||
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    '';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          {user ? (
            <>
              <p className="text-sm font-semibold text-slate-100">
                {t('auth.signedInAs', { email: displayLabel })}
              </p>
              <p className="text-xs text-slate-400">
                {roleText}
                {user.email && userProfile.displayName ? ` · ${user.email}` : ''}
              </p>
              {isSyncing && <p className="text-xs text-teal-300">{t('auth.syncing')}</p>}
            </>
          ) : (
            <p className="text-sm text-slate-300">{t('auth.signInHint')}</p>
          )}
        </div>

        {user ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openAccountSetup}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 whitespace-nowrap shrink-0 hover:bg-slate-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              <Settings className="w-4 h-4 text-teal-400 shrink-0" aria-hidden="true" />
              <span>{t('profile.editButton')}</span>
            </button>

            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-200 whitespace-nowrap shrink-0 hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              <LogOut className="w-4 h-4 text-slate-300 shrink-0" aria-hidden="true" />
              <span>{t('auth.signOut')}</span>
            </button>
          </div>
        ) : null}
      </div>

      {syncError && (
        <p role="status" className="text-xs text-amber-300">
          {t(syncError)}
        </p>
      )}
    </div>
  );
};
