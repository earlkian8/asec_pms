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
  const setRef = useStaggerReveal(steps.length, { stagger: 150 });

  return (
    <section id="how-it-works" className="py-20 md:py-28 px-6 bg-charcoal-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="w-12 h-1 bg-charcoal-800 rounded-full mx-auto mb-5" />
          <h2 className="text-3xl md:text-4xl font-bold text-charcoal-800 tracking-tight mb-4">
            Getting Started is Simple
          </h2>
          <p className="text-charcoal-500 max-w-lg mx-auto">
            Three easy steps to full visibility on your construction project.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-charcoal-300 via-charcoal-300 to-charcoal-300" />

          {steps.map((step, i) => (
            <div key={step.number} ref={setRef(i)} className="relative text-center">
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 rounded-full bg-charcoal-800 text-white flex items-center justify-center text-3xl font-bold ring-8 ring-charcoal-800/10 relative z-10">
                  {step.number}
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-charcoal-200 flex items-center justify-center mx-auto mb-4">
                <step.Icon className="w-5 h-5 text-charcoal-600" strokeWidth={1.8} />
              </div>
              <h3 className="text-xl font-semibold text-charcoal-800 mb-3">{step.title}</h3>
              <p className="text-charcoal-500 text-sm leading-relaxed max-w-xs mx-auto">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
