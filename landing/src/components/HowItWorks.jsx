import { useState, useEffect, useRef } from 'react';
import { KeyRound, LogIn, Activity } from 'lucide-react';
import { useStaggerReveal } from '../hooks/useScrollReveal';

const steps = [
  {
    number: "01",
    title: "Receive Your Credentials",
    description: "Get your client credentials from ASEC when your project begins.",
    Icon: KeyRound,
  },
  {
    number: "02",
    title: "Log In to the App",
    description: "Sign in with your email and client code to access your dashboard.",
    Icon: LogIn,
  },
  {
    number: "03",
    title: "Start Tracking",
    description: "Monitor your project's progress from day one — anytime, anywhere.",
    Icon: Activity,
  },
];

export default function HowItWorks() {
  const setRef = useStaggerReveal(steps.length, { stagger: 180, duration: 700 });
  const [lineVisible, setLineVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setLineVisible(true); },
      { threshold: 0.4 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="py-20 md:py-28 px-6 bg-charcoal-100" ref={sectionRef}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="block w-8 h-px bg-charcoal-400" />
            <span className="font-display text-[10px] uppercase tracking-[0.22em] text-charcoal-500 font-semibold">Process</span>
            <span className="block w-8 h-px bg-charcoal-400" />
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-charcoal-900 tracking-tight mb-4">
            Getting Started is Simple
          </h2>
          <p className="text-charcoal-500 max-w-lg mx-auto">
            Three easy steps to full visibility on your construction project.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Animated connector line */}
          <div className="hidden md:block absolute top-[3.25rem] left-[20%] right-[20%] h-px bg-charcoal-200 overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-to-r from-charcoal-400 via-charcoal-500 to-charcoal-400 transition-all duration-1200 ease-out"
              style={{
                transform: lineVisible ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: 'left',
                transitionDuration: '1100ms',
              }}
            />
          </div>

          {steps.map((step, i) => (
            <div key={step.number} ref={setRef(i)} className="relative text-center group">
              {/* Step number circle */}
              <div className="relative inline-flex items-center justify-center mb-7">
                <div className="w-[6.5rem] h-[6.5rem] rounded-full bg-charcoal-900 text-white flex items-center justify-center relative z-10 transition-all duration-400 group-hover:bg-charcoal-700 group-hover:scale-105">
                  <span className="font-display text-2xl font-bold tracking-tight">{step.number}</span>
                </div>
                {/* Pulsing ring on hover */}
                <div className="absolute inset-0 rounded-full border-2 border-charcoal-400/0 group-hover:border-charcoal-400/30 transition-all duration-400 scale-90 group-hover:scale-125" />
              </div>

              {/* Icon badge */}
              <div className="w-9 h-9 rounded-lg bg-white border border-charcoal-200 flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:shadow-md group-hover:border-charcoal-300 transition-all duration-300">
                <step.Icon className="w-4 h-4 text-charcoal-600" strokeWidth={1.8} />
              </div>

              <h3 className="font-display text-lg font-semibold text-charcoal-900 mb-3">{step.title}</h3>
              <p className="text-charcoal-500 text-sm leading-relaxed max-w-xs mx-auto">{step.description}</p>

              {/* Small tech tick decoration */}
              <div className="mt-5 flex items-center justify-center gap-1 opacity-30">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className={`bg-charcoal-500 rounded-full ${j === 1 ? 'w-3 h-[2px]' : 'w-1 h-[2px]'}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
