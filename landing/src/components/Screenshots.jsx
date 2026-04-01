import useScrollReveal from '../hooks/useScrollReveal';

const screenshotLabels = [
  'Dashboard Overview',
  'Project Timeline',
  'Billing & Invoices',
  'Material Deliveries',
  'Milestone Tracker',
  'Notifications',
];

export default function Screenshots() {
  const ref = useScrollReveal();

  return (
    <section id="screenshots" className="py-20 md:py-28 px-6 bg-charcoal-100/40">
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="text-center mb-14 opacity-0">
          <p className="text-charcoal-400 uppercase tracking-[0.2em] text-xs font-semibold mb-3">App Preview</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-charcoal-800 tracking-tight">
            See It in Action
          </h2>
          <p className="mt-4 text-charcoal-500 text-base max-w-xl mx-auto">
            A look at the ASEC Client app — designed for clarity, built for your projects.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 items-end justify-items-center">
          {screenshotLabels.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-3 w-full max-w-[160px]">
              {/* Phone frame placeholder */}
              <div className="relative w-full aspect-[9/19] bg-charcoal-800 rounded-[1.5rem] p-2 shadow-lg shadow-charcoal-900/20">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-4 bg-charcoal-800 rounded-b-xl z-10" />
                {/* Screen placeholder */}
                <div className="w-full h-full rounded-[1.2rem] bg-charcoal-200 flex flex-col items-center justify-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-charcoal-300 flex items-center justify-center">
                    <svg className="w-4 h-4 text-charcoal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 21V9a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 9v12" />
                    </svg>
                  </div>
                  <p className="text-[9px] text-charcoal-400 font-medium text-center px-2">Add screenshot here</p>
                </div>
              </div>
              <span className="text-xs text-charcoal-500 font-medium text-center">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
