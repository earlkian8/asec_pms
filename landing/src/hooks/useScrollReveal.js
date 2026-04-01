import { useEffect, useRef, useCallback } from 'react';

export default function useScrollReveal({ delay = 0, duration = 600, threshold = 0.15, direction = 'up' } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const transforms = {
      up: 'translateY(32px)',
      down: 'translateY(-32px)',
      left: 'translateX(32px)',
      right: 'translateX(-32px)',
    };

    el.style.opacity = '0';
    el.style.transform = transforms[direction] || transforms.up;
    el.style.transition = `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0) translateX(0)';
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, duration, threshold, direction]);

  return ref;
}

export function useStaggerReveal(count, { baseDelay = 0, stagger = 100, duration = 600, threshold = 0.15, direction = 'up' } = {}) {
  const refs = useRef([]);

  const setRef = useCallback((index) => (el) => {
    refs.current[index] = el;
  }, []);

  useEffect(() => {
    const transforms = {
      up: 'translateY(32px)',
      down: 'translateY(-32px)',
      left: 'translateX(32px)',
      right: 'translateX(-32px)',
    };

    const observers = [];

    refs.current.forEach((el, i) => {
      if (!el) return;
      const delay = baseDelay + i * stagger;

      el.style.opacity = '0';
      el.style.transform = transforms[direction] || transforms.up;
      el.style.transition = `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms`;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0) translateX(0)';
            observer.unobserve(el);
          }
        },
        { threshold }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [count, baseDelay, stagger, duration, threshold, direction]);

  return setRef;
}
