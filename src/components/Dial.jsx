import Icon from './Icon.jsx';

const RINGS = [1, 0.85, 0.7, 0.55, 0.4];

const BUSY = new Set(['scanning', 'loading', 'reconnecting']);

/** Play/pause in the centre; previous station and Scan either side. The rings show what the radio is doing. */
export default function Dial({ status, hasStation, canGoBack, onToggle, onScan, onBack }) {
  const busy = BUSY.has(status);
  const rings = status === 'playing' ? 'playing' : busy ? 'busy' : status === 'error' ? 'error' : 'rest';

  let icon = 'play';
  let label = hasStation ? 'Play' : 'Start the radio';
  if (status === 'playing' || status === 'loading' || status === 'reconnecting') {
    icon = 'pause';
    label = 'Pause';
  } else if (status === 'error') {
    icon = 'retry';
    label = 'Try this station again';
  }

  return (
    <div className="dial" data-rings={rings}>
      {RINGS.map((k, i) => (
        <span key={i} className="ring" style={{ '--i': i, '--k': k }} aria-hidden="true" />
      ))}
      <button
        className="side"
        onClick={onBack}
        disabled={!canGoBack}
        aria-label="Previous station"
        title="Previous station (B)"
      >
        <Icon name="previous" />
      </button>
      <button
        className="play"
        onClick={onToggle}
        data-busy={busy}
        aria-label={label}
        title={`${label} (Space)`}
      >
        <Icon key={icon} name={icon} />
      </button>
      <button
        className="side scan"
        onClick={onScan}
        aria-label="Scan for another station"
        title="Scan for another station (S)"
      >
        SCAN
      </button>
    </div>
  );
}
