import useScrollReveal from '../hooks/useScrollReveal';

export default function DownloadCTA() {
  const ref = useScrollReveal();

  return (
    <section id="download" className="relative py-20 md:py-28 px-6 bg-charcoal-900 text-center overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-charcoal-700 rounded-full blur-3xl opacity-30" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[350px] h-[350px] bg-charcoal-600 rounded-full blur-3xl opacity-20" />

      <div ref={ref} className="relative max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6">
          Your project is moving.{" "}
          <span className="text-charcoal-400">Stay moving with it.</span>
        </h2>
        <p className="text-charcoal-400 mb-10 max-w-lg mx-auto">
          Download ASEC Client and stay connected to every milestone, delivery, and payment update.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="#" className="hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
            <img
              src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
              alt="Get it on Google Play"
              className="h-16"
            />
          </a>
          <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 text-white/50 px-5 py-3 rounded-xl cursor-default select-none h-16">
            <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <div className="leading-tight text-left">
              <p className="text-[10px] text-white/35 uppercase tracking-widest">Coming Soon</p>
              <p className="text-base font-semibold text-white/60">App Store</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-charcoal-600">Free for registered ASEC clients</p>
      </div>
    </section>
  );
}
