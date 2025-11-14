import { useEffect, useState } from 'react';

export default function useViewport() {
  const [width, setWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  return { width, isTablet, isDesktop, isWide: isTablet };
}

