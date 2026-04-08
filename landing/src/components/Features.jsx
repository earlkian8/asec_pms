import { useRef, useCallback } from 'react';
import { BarChart3, Flag, Truck, FileText, ShieldCheck, Bell } from 'lucide-react';
import { useStaggerReveal } from '../hooks/useScrollReveal';

const features = [
  {
    title: "Project Tracking",
    description: "See real-time progress on all your active, on-hold, and completed projects with visual progress bars.",
    Icon: BarChart3,
  },
  {
    title: "Milestone Updates",
    description: "Know exactly where your project stands phase by phase, with task-level detail.",
    Icon: Flag,
  },
  {
    title: "Material Delivery Tracking",
    description: "Monitor delivery status and quantities of materials allocated to your project.",
    Icon: Truck,
  },
  {
    title: "Billing & Invoices",
    description: "View all invoices, payment status, and outstanding balances in one place.",
    Icon: FileText,
  },
  {
    title: "Secure Payments",
    description: "Pay invoices directly through the app via secure online payment.",
    Icon: ShieldCheck,
  },
  {
    title: "Instant Notifications",
    description: "Get real-time alerts whenever there's a project update or milestone reached.",
    Icon: Bell,
  },
];

function FeatureCard({ feature, index, setRef }) {
  const cardRef = useRef(null);
  const glowRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current || !glowRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    glowRef.current.style.background = `radial-gradient(280px circle at ${x}px ${y}px, rgba(45,45,45,0.06), transparent 55%)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (glowRef.current) glowRef.current.style.background = 'none';
  }, []);

  const mergeRefs = useCallback((el) => {
    cardRef.current = el;
    setRef(index)(el);
  }, [index, setRef]);

  return (
    <div
      ref={mergeRefs}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative p-7 rounded-2xl border border-charcoal-200 bg-white hover:border-charcoal-400 hover:shadow-2xl hover:shadow-charcoal-200/80 hover:-translate-y-2 transition-all duration-400 group cursor-default overflow-hidden"
    >
      {/* Mouse-tracking glow */}
      <div ref={glowRef} className="absolute inset-0 pointer-events-none rounded-2xl" />

      {/* Top accent line slides in on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-charcoal-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center" />

      {/* Large ghost number */}
      <span className="absolute bottom-3 right-4 font-display font-black text-[5.5rem] leading-none text-charcoal-200 select-none pointer-events-none transition-all duration-500 group-hover:text-charcoal-300 group-hover:scale-110 origin-bottom-right">
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Icon */}
      <div className="relative w-12 h-12 rounded-xl bg-charcoal-900 text-white flex items-center justify-center mb-5 ring-4 ring-charcoal-900/8 group-hover:bg-charcoal-700 group-hover:-rotate-6 group-hover:scale-110 transition-all duration-350">
        <feature.Icon className="w-5 h-5" strokeWidth={1.8} />
      </div>

      <h3 className="relative font-display text-base font-semibold text-charcoal-900 mb-2">{feature.title}</h3>
      <p className="relative text-charcoal-500 text-sm leading-relaxed">{feature.description}</p>
    </div>
  );
}

export default function Features() {
  const setRef = useStaggerReveal(features.length, { stagger: 70, duration: 650 });

  return (
    <section id="features" className="py-20 md:py-28 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="block w-8 h-px bg-charcoal-300" />
            <span className="font-display text-[10px] uppercase tracking-[0.22em] text-charcoal-400 font-semibold">Core Features</span>
            <span className="block w-8 h-px bg-charcoal-300" />
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-charcoal-900 tracking-tight mb-4">
            Everything You Need to Stay in the Loop
          </h2>
          <p className="text-charcoal-500 max-w-xl mx-auto text-base leading-relaxed">
            From project milestones to payments — manage it all from your phone.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} setRef={setRef} />
          ))}
        </div>
      </div>
    </section>
  );
}
