import { useState } from 'react';
import useScrollReveal, { useStaggerReveal } from '../hooks/useScrollReveal';
import dashboard from '../assets/dashboard.jpg';
import projectTimeline from '../assets/project_timeline.jpg';
import billingInvoices from '../assets/billing_and_invoices.jpg';
import milestoneTracker from '../assets/milestone_tracker.jpg';

const screenshots = [
  { label: 'Dashboard Overview', img: dashboard },
  { label: 'Project Timeline', img: projectTimeline },
  { label: 'Billing & Invoices', img: billingInvoices },
  { label: 'Milestone Tracker', img: milestoneTracker },
];

function AppSkeleton() {
  return (
    <div className="w-full h-full bg-charcoal-100 flex flex-col overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0">
        <div className="w-6 h-1.5 rounded-full bg-charcoal-300 animate-pulse" />
        <div className="flex gap-1 items-center">
          <div className="w-3 h-1.5 rounded-full bg-charcoal-300 animate-pulse" />
          <div className="w-3 h-1.5 rounded-full bg-charcoal-300 animate-pulse" style={{ animationDelay: '0.1s' }} />
        </div>
      </div>

      {/* Top bar / header */}
      <div className="px-3 pt-1.5 pb-2 shrink-0">
        <div className="w-20 h-2.5 rounded-full bg-charcoal-300 mb-1.5 animate-pulse" style={{ animationDelay: '0.05s' }} />
        <div className="w-14 h-1.5 rounded-full bg-charcoal-200 animate-pulse" style={{ animationDelay: '0.1s' }} />
      </div>

      {/* Hero card */}
      <div className="mx-3 mb-2 shrink-0">
        <div className="w-full h-10 rounded-xl bg-charcoal-300/60 animate-pulse" style={{ animationDelay: '0.15s' }} />
      </div>

      {/* Section label */}
      <div className="px-3 mb-1.5 shrink-0">
        <div className="w-12 h-1.5 rounded-full bg-charcoal-300 animate-pulse" style={{ animationDelay: '0.2s' }} />
      </div>

      {/* List rows */}
      <div className="flex-1 px-3 flex flex-col gap-1.5 overflow-hidden">
        {[0, 1, 2, 3].map((j) => (
          <div
            key={j}
            className="flex items-center gap-2 bg-white/60 rounded-lg p-2 animate-pulse"
            style={{ animationDelay: `${0.2 + j * 0.08}s` }}
          >
            <div className="w-5 h-5 rounded-md bg-charcoal-300 shrink-0" />
            <div className="flex-1 flex flex-col gap-1">
              <div className="h-1.5 rounded-full bg-charcoal-300" style={{ width: `${65 - j * 8}%` }} />
              <div className="h-1 rounded-full bg-charcoal-200" style={{ width: `${80 - j * 6}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom nav bar */}
      <div className="flex items-center justify-around px-3 py-2 mt-1 border-t border-charcoal-200 bg-white/50 shrink-0">
        {[0, 1, 2, 3].map((j) => (
          <div key={j} className="flex flex-col items-center gap-0.5 animate-pulse" style={{ animationDelay: `${0.5 + j * 0.06}s` }}>
            <div className={`rounded-md bg-charcoal-300 ${j === 0 ? 'w-4 h-4' : 'w-3 h-3 bg-charcoal-200'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Screenshots() {
  const headingRef = useScrollReveal();
  const setRef = useStaggerReveal(screenshots.length, { stagger: 80, duration: 600 });
  const [hovered, setHovered] = useState(null);
  const [loaded, setLoaded] = useState({});

  return (
    <section id="screenshots" className="py-20 md:py-28 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 items-end justify-items-center">
          {screenshots.map(({ label, img }, i) => {
            const isHovered = hovered === i;
            const isAdjacent = hovered !== null && Math.abs(hovered - i) === 1;
            const isLoaded = loaded[i];

            return (
              <div
                key={i}
                ref={setRef(i)}
                className="flex flex-col items-center gap-3 w-full max-w-[200px] cursor-default"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Phone frame */}
                <div
                  className={`relative w-full aspect-[9/19] bg-charcoal-900 rounded-[1.75rem] p-[5px] shadow-xl shadow-charcoal-900/20 transition-all duration-350 ${
                    isHovered
                      ? '-translate-y-4 shadow-2xl shadow-charcoal-900/35 ring-[1.5px] ring-charcoal-400'
                      : isAdjacent
                      ? '-translate-y-1.5'
                      : ''
                  }`}
                >
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-4 bg-charcoal-900 rounded-b-xl z-10" />
                  {/* Screen */}
                  <div className="w-full h-full rounded-[1.4rem] overflow-hidden bg-charcoal-100 relative">
                    {/* Skeleton shown until image loads */}
                    <div
                      className={`absolute inset-0 transition-opacity duration-500 ${isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    >
                      <AppSkeleton />
                    </div>
                    {/* Real image */}
                    <img
                      src={img}
                      alt={label}
                      onLoad={() => setLoaded((prev) => ({ ...prev, [i]: true }))}
                      className={`w-full h-full object-cover object-top transition-all duration-500 ${
                        isLoaded ? 'opacity-100' : 'opacity-0'
                      } ${isHovered ? 'scale-105' : 'scale-100'}`}
                    />
                  </div>
                </div>
                {/* Label */}
                <span className={`text-[11px] font-display font-semibold text-center leading-tight tracking-wide transition-colors duration-200 ${isHovered ? 'text-charcoal-800' : 'text-charcoal-400'}`}>
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
