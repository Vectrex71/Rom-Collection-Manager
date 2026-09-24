import React, { useState } from 'react';
import {
  Sparkles,
  Gamepad2,
  FolderSync,
  Disc,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Layers,
  FileCheck,
  Zap,
  Box,
  Languages,
  ChevronDown,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { PLATFORMS } from '../data/platformsData';
import { useTranslation } from '../i18n';

interface LandingPageProps {
  onStartScan: () => void;
  hasLoadedRoms?: boolean;
  onOpenCover3dModal?: () => void;
  onOpenBiosStudio?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartScan,
  hasLoadedRoms = false,
  onOpenCover3dModal,
  onOpenBiosStudio,
}) => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<'after' | 'before'>('after');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div id="landing-page-root" className="w-full text-slate-100 pb-20 space-y-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* 1. HERO SECTION (Translucent Frosted Glass Card with Ambient Aura) */}
      <section className="relative frosted-glass rounded-3xl p-6 sm:p-12 text-center space-y-7 overflow-hidden border border-white/15 shadow-2xl">
        {/* Ambient Top Glow Aura */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-linear-to-r from-violet-600/25 via-fuchsia-600/20 to-amber-500/15 blur-3xl rounded-full pointer-events-none" />

        {/* Top Chip */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-semibold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>{t('landing.badge')}</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
          {t('landing.heroTitle')}{' '}
          <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent block sm:inline drop-shadow-sm">
            {t('landing.heroTitleHighlight')}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
          {language === 'de' ? (
            <>
              Schluss mit Dateichaos, Duplikaten und kryptischen Namen wie{' '}
              <code className="bg-slate-950/70 text-amber-300 px-1.5 py-0.5 rounded border border-white/15 text-xs font-mono font-bold backdrop-blur-xs">
                smw_v1_0_[b1].smc
              </code>
              . Der ROM Collection Manager analysiert deine Sammlung nach No-Intro- & 1G1R-Standards,
              sortiert Multi-Disk-Spiele automatisch in Unterordner und erstellt fertige M3U-Playlists.
            </>
          ) : (
            <>
              No more file chaos, duplicates, and cryptic filenames like{' '}
              <code className="bg-slate-950/70 text-amber-300 px-1.5 py-0.5 rounded border border-white/15 text-xs font-mono font-bold backdrop-blur-xs">
                smw_v1_0_[b1].smc
              </code>
              . ROM Collection Manager analyzes your library using No-Intro and 1G1R standards,
              organizes multi-disc sets into subfolders, and generates plug-and-play M3U playlists.
            </>
          )}
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            id="landing-hero-cta-start"
            onClick={onStartScan}
            className="px-7 py-3.5 rounded-xl font-extrabold text-sm text-white bg-linear-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-[0.98] shadow-lg shadow-violet-600/40 hover:shadow-violet-600/60 transition-all flex items-center gap-2.5 cursor-pointer group border border-white/20"
          >
            <Gamepad2 className="w-5 h-5 text-amber-300" />
            <span>
              {hasLoadedRoms 
                ? (language === 'de' ? 'Zurück zur Sammlung' : 'Back to Collection') 
                : t('landing.btnScanNow')}
            </span>
            <ArrowRight className="w-4 h-4 text-amber-300 group-hover:translate-x-1.5 transition-transform" />
          </button>

          <a
            href="#how-it-works"
            className="px-5 py-3.5 rounded-xl font-bold text-sm text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-white/15 hover:border-white/25 backdrop-blur-md transition flex items-center gap-2 shadow-xs"
          >
            <span>{t('landing.btnFeatures')}</span>
          </a>

          {onOpenBiosStudio && (
            <button
              onClick={onOpenBiosStudio}
              className="px-5 py-3.5 rounded-xl font-bold text-sm text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-purple-500/30 hover:border-purple-500/50 backdrop-blur-md transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>{language === 'de' ? 'BIOS Studio' : 'BIOS Studio'}</span>
            </button>
          )}
        </div>

        {/* Quick Metrics */}
        <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="bg-slate-950/50 backdrop-blur-md p-4 rounded-2xl border border-cyan-500/20 hover:border-cyan-500/40 transition shadow-xs group">
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-black text-cyan-400 group-hover:scale-105 transition-transform">{PLATFORMS.length}</span>
              <Cpu className="w-4 h-4 text-cyan-500/60" />
            </div>
            <div className="text-xs text-slate-300 font-bold mt-1">{t('landing.metrics.systemsCount')}</div>
          </div>
          <div className="bg-slate-950/50 backdrop-blur-md p-4 rounded-2xl border border-violet-500/20 hover:border-violet-500/40 transition shadow-xs group">
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-black text-violet-400 group-hover:scale-105 transition-transform">1G1R</span>
              <Layers className="w-4 h-4 text-violet-500/60" />
            </div>
            <div className="text-xs text-slate-300 font-bold mt-1">{t('landing.metrics.oneG1r')}</div>
          </div>
          <div className="bg-slate-950/50 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 transition shadow-xs group">
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 group-hover:scale-105 transition-transform">M3U</span>
              <Disc className="w-4 h-4 text-emerald-500/60" />
            </div>
            <div className="text-xs text-slate-300 font-bold mt-1">{t('landing.metrics.m3u')}</div>
          </div>
          <div className="bg-slate-950/50 backdrop-blur-md p-4 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 transition shadow-xs group">
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-black text-amber-400 group-hover:scale-105 transition-transform">{t('landing.metrics.safe')}</span>
              <ShieldCheck className="w-4 h-4 text-amber-500/60" />
            </div>
            <div className="text-xs text-slate-300 font-bold mt-1">{t('landing.metrics.safeDesc')}</div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE BEFORE & AFTER SHOWCASE (Developer Terminal Framing) */}
      <section className="frosted-glass rounded-3xl overflow-hidden border border-white/15 shadow-2xl">
        <div className="px-6 py-4 border-b border-white/10 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span>{t('landing.beforeAfter.title')}</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {t('landing.beforeAfter.subtitle')}
            </p>
          </div>

          {/* VORHER links, NACHHER rechts */}
          <div className="inline-flex rounded-xl p-1 bg-slate-900/80 border border-white/15 backdrop-blur-md shadow-inner">
            <button
              id="tab-btn-before"
              type="button"
              onClick={() => setActiveTab('before')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'before'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('landing.beforeAfter.btnBefore')}
            </button>
            <button
              id="tab-btn-after"
              type="button"
              onClick={() => setActiveTab('after')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'after'
                  ? 'bg-linear-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-900/50 border border-white/15'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('landing.beforeAfter.btnAfter')}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Terminal Window Shell */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl overflow-hidden">
            {/* Terminal Title Bar */}
            <div className="px-4 py-2.5 bg-slate-900/80 border-b border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/90 inline-block shadow-xs" />
                <span className="w-3 h-3 rounded-full bg-amber-500/90 inline-block shadow-xs" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/90 inline-block shadow-xs" />
                <span className="text-slate-400 font-mono text-[11px] ml-2">
                  terminal: ~/roms/collection
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                {activeTab === 'after' ? t('landing.beforeAfter.statusClean') : t('landing.beforeAfter.statusUnorganized')}
              </span>
            </div>

            {activeTab === 'after' ? (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-300 bg-emerald-950/60 px-3.5 py-2.5 rounded-xl border border-emerald-500/40">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    {t('landing.beforeAfter.afterBanner')}
                  </span>
                </div>

                <div className="font-mono text-xs text-slate-200 space-y-3 overflow-x-auto">
                  <div className="text-slate-400 font-semibold">{t('landing.beforeAfter.afterNoteMultiDisc')}</div>
                  <div className="text-emerald-400 font-bold">
                    📂 Commodore Amiga/
                    <div className="pl-5 text-violet-300 font-normal">
                      📄 Secret of Monkey Island.m3u{' '}
                      <span className="text-emerald-300 text-[11px] font-sans font-bold">
                        {t('landing.beforeAfter.afterNoteOneEntry')}
                      </span>
                    </div>
                    <div className="pl-5 text-slate-300 font-normal">
                      📂 Secret of Monkey Island/
                      <div className="pl-5 text-slate-400">
                        ├── 📄 Secret of Monkey Island (Europe) (Disk 1).adf
                      </div>
                      <div className="pl-5 text-slate-400">
                        ├── 📄 Secret of Monkey Island (Europe) (Disk 2).adf
                      </div>
                      <div className="pl-5 text-slate-400">
                        └── 📄 Secret of Monkey Island (Europe) (Disk 3).adf
                      </div>
                    </div>
                  </div>

                  <div className="text-emerald-400 font-bold pt-2">
                    📂 Nintendo NES/
                    <div className="pl-5 text-slate-200 font-normal">
                      ├── 📄 Super Mario Bros. 3 (Europe).nes{' '}
                      <span className="text-emerald-400 text-[11px] font-sans font-bold">
                        {t('landing.beforeAfter.afterNote1g1r')}
                      </span>
                    </div>
                    <div className="pl-5 text-slate-200 font-normal">
                      └── 📄 The Legend of Zelda (Europe).nes
                    </div>
                  </div>

                  <div className="text-amber-400 font-bold pt-2">
                    📂 _Duplicates/{' '}
                    <span className="text-slate-400 text-[11px] font-sans font-normal">
                      {t('landing.beforeAfter.afterNoteDuplicates')}
                    </span>
                    <div className="pl-5 text-slate-400 font-normal">
                      ├── 📄 Super Mario Bros. 3 (USA).nes <span className="text-slate-500">({t('landing.beforeAfter.clone')})</span>
                    </div>
                    <div className="pl-5 text-slate-400 font-normal">
                      ├── 📄 smb3_v1_0_[b1].nes <span className="text-rose-400">({t('landing.beforeAfter.badDump')})</span>
                    </div>
                    <div className="pl-5 text-slate-500 font-normal">└── 📄 .DS_Store, Thumbs.db ({t('landing.beforeAfter.cacheJunk')})</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2.5 text-xs font-bold text-amber-300 bg-amber-950/60 px-3.5 py-2.5 rounded-xl border border-amber-500/40">
                  <span className="text-base shrink-0">⚠️</span>
                  <span>
                    {t('landing.beforeAfter.beforeBanner')}
                  </span>
                </div>

                <div className="font-mono text-xs text-slate-300 space-y-2 overflow-x-auto">
                  <div className="text-rose-400 font-bold">{t('landing.beforeAfter.beforeNoteChaos')}</div>
                  <div className="pl-5 text-rose-300">
                    ├── 📄 Secret of Monkey Island, The (E) (Disk 1 of 3) [!].adf
                  </div>
                  <div className="pl-5 text-rose-300">
                    ├── 📄 Secret of Monkey Island, The (E) (Disk 2 of 3) [!].adf
                  </div>
                  <div className="pl-5 text-rose-300">
                    ├── 📄 Secret of Monkey Island, The (E) (Disk 3 of 3) [!].adf
                  </div>
                  <div className="pl-5 text-rose-400/90 font-sans text-[11px] font-bold">
                    {t('landing.beforeAfter.beforeNoteRetroArchBug')}
                  </div>
                  <div className="pl-5 text-slate-400">├── 📄 Super Mario Bros. 3 (Europe).nes</div>
                  <div className="pl-5 text-amber-300">
                    ├── 📄 Super Mario Bros. 3 (USA).nes <span className="text-slate-500">({t('landing.beforeAfter.beforeNoteDuplicate')})</span>
                  </div>
                  <div className="pl-5 text-rose-400">
                    ├── 📄 smb3_v1_0_[b1].nes <span className="text-slate-500">({t('landing.beforeAfter.beforeNoteBadCrash')})</span>
                  </div>
                  <div className="pl-5 text-slate-600">└── 📄 .DS_Store, Thumbs.db, game.tmp</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. DIE 8 KERNFUNKTIONEN (Translucent Frosted Bento Grid) */}
      <section id="how-it-works" className="frosted-glass rounded-3xl p-6 sm:p-10 space-y-8 border border-white/15 shadow-2xl">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h3 className="text-2xl sm:text-3xl font-black text-white">
            {t('landing.features8.sectionTitle')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            {t('landing.features8.sectionSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. 1G1R & Duplikate */}
          <div className="card-hover-lift bg-slate-950/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-3 shadow-md">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/40 text-violet-300 flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">
              {t('landing.features8.f1Title')}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {t('landing.features8.f1Desc')}
            </p>
          </div>

          {/* 2. Vollautomatisch Multi-Disk & M3U */}
          <div className="card-hover-lift bg-slate-950/60 backdrop-blur-md p-6 rounded-2xl border border-emerald-500/30 space-y-3 shadow-md relative overflow-hidden">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-emerald-600/30 to-teal-600/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold shadow-xs">
              <Disc className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">
              {t('landing.features8.f2Title')}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {t('landing.features8.f2Desc')}
            </p>
          </div>

          {/* 3. Automatische Plattform-Einsortierung */}
          <div className="card-hover-lift bg-slate-950/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-3 shadow-md">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-cyan-600/30 to-blue-600/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold shadow-xs">
              <FolderSync className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">
              {t('landing.features8.f3Title', { count: PLATFORMS.length })}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {t('landing.features8.f3Desc')}
            </p>
          </div>

          {/* 4. No-Intro Standard Bereinigung */}
          <div className="card-hover-lift bg-slate-950/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-3 shadow-md">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-amber-600/30 to-yellow-600/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold shadow-xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">
              {t('landing.features8.f4Title')}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {t('landing.features8.f4Desc')}
            </p>
          </div>

          {/* 5. Top 200 Spiele Kuration */}
          <div className="card-hover-lift bg-slate-950/60 backdrop-blur-md p-6 rounded-2xl border border-purple-500/30 space-y-3 shadow-md">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-purple-600/30 to-fuchsia-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">
              {t('landing.features8.f5Title')}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {t('landing.features8.f5Desc')}
            </p>
          </div>

          {/* 6. 100% Sicher */}
          <div className="card-hover-lift bg-slate-950/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 space-y-3 shadow-md">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-rose-600/30 to-pink-600/20 border border-rose-500/40 text-rose-300 flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">
              {t('landing.features8.f6Title')}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {t('landing.features8.f6Desc')}
            </p>
          </div>

          {/* 7. Romhacks & Fan-Translations Schutz */}
          <div className="card-hover-lift bg-slate-950/60 backdrop-blur-md p-6 rounded-2xl border border-cyan-500/30 space-y-3 shadow-md">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-teal-600/30 to-cyan-600/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold shadow-xs">
              <Languages className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">
              {t('landing.features8.f7Title')}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {t('landing.features8.f7Desc')}
            </p>
          </div>

          {/* 8. 3D Cover Studio */}
          <div className="card-hover-lift bg-slate-950/60 backdrop-blur-md p-6 rounded-2xl border border-fuchsia-500/30 space-y-3 shadow-md">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-fuchsia-600/30 to-rose-600/20 border border-fuchsia-500/40 text-fuchsia-300 flex items-center justify-center font-bold shadow-xs">
              <Box className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">
              {t('landing.features8.f8Title')}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {t('landing.features8.f8Desc')}
            </p>
          </div>
        </div>
      </section>

      {/* 4. THE MULTI-DISC DEEP DIVE */}
      <section className="frosted-glass rounded-3xl p-8 sm:p-12 border border-violet-500/35 space-y-6 shadow-2xl">
        <h3 className="text-2xl sm:text-3xl font-black text-white">
          {t('landing.multiDiscDeep.title')}
        </h3>

        <p className="text-sm text-slate-300 leading-relaxed max-w-2xl font-normal">
          {t('landing.multiDiscDeep.desc')}{' '}
          <strong className="text-white block mt-1">{t('landing.multiDiscDeep.highlight')}</strong>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950/60 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-2 shadow-xs">
            <div className="font-bold text-amber-400 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-xs">
                1
              </span>
              <span>{t('landing.multiDiscDeep.step1Title')}</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {t('landing.multiDiscDeep.step1Desc')}
            </p>
          </div>

          <div className="bg-slate-950/60 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-2 shadow-xs">
            <div className="font-bold text-amber-400 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-xs">
                2
              </span>
              <span>{t('landing.multiDiscDeep.step2Title')}</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {t('landing.multiDiscDeep.step2Desc')}
            </p>
          </div>

          <div className="bg-slate-950/60 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-2 shadow-xs">
            <div className="font-bold text-amber-400 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-xs">
                3
              </span>
              <span>{t('landing.multiDiscDeep.step3Title')}</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {t('landing.multiDiscDeep.step3Desc')}
            </p>
          </div>
        </div>
      </section>

      {/* 5. SUPPORTED EMULATORS */}
      <section className="frosted-glass rounded-3xl p-6 sm:p-10 text-center space-y-6 border border-white/15 shadow-2xl">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
          {t('landing.emulators.title')}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-white">
          <div className="card-hover-lift bg-slate-950/60 backdrop-blur-md p-4.5 rounded-2xl border border-white/10 shadow-xs">
            🎮 RetroArch
            <div className="text-[11px] text-slate-300 font-normal mt-1">{t('landing.emulators.retroArch')}</div>
          </div>
          <div className="card-hover-lift bg-slate-950/60 backdrop-blur-md p-4.5 rounded-2xl border border-white/10 shadow-xs">
            🕹️ Batocera.linux
            <div className="text-[11px] text-slate-300 font-normal mt-1">{t('landing.emulators.batocera')}</div>
          </div>
          <div className="card-hover-lift bg-slate-950/60 backdrop-blur-md p-4.5 rounded-2xl border border-white/10 shadow-xs">
            📟 Steam Deck / EmuDeck
            <div className="text-[11px] text-slate-300 font-normal mt-1">{t('landing.emulators.steamDeck')}</div>
          </div>
          <div className="card-hover-lift bg-slate-950/60 backdrop-blur-md p-4.5 rounded-2xl border border-white/10 shadow-xs">
            ⚙️ MiSTer FPGA & Pocket
            <div className="text-[11px] text-slate-300 font-normal mt-1">{t('landing.emulators.mister')}</div>
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section className="frosted-glass rounded-3xl p-6 sm:p-10 space-y-6 border border-white/15 shadow-2xl">
        <div className="text-center">
          <h3 className="text-2xl font-black text-white">{t('landing.faqList.title')}</h3>
          <p className="text-xs text-slate-300 font-medium mt-1">{t('landing.faqList.subtitle')}</p>
        </div>

        <div className="space-y-3 text-xs">
          {/* FAQ 1 */}
          <div className="bg-slate-950/60 rounded-2xl border border-white/10 overflow-hidden shadow-xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => toggleFaq(1)}
              className="w-full text-left px-5 py-4 font-bold text-white flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
            >
              <span>{t('landing.faqList.q1')}</span>
              <ChevronDown className={`w-4 h-4 text-violet-400 transition-transform duration-200 ${openFaq === 1 ? 'rotate-180' : ''}`} />
            </button>
            {openFaq === 1 && (
              <div className="px-5 pb-4 text-slate-300 font-normal leading-relaxed border-t border-white/10 pt-3">
                <strong className="text-white font-bold">{t('landing.faqList.a1Prefix')} </strong>
                {t('landing.faqList.a1Text')}
              </div>
            )}
          </div>

          {/* FAQ 2 */}
          <div className="bg-slate-950/60 rounded-2xl border border-white/10 overflow-hidden shadow-xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => toggleFaq(2)}
              className="w-full text-left px-5 py-4 font-bold text-white flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
            >
              <span>{t('landing.faqList.q2')}</span>
              <ChevronDown className={`w-4 h-4 text-violet-400 transition-transform duration-200 ${openFaq === 2 ? 'rotate-180' : ''}`} />
            </button>
            {openFaq === 2 && (
              <div className="px-5 pb-4 text-slate-300 font-normal leading-relaxed border-t border-white/10 pt-3">
                <strong className="text-white font-bold">{t('landing.faqList.a2Prefix')} </strong>
                {t('landing.faqList.a2Text')}
              </div>
            )}
          </div>

          {/* FAQ 3 */}
          <div className="bg-slate-950/60 rounded-2xl border border-white/10 overflow-hidden shadow-xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => toggleFaq(3)}
              className="w-full text-left px-5 py-4 font-bold text-white flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
            >
              <span>{t('landing.faqList.q3')}</span>
              <ChevronDown className={`w-4 h-4 text-violet-400 transition-transform duration-200 ${openFaq === 3 ? 'rotate-180' : ''}`} />
            </button>
            {openFaq === 3 && (
              <div className="px-5 pb-4 text-slate-300 font-normal leading-relaxed border-t border-white/10 pt-3">
                <strong className="text-white font-bold">{t('landing.faqList.a3Prefix')} </strong>
                {t('landing.faqList.a3Text')}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. BOTTOM CTA BANNER */}
      <section className="relative frosted-glass rounded-3xl p-8 sm:p-12 text-center border border-violet-500/40 bg-linear-to-r from-violet-950/70 via-purple-950/60 to-slate-950/80 space-y-6 shadow-2xl overflow-hidden">
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-80 h-40 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

        <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
          {t('landing.ctaBottom.title')}
        </h3>
        <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed font-normal">
          {t('landing.ctaBottom.desc')}
        </p>

        <div className="pt-2">
          <button
            id="landing-bottom-cta-start"
            onClick={onStartScan}
            className="px-8 py-4 rounded-xl font-black text-sm text-slate-950 bg-linear-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 shadow-xl shadow-amber-400/30 hover:shadow-amber-400/50 transition-all inline-flex items-center gap-2.5 cursor-pointer group"
          >
            <Gamepad2 className="w-5 h-5 text-slate-950" />
            <span>{hasLoadedRoms ? t('landing.ctaBottom.btnBack') : t('landing.ctaBottom.btnStart')}</span>
            <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1.5 transition-transform" />
          </button>
        </div>
      </section>
    </div>
  );
};
