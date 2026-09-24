import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { useTranslation } from '../i18n';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'button' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { t } = useTranslation();
  const [showGuide, setShowGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running as an installed standalone PWA, suppress
  if (isInstalled && !justInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setJustInstalled(true);
        setTimeout(() => setJustInstalled(false), 5000);
      }
    } else {
      setShowGuide(true);
    }
  };

  if (justInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold animate-pulse">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>Installed!</span>
      </div>
    );
  }

  return (
    <>
      <button
        id="btn-pwa-install"
        type="button"
        onClick={handleInstallClick}
        className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm ${
          isInstallable
            ? 'bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/40 border border-white/20 hover:scale-[1.02]'
            : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 hover:border-white/20 backdrop-blur-md'
        } ${className}`}
        title={t('header.installPwaTitle')}
      >
        <img
          src="/favicon-32x32.png"
          alt="ROM Manager"
          className="w-3.5 h-3.5 rounded-sm object-contain group-hover:rotate-6 transition-transform"
        />
        <Download className="w-3.5 h-3.5 text-cyan-300" />
        <span className="hidden md:inline font-medium">{t('header.installPwa')}</span>
      </button>

      {/* Guide Modal for iOS or manual install fallback */}
      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/15 p-6 shadow-2xl text-slate-100">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <img
                  src="/favicon.png"
                  alt="App Icon"
                  className="w-12 h-12 rounded-xl border border-white/20 shadow-md p-1 bg-slate-950"
                />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t('pwa.installTitle')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ROM Collection Manager
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instructions */}
            <div className="py-4 space-y-3 text-xs text-slate-300">
              <p className="text-slate-300 leading-relaxed">
                {t('pwa.installDesc')}
              </p>

              {isIOS ? (
                <div className="rounded-xl bg-slate-950/60 p-3.5 border border-cyan-500/20 space-y-2.5">
                  <div className="flex items-center gap-2 font-semibold text-cyan-300">
                    <Smartphone className="w-4 h-4" />
                    <span>{t('pwa.iosTitle')}</span>
                  </div>
                  <div className="space-y-2 pl-1">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                      <div className="flex items-center gap-1.5">
                        <span>{t('pwa.iosStep1')}</span>
                        <Share2 className="w-3.5 h-3.5 text-cyan-400 inline" />
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                      <div className="flex items-center gap-1.5">
                        <span>{t('pwa.iosStep2')}</span>
                        <PlusSquare className="w-3.5 h-3.5 text-cyan-400 inline" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-950/60 p-3.5 border border-slate-700/50 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-200">
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>Desktop / Chrome / Edge</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Klicke im Adressfeld deines Browsers auf das Installations-Symbol <Download className="w-3.5 h-3.5 inline text-cyan-400 mx-0.5" /> (oder im Menü auf „App installieren“), um den ROM Collection Manager als eigenständige Desktop-App mit eigenem Icon zu speichern.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                {t('pwa.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
