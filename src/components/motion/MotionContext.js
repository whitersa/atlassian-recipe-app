import { createContext } from 'react';

export const MotionContext = createContext({
  reducedMotion: false,
  forcedReducedMotion: false,
  setForcedReducedMotion: () => {},
});

