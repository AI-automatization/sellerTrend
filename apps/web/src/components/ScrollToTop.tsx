import { useState, useEffect } from 'react';
import { ChevronUpIcon } from './icons';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 300);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 lg:bottom-6 right-4 z-30 btn btn-circle btn-sm btn-primary shadow-lg"
      aria-label="Scroll to top"
    >
      <ChevronUpIcon className="w-4 h-4" />
    </button>
  );
}
