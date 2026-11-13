import Icon from './Icon.jsx';

const PRESETS = [15, 30, 60];

function formatRemaining(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** Pick a time to stop; while it runs, the same spot shows the countdown. */
export default function SleepTimer({ active, remaining, onStart, onCancel }) {
  return (
    <div className="ctl sleep" data-active={active} role="group" aria-label="Sleep timer">
      <span className="ctl-icon" title="Sleep timer"><Icon name="moon" /></span>
      <span className="sleep-opts">
        {active ? (
          <>
            <span className="sleep-countdown" data-ending={remaining <= 60} role="timer">
              {formatRemaining(remaining)}
            </span>
            <button onClick={onCancel} aria-label="Cancel sleep timer" title="Cancel sleep timer">✕</button>
          </>
        ) : (
          PRESETS.map((minutes) => (
            <button
              key={minutes}
              onClick={() => onStart(minutes)}
              aria-label={`Stop playing in ${minutes} minutes`}
              title={`Stop playing in ${minutes} minutes`}
            >
              {minutes}
            </button>
          ))
        )}
      </span>
    </div>
  );
}
