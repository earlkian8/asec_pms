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

export default function Features() {
  const setRef = useStaggerReveal(features.length, { stagger: 80 });

  return (
    <section id="features" className="py-20 md:py-28 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="w-12 h-1 bg-charcoal-800 rounded-full mx-auto mb-5" />
          <h2 className="text-3xl md:text-4xl font-bold text-charcoal-800 tracking-tight mb-4">
            Everything You Need to Stay in the Loop
          </h2>
          <p className="text-charcoal-500 max-w-xl mx-auto">
            From project milestones to payments — manage it all from your phone.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              ref={setRef(i)}
              className="p-8 rounded-2xl border border-charcoal-200 bg-white hover:border-charcoal-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-default"
            >
              <div className="w-14 h-14 rounded-xl bg-charcoal-800 text-white flex items-center justify-center mb-6 ring-4 ring-charcoal-800/10 group-hover:bg-charcoal-700 group-hover:ring-charcoal-700/15 group-hover:-translate-y-0.5 transition-all duration-300">
                <feature.Icon className="w-6 h-6" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-semibold text-charcoal-800 mb-2">{feature.title}</h3>
              <p className="text-charcoal-500 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
