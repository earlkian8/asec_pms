import { Mail, Phone } from 'lucide-react';
import logoSvg from '../assets/logo.svg';

export default function Footer() {
  return (
    <footer className="bg-charcoal-800 border-t border-charcoal-700 py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-3">
              <img src={logoSvg} alt="ASEC Logo" className="w-8 h-8 object-contain" />
              <span className="font-bold text-white text-sm">Abdurauf Sawadjaan</span>
            </div>
            <p className="text-charcoal-400 text-xs italic mb-2">Engineering Consultancy</p>
            <p className="text-charcoal-500 text-xs">Where Vision Meets Precision</p>
          </div>

          {/* Quick Links */}
          <div className="text-center">
            <h4 className="text-white font-semibold text-sm mb-4">Quick Links</h4>
            <div className="flex flex-col gap-2">
              <a href="#features" className="text-charcoal-400 text-sm hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-charcoal-400 text-sm hover:text-white transition-colors">How It Works</a>
              <a href="#download" className="text-charcoal-400 text-sm hover:text-white transition-colors">Download</a>
            </div>
          </div>

          {/* Contact */}
          <div className="text-center md:text-right">
            <h4 className="text-white font-semibold text-sm mb-4">Contact Us</h4>
            <div className="flex flex-col gap-3">
              <a href="mailto:abduraufsawadjaan@gmail.com" className="inline-flex items-center gap-2 text-charcoal-400 text-sm hover:text-white transition-colors justify-center md:justify-end">
                <Mail className="w-4 h-4" />
                abduraufsawadjaan@gmail.com
              </a>
              <a href="tel:+639356951625" className="inline-flex items-center gap-2 text-charcoal-400 text-sm hover:text-white transition-colors justify-center md:justify-end">
                <Phone className="w-4 h-4" />
                +63 935 695 1625
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-charcoal-700 mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-charcoal-500">
          <p>&copy; 2026 Abdurauf Sawadjaan Engineering Consultancy</p>
          <p>ASEC Client is exclusively for registered clients of Abdurauf Sawadjaan Engineering Consultancy.</p>
        </div>
      </div>
    </footer>
  );
}
