import { LayoutDashboard, Clock, Crown } from 'lucide-react';
import { useStaggerReveal } from '../hooks/useScrollReveal';

const highlights = [
  {
    stat: "All-in-One",
    label: "One dashboard for all your projects",
    Icon: LayoutDashboard,
    detail: "Projects · Billing · Materials",
  },
  {
    stat: "Real-Time",
    label: "Track progress, milestones, materials, and payments",
    Icon: Clock,
    detail: "Live sync · Instant updates",
  },
  {
    stat: "Exclusive",
    label: "Built exclusively for ASEC clients",
    Icon: Crown,
    detail: "Secure · Private · Dedicated",
  },
];

export default function Highlights() {
  const setRef = useStaggerReveal(highlights.length, { stagger: 130, duration: 700 });

  return (
    <section className="relative py-20 md:py-28 px-6 bg-charcoal-900 overflow-hidden">
      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(26,26,26,0.8)_100%)]" />
      {/* Ambient glows */}
      <div className="absolute top-0 left-[20%] w-[500px] h-[300px] bg-charcoal-700/40 rounded-full blur-[80px]" />
      <div className="absolute bottom-0 right-[10%] w-[400px] h-[250px] bg-charcoal-600/30 rounded-full blur-[80px]" />

      <div className="relative max-w-5xl mx-auto">
        {/* Section label */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-3">
            <span className="block w-8 h-px bg-charcoal-600" />
            <span className="font-display text-[10px] uppercase tracking-[0.22em] text-charcoal-500 font-semibold">Why ASEC Client</span>
            <span className="block w-8 h-px bg-charcoal-600" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {highlights.map((item, i) => (
            <div
              key={item.stat}
              ref={setRef(i)}
              className="relative text-center border border-white/8 rounded-2xl p-8 md:p-10 hover:bg-white/5 hover:border-white/20 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/40 transition-all duration-400 group overflow-hidden cursor-default"
            >
              {/* Card inner glow on hover */}
              <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

              {/* Top accent */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-[1.5px] bg-gradient-to-r from-transparent via-charcoal-400/60 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

              <div className="w-14 h-14 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-white/12 group-hover:border-white/20 transition-all duration-300">
                <item.Icon className="w-6 h-6 text-white/70" strokeWidth={1.5} />
              </div>
              <p className="font-display text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">{item.stat}</p>
              <p className="text-charcoal-400 text-sm leading-relaxed mb-4">{item.label}</p>
              {/* Detail tags */}
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {item.detail.split(' · ').map((tag) => (
                  <span key={tag} className="text-[10px] text-charcoal-500 border border-white/8 rounded-full px-2.5 py-0.5 font-display uppercase tracking-wide">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
