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

export default function Screenshots() {
  const headingRef = useScrollReveal();
  const setRef = useStaggerReveal(screenshots.length, { stagger: 80, duration: 600 });
  const [hovered, setHovered] = useState(null);

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
                  <div className="w-full h-full rounded-[1.4rem] overflow-hidden bg-charcoal-100">
                    <img
                      src={img}
                      alt={label}
                      className={`w-full h-full object-cover object-top transition-transform duration-500 ${isHovered ? 'scale-105' : 'scale-100'}`}
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
