'use client';

import { useEffect, useRef } from 'react';

// Escape closes the topmost open modal only (a confirm box over a form closes first)
const stack: number[] = [];
let nextId = 1;

export function useEscape(onClose: () => void, active = true) {
  const cb = useRef(onClose);
  cb.current = onClose;
  useEffect(() => {
    if (!active) return;
    const id = nextId++;
    stack.push(id);
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' || stack[stack.length - 1] !== id) return;
      // Let an open native picker or an inline editor handle its own Escape first
      if (e.defaultPrevented) return;
      e.preventDefault();
      cb.current();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [active]);
}
