import { useEffect, useEffectEvent } from 'react';

// Whether the person is currently moving around with Tab (as opposed to
// clicking or tapping). Decides who gets the Space key — see below.
let tabbing = false;

/**
 * Global shortcuts. `handlers` maps a name to a function; the listener is
 * attached once and always calls the latest handlers.
 */
export function useKeyboardShortcuts(handlers) {
  const onKeyDown = useEffectEvent((e) => {
    const target = e.target;
    const tag = target?.tagName;
    const typing = tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable ||
      (tag === 'INPUT' && target.type !== 'range');
    if (e.key === 'Tab') tabbing = true;
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'Escape') {
      handlers.escape?.();
      return;
    }
    // Key-repeat only makes sense for volume
    if (e.repeat && e.code !== 'ArrowUp' && e.code !== 'ArrowDown') return;

    const byCode = {
      Space: handlers.togglePlay,
      ArrowLeft: handlers.previousGenre,
      ArrowRight: handlers.nextGenre,
      ArrowUp: handlers.volumeUp,
      ArrowDown: handlers.volumeDown,
    }[e.code];
    if (byCode) {
      // A focused slider keeps its own arrow keys. A button reached with Tab
      // keeps Space; one that was merely clicked doesn't swallow play/pause.
      if (tag === 'INPUT' && e.code !== 'Space') return;
      if (e.code === 'Space' && tabbing && (tag === 'BUTTON' || tag === 'A')) return;
      e.preventDefault();
      byCode();
      return;
    }

    const byKey = {
      s: handlers.scan,
      f: handlers.toggleFavorite,
      b: handlers.back,
      m: handlers.toggleMute,
      l: handlers.toggleLog,
      '?': handlers.toggleHelp,
    }[e.key.toLowerCase()];
    byKey?.();
  });

  useEffect(() => {
    const listener = (e) => onKeyDown(e);
    const onPointer = () => {
      tabbing = false;
    };
    window.addEventListener('keydown', listener);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', listener);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, []);
}
