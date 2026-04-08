import { useEffect, useRef } from 'react';
import clientPortalLogo from '../assets/client-portal-logo.png';
import ApkDownloadButton from './ApkDownloadButton';

export default function Hero() {
  const gridRef = useRef(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      el.style.setProperty('--gx', `${x}%`);
      el.style.setProperty('--gy', `${y}%`);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <section className="relative pt-28 pb-16 md:pt-40 md:pb-28 px-6 bg-gradient-to-b from-charcoal-100 via-charcoal-100/60 to-white overflow-hidden">
      {/* Engineering grid */}
      <div
        ref={gridRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 70% at var(--gx, 50%) var(--gy, 30%), black 20%, transparent 80%)',
        }}
      />

      {/* Ambient blobs */}
      <div className="absolute top-16 right-[-8%] w-[520px] h-[520px] bg-charcoal-200 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-0 left-[-4%] w-[380px] h-[380px] bg-charcoal-300/40 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2.5s' }} />

      {/* Floating label decoration */}
      <div className="absolute top-32 left-[5%] hidden xl:flex flex-col gap-1 animate-float opacity-40" style={{ animationDelay: '1s' }}>
        <div className="w-px h-10 bg-charcoal-400 mx-auto" />
        <span className="text-[9px] font-display text-charcoal-500 uppercase tracking-[0.2em] writing-mode-vertical rotate-90 origin-center whitespace-nowrap">Est. 2020</span>
      </div>

      <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Text Content */}
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 mb-6 animate-fade-up">
            <span className="inline-block w-5 h-px bg-charcoal-400" />
            <p className="text-charcoal-400 uppercase tracking-[0.22em] text-[10px] font-semibold font-display">
              Where Vision Meets Precision
            </p>
          </div>
          <h1
            className="font-display text-4xl md:text-5xl lg:text-[3.6rem] font-extrabold text-charcoal-900 leading-[1.08] tracking-[-0.02em] mb-6 animate-fade-up"
            style={{ animationDelay: '0.08s' }}
          >
            Your Construction{' '}
            <span className="relative inline-block">
              Projects
              <span
                className="absolute bottom-0.5 left-0 right-0 h-[3px] bg-charcoal-400 rounded-full"
                style={{ clipPath: 'inset(0 100% 0 0)', animation: 'draw-underline 0.6s cubic-bezier(0.22,1,0.36,1) 0.7s forwards' }}
              />
            </span>
            {', '}
            <br className="hidden md:block" />
            <span className="text-charcoal-400">Right in Your Pocket</span>
          </h1>
          <p
            className="text-base md:text-lg text-charcoal-500 max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed animate-fade-up"
            style={{ animationDelay: '0.18s' }}
          >
            ASEC Client is your personal portal to track project progress, milestones, billing, and material deliveries — all in one place.
          </p>
          <div className="flex flex-col items-center lg:items-start gap-3 animate-fade-up" style={{ animationDelay: '0.28s' }}>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <ApkDownloadButton size="md" />
              <div className="inline-flex items-center gap-2.5 bg-charcoal-900/6 text-charcoal-500 px-4 py-2.5 rounded-xl text-sm cursor-default select-none border border-charcoal-300/60 h-14 transition-colors duration-200 hover:border-charcoal-300">
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.18 23.76c.3.17.64.22.98.14l13.2-7.62-2.83-2.83-11.35 10.31zm-1.7-20.1C1.2 4.05 1 4.5 1 5.06v13.88c0 .56.2 1.01.48 1.4l.08.07 7.77-7.77v-.2L1.56 3.59l-.08.07zM20.49 10.7l-2.83-1.63-3.17 3.17 3.17 3.17 2.86-1.65c.82-.47.82-1.56-.03-2.06zM4.16.25L17.36 7.9l-2.83 2.83L3.18.47c.3-.18.67-.22.98-.22z" />
                </svg>
                <div className="leading-tight text-left">
                  <p className="text-[10px] text-charcoal-400 uppercase tracking-wide">Coming Soon</p>
                  <p className="text-sm font-semibold text-charcoal-500">Google Play</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2.5 bg-charcoal-900/6 text-charcoal-500 px-4 py-2.5 rounded-xl text-sm cursor-default select-none border border-charcoal-300/60 h-14 transition-colors duration-200 hover:border-charcoal-300">
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="leading-tight text-left">
                  <p className="text-[10px] text-charcoal-400 uppercase tracking-wide">Coming Soon</p>
                  <p className="text-sm font-semibold text-charcoal-500">App Store</p>
                </div>
              </div>
            </div>
            <span className="text-xs text-charcoal-400 tracking-wide">Free for ASEC clients</span>
          </div>
        </div>

        {/* App Icon with orbital rings */}
        <div className="relative flex justify-center items-center animate-fade-up" style={{ animationDelay: '0.38s' }}>
          {/* Outer ring */}
          <div className="absolute w-[340px] h-[340px] md:w-[380px] md:h-[380px] rounded-full border border-charcoal-300/30 animate-spin-slow" />
          {/* Inner ring */}
          <div className="absolute w-[290px] h-[290px] md:w-[320px] md:h-[320px] rounded-full border border-dashed border-charcoal-300/40" style={{ animation: 'spin-slow 15s linear infinite reverse' }} />
          {/* Orbit dot 1 */}
          <div className="absolute w-[340px] h-[340px] md:w-[380px] md:h-[380px] animate-spin-slow">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-charcoal-400 shadow-lg shadow-charcoal-400/50" />
          </div>
          {/* Orbit dot 2 */}
          <div className="absolute w-[290px] h-[290px] md:w-[320px] md:h-[320px]" style={{ animation: 'spin-slow 15s linear infinite reverse' }}>
            <div className="absolute bottom-0 right-[10%] w-1.5 h-1.5 rounded-full bg-charcoal-300" />
          </div>
          {/* Ambient aura */}
          <div className="absolute w-64 h-64 md:w-72 md:h-72 rounded-[3rem] bg-charcoal-500/12 blur-3xl" />
          {/* Floating badge */}
          <div className="absolute top-4 right-4 md:top-8 md:right-0 bg-white rounded-xl shadow-xl shadow-charcoal-200/60 border border-charcoal-200 px-3 py-2 flex items-center gap-2 animate-float" style={{ animationDelay: '0.5s' }}>
            <div className="w-2 h-2 rounded-full bg-charcoal-500" />
            <span className="text-[10px] font-display font-semibold text-charcoal-700 uppercase tracking-wide">Live Updates</span>
          </div>
          {/* Icon frame */}
          <div className="relative w-52 h-52 md:w-60 md:h-60 rounded-[2.5rem] overflow-hidden bg-white shadow-2xl shadow-charcoal-900/30 ring-[1.5px] ring-charcoal-200/80 animate-float" style={{ animationDelay: '0.2s' }}>
            <img
              src={clientPortalLogo}
              alt="ASEC Client Portal"
              className="w-full h-full object-cover scale-[1.25] origin-center"
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes draw-underline {
          to { clip-path: inset(0 0% 0 0); }
        }
      `}</style>
    </section>
  );
}
