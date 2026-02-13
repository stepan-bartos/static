import { useRef, useEffect, useCallback } from 'react';
import audioVisualizer from '../services/audioVisualizer.js';
import './Visualizer.css';

const RING_COUNT = 5;
const RING_SIZES = [18, 32, 48, 66, 88];

export default function Visualizer({ audioState, isScanning }) {
  const ringRefs = useRef([]);
  const rafRef = useRef(null);

  const isPlaying = audioState === 'playing';

  const animate = useCallback((timestamp) => {
    let levels;
    if (isScanning || audioState === 'loading') {
      levels = audioVisualizer.getScanningBandLevels(timestamp);
    } else if (isPlaying) {
      levels = audioVisualizer.getPlayingBandLevels(timestamp);
    } else {
      levels = audioVisualizer.getIdleBandLevels(timestamp);
    }

    ringRefs.current.forEach((ring, i) => {
      if (ring) ring.style.setProperty('--intensity', levels[i] || 0);
    });

    rafRef.current = requestAnimationFrame(animate);
  }, [audioState, isScanning, isPlaying]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  return (
    <div className="visualizer">
      <div className="vis-rings">
        {Array.from({ length: RING_COUNT }, (_, i) => (
          <div
            key={i}
            ref={(el) => (ringRefs.current[i] = el)}
            className={`vis-ring vis-ring--${i}`}
            style={{
              '--ring-size': `${RING_SIZES[i]}%`,
              '--intensity': 0.05,
            }}
          />
        ))}
        <div className="vis-center-dot" />
      </div>
    </div>
  );
}
