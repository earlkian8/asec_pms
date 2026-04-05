import clientPortalLogo from '../assets/client-portal-logo.png';
import ApkDownloadButton from './ApkDownloadButton';

export default function Hero() {
  return (
    <section className="relative pt-28 pb-16 md:pt-40 md:pb-28 px-6 bg-gradient-to-b from-charcoal-100 via-charcoal-100/50 to-white overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-20 right-[-10%] w-[500px] h-[500px] bg-charcoal-200 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-0 left-[-5%] w-[350px] h-[350px] bg-charcoal-300/50 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

      <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Text Content */}
        <div className="text-center lg:text-left">
          <p className="text-charcoal-400 uppercase tracking-[0.2em] text-xs font-semibold mb-5 animate-fade-up">
            Where Vision Meets Precision
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-charcoal-800 leading-[1.1] tracking-tight mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Your Construction Projects,{" "}
            <span className="text-charcoal-400">Right in Your Pocket</span>
          </h1>
          <p className="text-base md:text-lg text-charcoal-500 max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
            ASEC Client is your personal portal to track project progress, milestones, billing, and material deliveries — all in one place.
          </p>
          <div className="flex flex-col items-center lg:items-start gap-3 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <ApkDownloadButton size="md" />
              <div className="inline-flex items-center gap-2.5 bg-black/10 text-charcoal-500 px-4 py-2.5 rounded-xl text-sm cursor-default select-none border border-charcoal-300/50 h-14">
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.18 23.76c.3.17.64.22.98.14l13.2-7.62-2.83-2.83-11.35 10.31zm-1.7-20.1C1.2 4.05 1 4.5 1 5.06v13.88c0 .56.2 1.01.48 1.4l.08.07 7.77-7.77v-.2L1.56 3.59l-.08.07zM20.49 10.7l-2.83-1.63-3.17 3.17 3.17 3.17 2.86-1.65c.82-.47.82-1.56-.03-2.06zM4.16.25L17.36 7.9l-2.83 2.83L3.18.47c.3-.18.67-.22.98-.22z" />
                </svg>
                <div className="leading-tight text-left">
                  <p className="text-[10px] text-charcoal-400 uppercase tracking-wide">Coming Soon</p>
                  <p className="text-sm font-semibold text-charcoal-500">Google Play</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2.5 bg-black/10 text-charcoal-500 px-4 py-2.5 rounded-xl text-sm cursor-default select-none border border-charcoal-300/50 h-14">
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="leading-tight text-left">
                  <p className="text-[10px] text-charcoal-400 uppercase tracking-wide">Coming Soon</p>
                  <p className="text-sm font-semibold text-charcoal-500">App Store</p>
                </div>
              </div>
            </div>
            <span className="text-xs text-charcoal-400">Free for ASEC clients</span>
          </div>
        </div>

        {/* App Icon */}
        <div className="relative flex justify-center items-center animate-fade-up" style={{ animationDelay: '0.4s' }}>
          {/* Aura layers */}
          <div className="absolute w-72 h-72 md:w-80 md:h-80 rounded-[3rem] bg-charcoal-500/15 blur-3xl scale-110" />
          <div className="absolute w-64 h-64 md:w-72 md:h-72 rounded-[3rem] bg-charcoal-700/10 blur-xl scale-105" />
          {/* Icon frame */}
          <div className="relative w-56 h-56 md:w-64 md:h-64 rounded-[2.6rem] overflow-hidden bg-white shadow-2xl shadow-charcoal-900/35 ring-[1.5px] ring-charcoal-200/70">
            <img
              src={clientPortalLogo}
              alt="ASEC Client Portal"
              className="w-full h-full object-cover scale-[1.25] origin-center"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
