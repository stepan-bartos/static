import { useEffect, useRef, useState } from 'react';

const GAP = 72; // matches .marquee-track gap
const SPEED = 38; // px per second

/** Shows text on one line; scrolls it only when it doesn't fit. */
export default function Marquee({ text }) {
  const boxRef = useRef(null);
  const copyRef = useRef(null);
  const [width, setWidth] = useState(0); // width of the text when it overflows, else 0

  useEffect(() => {
    const box = boxRef.current;
    const copy = copyRef.current;
    if (!box || !copy) return undefined;
    const observer = new ResizeObserver(() => {
      const textWidth = copy.offsetWidth;
      setWidth(textWidth > box.clientWidth + 1 ? textWidth : 0);
    });
    observer.observe(box);
    observer.observe(copy);
    return () => observer.disconnect();
  }, []);

  const overflowing = width > 0;
  const shift = width + GAP;

  return (
    <div
      className="marquee"
      ref={boxRef}
      data-overflow={overflowing}
      title={overflowing ? text : undefined}
      style={overflowing ? { '--marquee-shift': `${shift}px`, '--marquee-duration': `${shift / SPEED}s` } : undefined}
    >
      <span className="marquee-track">
        <span ref={copyRef}>{text}</span>
        {overflowing && <span aria-hidden="true">{text}</span>}
      </span>
    </div>
  );
}
