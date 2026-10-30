import { useState, useCallback, useRef } from 'react';

export function useToastQueue({ maxVisible = 4 } = {}) {
  const [toasts, setToasts] = useState([]);
  const seqRef = useRef(0);

  const push = useCallback(
    ({ title, description = '', tone = 'brand', duration = 6000 }) => {
      seqRef.current += 1;
      const id = `toast-${Date.now()}-${seqRef.current}`;
      setToasts((prev) => [{ id, title, description, tone, duration }, ...prev].slice(0, maxVisible));
      return id;
    },
    [maxVisible]
  );

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    push,
    dismiss,
    clear,
  };
}

