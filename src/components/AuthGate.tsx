import React, { useId, useState } from 'react';
import { Check, Lock, Mail, UserPlus } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { LanguagePicker } from './LanguagePicker';

export const AuthGate: React.FC = () => {
  const { t, signInWithEmail, signUpWithEmail, isSigningIn, authError, authErrorVars } = useAppState();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const emailId = useId();
  const passwordId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || password.length < 6) {
      setLocalError(t('auth.emailRequiredError'));
      return;
    }

    if (isSignUp) {
      await signUpWithEmail(trimmedEmail, password);
    } else {
      await signInWithEmail(trimmedEmail, password);
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-6 sm:py-12 space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <section aria-labelledby="auth-gate-title" className="lg:col-span-7 space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-950/40 px-3.5 py-1 text-xs font-medium text-teal-300 backdrop-blur-xs">
            <span>{t('common.appName')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('common.appSubtitle')}</span>
          </div>

          <h1
            id="auth-gate-title"
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-50 leading-[1.15] text-balance"
          >
            {t('auth.gateTitle')}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed text-balance">
            {t('home.promise')}
          </p>

          <ul className="space-y-3.5 pt-3 text-sm sm:text-base text-slate-200">
            <li className="flex items-start gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-950 text-teal-400 mt-0.5">
                <Check className="w-4 h-4" aria-hidden="true" />
              </span>
              <span className="leading-normal">{t('auth.gateBenefit1')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-950 text-teal-400 mt-0.5">
                <Check className="w-4 h-4" aria-hidden="true" />
              </span>
              <span className="leading-normal">{t('auth.gateBenefit2')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-950 text-teal-400 mt-0.5">
                <Check className="w-4 h-4" aria-hidden="true" />
              </span>
              <span className="leading-normal">{t('auth.gateBenefit3')}</span>
            </li>
          </ul>
        </section>

        <div className="lg:col-span-5 relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-teal-500/20 via-emerald-500/10 to-transparent blur-xl pointer-events-none" aria-hidden="true" />
          <section
            aria-label={t('auth.signIn')}
            className="relative rounded-3xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-950/80 text-teal-300 border border-teal-800/50">
                <Lock className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold text-slate-50">
                  {isSignUp ? t('auth.signUpButton') : t('auth.signInButton')}
                </h2>
                <p className="text-xs text-slate-400">
                  {isSignUp ? 'Create your secure private account' : 'Access your saved prep kit'}
                </p>
              </div>
            </div>

            {(localError || authError) && (
              <p
                role="alert"
                className="rounded-xl border border-rose-800/70 bg-rose-950/50 px-4 py-3 text-sm font-medium text-rose-200 animate-fadeIn"
              >
                {localError || t(authError!, authErrorVars)}
              </p>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor={emailId} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t('auth.emailLabel')}
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute start-3.5 pointer-events-none" aria-hidden="true" />
                  <input
                    id={emailId}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className="w-full min-h-[48px] rounded-xl border border-slate-700/80 bg-slate-950 ps-10 pe-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor={passwordId} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t('auth.passwordLabel')}
                </label>
                <input
                  id={passwordId}
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="w-full min-h-[48px] rounded-xl border border-slate-700/80 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSigningIn}
                className="w-full min-h-[50px] inline-flex items-center justify-center gap-2.5 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/30 hover:bg-teal-500 disabled:opacity-60 transition-all active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
              >
                {isSignUp ? <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" /> : <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />}
                <span>{isSigningIn ? t('auth.signingIn') : (isSignUp ? t('auth.signUpButton') : t('auth.signInButton'))}</span>
              </button>
            </form>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp((prev) => !prev);
                  setLocalError('');
                }}
                className="text-xs font-semibold text-teal-300 hover:text-teal-200 underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
              >
                {isSignUp ? t('auth.modeSwitchToSignIn') : t('auth.modeSwitchToSignUp')}
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pt-4 border-t border-slate-800">
              {t('auth.signInHint')}
            </p>
          </section>
        </div>
      </div>

      <section
        aria-label={t('common.languageLabel')}
        className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm"
      >
        <LanguagePicker variant="prominent" />
      </section>
    </div>
  );
};
