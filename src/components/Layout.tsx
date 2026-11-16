import React from 'react';
import { BookOpen, FileText, Home, IdCard, TrendingUp } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAppState } from '../hooks/useAppState';
import { AccountSetupModal } from './AccountSetupModal';
import { AuthGate } from './AuthGate';
import { LanguagePicker } from './LanguagePicker';
import { OfflineIndicator } from './OfflineIndicator';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const {
    t,
    user,
    authLoading,
    isAnyMachineTranslated,
    isTranslating,
    translationOfflineFallback,
  } = useAppState();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors pb-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-400 ${
      isActive
        ? 'text-teal-300 border-b-2 border-teal-400'
        : 'text-slate-300 hover:text-white border-b-2 border-transparent'
    }`;

  const mobileTabClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center min-h-[48px] px-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
      isActive ? 'text-teal-300 font-semibold' : 'text-slate-400 hover:text-slate-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 print:bg-white print:text-black">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:rounded-lg focus:bg-teal-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {t('common.skipToMain')}
      </a>

      <header className="print:hidden sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-12 md:h-16 max-w-5xl items-center justify-between gap-4 md:gap-8 px-4 sm:px-6">
          <Link
            to="/"
            className="font-display text-lg md:text-xl font-semibold tracking-tight text-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-400"
          >
            {t('common.appName')}
          </Link>

          {user ? (
            <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
              <NavLink to="/" end className={navLinkClass}>
                {t('nav.home')}
              </NavLink>
              <NavLink to="/words" className={navLinkClass}>
                {t('nav.words')}
              </NavLink>
              <NavLink to="/interpreter-card" className={navLinkClass}>
                {t('nav.interpreter')}
              </NavLink>
              <NavLink to="/progress" className={navLinkClass}>
                {t('nav.progress')}
              </NavLink>
            </nav>
          ) : (
            <div className="hidden md:block" aria-hidden="true" />
          )}

          <div className="flex items-center shrink-0">
            {user && (
              <Link
                to="/cheat-sheet"
                className="hidden md:inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white whitespace-nowrap shrink-0 hover:bg-teal-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
              >
                <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t('nav.cheatSheet')}</span>
              </Link>
            )}
            <div className="md:hidden">
              <LanguagePicker variant="compact" />
            </div>
          </div>
        </div>
      </header>

      <OfflineIndicator />

      {isAnyMachineTranslated && (
        <div
          role="note"
          className="print:hidden border-b border-slate-800 bg-slate-900/90 px-4 py-2 text-xs text-slate-300"
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <span>{t('common.machineTranslatedNotice')}</span>
            {isTranslating && (
              <span className="text-teal-300 font-medium">{t('common.translatingWord')}</span>
            )}
          </div>
        </div>
      )}

      {translationOfflineFallback && (
        <div
          role="status"
          aria-live="polite"
          className="print:hidden border-b border-amber-800/60 bg-amber-950/50 px-4 py-2 text-xs font-medium text-amber-200"
        >
          <div className="mx-auto max-w-5xl">{t('common.translationOfflineFallback')}</div>
        </div>
      )}

      <main
        id="main-content"
        className={`flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-8 ${
          user ? 'pb-24 md:pb-10' : 'pb-10'
        } print:max-w-none print:p-0`}
      >
        {authLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="flex min-h-[45vh] items-center justify-center"
          >
            <p className="text-sm font-medium text-slate-300">{t('auth.loadingAccount')}</p>
          </div>
        ) : user ? (
          children
        ) : (
          <AuthGate />
        )}
      </main>

      <footer
        className={`border-t border-slate-800 bg-slate-900/70 py-5 ${
          user ? 'pb-20 md:pb-6' : 'pb-6'
        } px-4 sm:px-6 print:border-t print:border-black print:bg-white print:py-3 print:pb-3`}
      >
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-400 print:text-black">
          <p className="font-medium text-slate-200 print:text-black">
            {user ? t('common.footerPrivacySignedIn') : t('common.footerPrivacy')}
          </p>
          <p className="print:hidden">
            {t('common.appName')} · {t('common.appSubtitle')}
          </p>
        </div>
      </footer>

      {user && (
        <nav
          aria-label="Mobile navigation"
          className="print:hidden md:hidden fixed bottom-0 inset-x-0 z-40 h-14 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md"
        >
          <div className="grid grid-cols-4 h-full">
            <NavLink to="/" end className={mobileTabClass}>
              <Home className="w-5 h-5 mb-0.5" aria-hidden="true" />
              <span className="truncate max-w-full">{t('nav.home')}</span>
            </NavLink>
            <NavLink to="/words" className={mobileTabClass}>
              <BookOpen className="w-5 h-5 mb-0.5" aria-hidden="true" />
              <span className="truncate max-w-full">{t('nav.words')}</span>
            </NavLink>
            <NavLink to="/interpreter-card" className={mobileTabClass}>
              <IdCard className="w-5 h-5 mb-0.5" aria-hidden="true" />
              <span className="truncate max-w-full">{t('nav.interpreter')}</span>
            </NavLink>
            <NavLink to="/progress" className={mobileTabClass}>
              <TrendingUp className="w-5 h-5 mb-0.5" aria-hidden="true" />
              <span className="truncate max-w-full">{t('nav.progress')}</span>
            </NavLink>
          </div>
        </nav>
      )}

      <AccountSetupModal />
    </div>
  );
};
