import { Mail, Phone } from 'lucide-react';
import logoSvg from '../assets/logo.svg';

export default function Footer() {
  return (
    <footer className="bg-charcoal-800 border-t border-charcoal-700/60 pt-14 pb-8 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-charcoal-700/60">
          {/* Brand */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
              <img src={logoSvg} alt="ASEC Logo" className="w-8 h-8 object-contain opacity-90" />
              <div className="leading-tight">
                <span className="font-display font-bold text-white text-sm block">Abdurauf Sawadjaan</span>
                <span className="text-[10px] text-charcoal-500 uppercase tracking-[0.15em]">Engineering Consultancy</span>
              </div>
            </div>
            <p className="text-charcoal-500 text-xs leading-relaxed italic">Where Vision Meets Precision</p>
          </div>

          {/* Quick Links */}
          <div className="text-center">
            <h4 className="font-display text-white font-semibold text-xs uppercase tracking-[0.15em] mb-5">Quick Links</h4>
            <div className="flex flex-col gap-2.5">
              {[
                { label: 'Features', href: '#features' },
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'Download', href: '#download' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-charcoal-500 text-sm hover:text-white transition-colors duration-200 hover:translate-x-0.5 inline-block transition-transform"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="text-center md:text-right">
            <h4 className="font-display text-white font-semibold text-xs uppercase tracking-[0.15em] mb-5">Contact Us</h4>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:abduraufsawadjaan@gmail.com"
                className="inline-flex items-center gap-2 text-charcoal-500 text-sm hover:text-white transition-colors duration-200 justify-center md:justify-end group"
              >
                <Mail className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-200" />
                abduraufsawadjaan@gmail.com
              </a>
              <a
                href="tel:+639356951625"
                className="inline-flex items-center gap-2 text-charcoal-500 text-sm hover:text-white transition-colors duration-200 justify-center md:justify-end group"
              >
                <Phone className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-200" />
                +63 935 695 1625
              </a>
            </div>
          </div>
        </div>

        <div className="pt-7 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-charcoal-600">
          <p>&copy; 2026 Abdurauf Sawadjaan Engineering Consultancy</p>
          <p className="text-center md:text-right">ASEC Client is exclusively for registered clients.</p>
        </div>
      </div>
    </footer>
  );
}
