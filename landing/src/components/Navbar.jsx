import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import logoSvg from '../assets/logo.svg';

const NAV_LINKS = [
  { label: 'Features', href: '#features', id: 'features' },
  { label: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    const ids = [...NAV_LINKS.map(l => l.id), 'download'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-sm shadow-charcoal-200/60' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3 group">
          <img src={logoSvg} alt="ASEC Logo" className="w-9 h-9 object-contain transition-transform duration-300 group-hover:scale-105" />
          <div className="leading-tight">
            <span className="font-display font-bold text-charcoal-800 text-sm tracking-tight block">Abdurauf Sawadjaan</span>
            <span className="text-[10px] text-charcoal-400 uppercase tracking-[0.18em]">Engineering Consultancy</span>
          </div>
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm text-charcoal-500">
          {NAV_LINKS.map(link => (
            <a
              key={link.id}
              href={link.href}
              className={`relative py-1 transition-colors duration-200 ${activeSection === link.id ? 'text-charcoal-900' : 'hover:text-charcoal-800'}`}
            >
              {link.label}
              <span className={`absolute bottom-[-2px] left-0 h-[1.5px] bg-charcoal-800 rounded-full transition-all duration-300 ${activeSection === link.id ? 'w-full' : 'w-0'}`} />
              <span className="absolute bottom-[-2px] left-0 h-[1.5px] bg-charcoal-300 rounded-full w-full scale-x-0 group-hover:scale-x-100 transition-transform" />
            </a>
          ))}
          <a
            href="#download"
            className="relative overflow-hidden bg-charcoal-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 hover:bg-charcoal-700 hover:shadow-lg hover:shadow-charcoal-900/25 active:scale-95 group"
          >
            <span className="relative z-10">Download App</span>
            <span className="absolute inset-0 bg-gradient-to-r from-charcoal-700 to-charcoal-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-charcoal-100 transition-colors text-charcoal-600"
          aria-label="Toggle menu"
        >
          <X className={`w-5 h-5 absolute transition-all duration-200 ${isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'}`} />
          <Menu className={`w-5 h-5 absolute transition-all duration-200 ${isOpen ? 'opacity-0 -rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'}`} />
        </button>
      </div>

      <div className={`md:hidden overflow-hidden transition-all duration-350 ease-in-out ${isOpen ? 'max-h-72 border-t border-charcoal-200/70' : 'max-h-0'}`}>
        <div className="px-6 py-6 flex flex-col gap-1 bg-white/98 backdrop-blur-xl">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.id}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`text-sm py-3 px-3 rounded-lg transition-all duration-200 ${activeSection === link.id ? 'bg-charcoal-100 text-charcoal-900 font-medium' : 'text-charcoal-600 hover:bg-charcoal-50 hover:text-charcoal-800'}`}
              style={{ transitionDelay: isOpen ? `${i * 40}ms` : '0ms' }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#download"
            onClick={() => setIsOpen(false)}
            className="mt-2 bg-charcoal-900 text-white px-5 py-3 rounded-lg text-center text-sm font-medium hover:bg-charcoal-700 transition-colors"
          >
            Download App
          </a>
        </div>
      </div>
    </nav>
  );
}
