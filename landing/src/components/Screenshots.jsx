import { useState } from 'react';
import useScrollReveal, { useStaggerReveal } from '../hooks/useScrollReveal';

const screenshotLabels = [
  { label: 'Dashboard Overview', color: 'bg-charcoal-800' },
  { label: 'Project Timeline', color: 'bg-charcoal-700' },
  { label: 'Billing & Invoices', color: 'bg-charcoal-600' },
  { label: 'Material Deliveries', color: 'bg-charcoal-800' },
  { label: 'Milestone Tracker', color: 'bg-charcoal-700' },
  { label: 'Notifications', color: 'bg-charcoal-600' },
];

export default function Screenshots() {
  const headingRef = useScrollReveal();
  const setRef = useStaggerReveal(screenshotLabels.length, { stagger: 60, duration: 600 });
  const [hovered, setHovered] = useState(null);

  return (
    <section id="screenshots" className="py-20 md:py-28 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div ref={headingRef} className="text-center mb-14 opacity-0">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="block w-8 h-px bg-charcoal-300" />
            <span className="font-display text-[10px] uppercase tracking-[0.22em] text-charcoal-400 font-semibold">App Preview</span>
            <span className="block w-8 h-px bg-charcoal-300" />
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-charcoal-900 tracking-tight">
            See It in Action
          </h2>
          <p className="mt-4 text-charcoal-500 text-base max-w-xl mx-auto">
            A look at the ASEC Client app — designed for clarity, built for your projects.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end justify-items-center">
          {screenshotLabels.map(({ label, color }, i) => {
            const isHovered = hovered === i;
            const isAdjacent = hovered !== null && Math.abs(hovered - i) === 1;
            return (
              <div
                key={i}
                ref={setRef(i)}
                className="flex flex-col items-center gap-3 w-full max-w-[150px] cursor-default"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Phone frame */}
                <div
                  className={`relative w-full aspect-[9/19] rounded-[1.5rem] p-[5px] shadow-xl shadow-charcoal-900/15 transition-all duration-350 ${
                    isHovered
                      ? '-translate-y-3 shadow-2xl shadow-charcoal-900/25 ring-[1.5px] ring-charcoal-400'
                      : isAdjacent
                      ? '-translate-y-1'
                      : ''
                  } ${color}`}
                >
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-3.5 bg-charcoal-900/90 rounded-b-lg z-10" />
                  {/* Screen area */}
                  <div className="w-full h-full rounded-[1.15rem] bg-charcoal-100 flex flex-col items-center justify-center gap-2 overflow-hidden relative">
                    {/* Mock screen content */}
                    <div className="absolute inset-0 flex flex-col">
                      <div className="h-7 bg-charcoal-200/70 flex items-center px-2 gap-1">
                        <div className="w-3 h-1 rounded-full bg-charcoal-400" />
                        <div className="w-5 h-1 rounded-full bg-charcoal-300" />
                      </div>
                      <div className="flex-1 p-2 flex flex-col gap-1.5">
                        {[...Array(5)].map((_, j) => (
                          <div key={j} className="flex gap-1 items-center">
                            <div className={`rounded-sm bg-charcoal-300 ${j === 0 ? 'w-4 h-3' : 'w-2.5 h-1'}`} style={{ opacity: 1 - j * 0.12 }} />
                            <div className={`rounded-sm bg-charcoal-200 flex-1 h-1`} style={{ opacity: 1 - j * 0.1 }} />
                          </div>
                        ))}
                        <div className="mt-1 w-full h-6 rounded-md bg-charcoal-300/60" />
                      </div>
                    </div>
                    {/* Placeholder overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-charcoal-200/40 backdrop-blur-[1px]">
                      <svg className="w-5 h-5 text-charcoal-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3 21V9a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 9v12" />
                      </svg>
                      <p className="text-[8px] text-charcoal-400 font-medium text-center px-1 leading-tight">Screenshot</p>
                    </div>
                  </div>
                </div>
                {/* Label */}
                <span className={`text-[11px] font-medium text-center leading-tight transition-colors duration-200 ${isHovered ? 'text-charcoal-800' : 'text-charcoal-400'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
