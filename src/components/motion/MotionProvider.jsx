import { useState, useEffect, useMemo } from 'react';
import { MotionContext } from './MotionContext';
import { P } from '../propTypes';

export function MotionProvider({ children }) {
  const [systemReduced, setSystemReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const [forcedReducedMotion, setForcedReducedMotion] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event) => setSystemReduced(event.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const reducedMotion = systemReduced || forcedReducedMotion;

  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.setAttribute('data-reduced-motion', 'true');
    } else {
      document.documentElement.removeAttribute('data-reduced-motion');
    }
  }, [reducedMotion]);

  const contextValue = useMemo(
    () => ({
      reducedMotion,
      forcedReducedMotion,
      setForcedReducedMotion,
    }),
    [reducedMotion, forcedReducedMotion]
  );

  return <MotionContext.Provider value={contextValue}>{children}</MotionContext.Provider>;
}

MotionProvider.propTypes = {
  children: P.node,
};

