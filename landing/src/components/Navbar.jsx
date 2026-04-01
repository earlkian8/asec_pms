import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import logoSvg from '../assets/logo.svg';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md' : 'bg-white/80 backdrop-blur-lg'}`}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3 group">
          <img src={logoSvg} alt="ASEC Logo" className="w-9 h-9 object-contain" />
          <div className="leading-tight">
            <span className="font-bold text-charcoal-800 text-sm tracking-tight block">Abdurauf Sawadjaan</span>
            <span className="text-[10px] text-charcoal-400 uppercase tracking-[0.15em]">Engineering Consultancy</span>
          </div>
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm text-charcoal-500">
          <a href="#features" className="hover:text-charcoal-800 transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-charcoal-800 after:transition-all hover:after:w-full">Features</a>
          <a href="#how-it-works" className="hover:text-charcoal-800 transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-charcoal-800 after:transition-all hover:after:w-full">How It Works</a>
          <a href="#download" className="bg-charcoal-800 text-white px-5 py-2.5 rounded-lg hover:bg-charcoal-700 transition-all hover:shadow-lg hover:shadow-charcoal-800/20 active:scale-95">
            Download App
          </a>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-charcoal-100 transition-colors text-charcoal-600"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-64 border-t border-charcoal-200' : 'max-h-0'}`}>
        <div className="px-6 py-6 flex flex-col gap-4 bg-white">
          <a href="#features" onClick={() => setIsOpen(false)} className="text-charcoal-600 hover:text-charcoal-800 transition-colors py-2">Features</a>
          <a href="#how-it-works" onClick={() => setIsOpen(false)} className="text-charcoal-600 hover:text-charcoal-800 transition-colors py-2">How It Works</a>
          <a href="#download" onClick={() => setIsOpen(false)} className="bg-charcoal-800 text-white px-5 py-3 rounded-lg text-center hover:bg-charcoal-700 transition-colors">
            Download App
          </a>
        </div>
      </div>
    </nav>
  );
}
