import { Quote, Star } from 'lucide-react';
import useScrollReveal from '../hooks/useScrollReveal';

export default function Testimonial() {
  const ref = useScrollReveal();

  return (
    <section className="py-20 md:py-28 px-6 bg-white">
      <div ref={ref} className="max-w-3xl mx-auto">
        <div className="bg-charcoal-100/60 border border-charcoal-200 rounded-3xl p-8 md:p-14 text-center relative overflow-hidden">
          {/* Decorative quote mark */}
          <Quote className="w-20 h-20 text-charcoal-200 mx-auto mb-6 rotate-180" strokeWidth={1} />

          {/* Star rating */}
          <div className="flex items-center justify-center gap-1 mb-8">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-charcoal-800 text-charcoal-800" />
            ))}
          </div>

          <blockquote className="text-lg md:text-xl text-charcoal-700 font-medium leading-relaxed mb-8">
            "Having full visibility into our construction project from my phone has been a game-changer. I always know exactly where things stand — from materials arriving on-site to invoice payments."
          </blockquote>

          <div>
            <div className="w-12 h-12 rounded-full bg-charcoal-800 text-white flex items-center justify-center font-bold text-sm mx-auto mb-3">
              CN
            </div>
            <p className="font-semibold text-charcoal-800">Client Name</p>
            <p className="text-sm text-charcoal-400">Placeholder — ASEC Client</p>
          </div>
        </div>
      </div>
    </section>
  );
}
