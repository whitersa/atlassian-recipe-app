import { useContext } from 'react';
import { MotionContext } from './MotionContext';

export function useReducedMotion() {
  return useContext(MotionContext).reducedMotion;
}

export function useMotionEnvironment() {
  return useContext(MotionContext);
}

