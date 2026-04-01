import { LayoutDashboard, Clock, Crown } from 'lucide-react';
import { useStaggerReveal } from '../hooks/useScrollReveal';

const highlights = [
  {
    stat: "All-in-One",
    label: "One dashboard for all your projects",
    Icon: LayoutDashboard,
  },
  {
    stat: "Real-Time",
    label: "Track progress, milestones, materials, and payments",
    Icon: Clock,
  },
  {
    stat: "Exclusive",
    label: "Built exclusively for ASEC clients",
    Icon: Crown,
  },
];

export default function Highlights() {
  const setRef = useStaggerReveal(highlights.length, { stagger: 120 });

  return (
    <section className="relative py-20 md:py-28 px-6 bg-charcoal-800 overflow-hidden">
      {/* Decorative radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.04),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.03),transparent_50%)]" />

      <div className="relative max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {highlights.map((item, i) => (
            <div
              key={item.stat}
              ref={setRef(i)}
              className="text-center border border-white/10 rounded-2xl p-8 md:p-10 hover:bg-white/5 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
                <item.Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
              </div>
              <p className="text-3xl md:text-4xl font-extrabold text-white mb-3">{item.stat}</p>
              <p className="text-charcoal-400 text-sm">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
