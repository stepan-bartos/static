import './SleepTimer.css';

const PRESETS = [15, 30, 60];

function formatRemaining(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function SleepTimer({ active, remaining, onSet, onCancel }) {
  if (active) {
    return (
      <div className="sleep-timer sleep-timer--active">
        <span className={`sleep-countdown ${remaining <= 60 ? 'scanning' : ''}`}>
          {'☾'} {formatRemaining(remaining)}
        </span>
        <button className="sleep-btn sleep-cancel" onClick={onCancel} title="Cancel sleep timer">
          CANCEL
        </button>
      </div>
    );
  }

  return (
    <div className="sleep-timer">
      <span className="sleep-label">{'☾'} SLEEP</span>
      {PRESETS.map((m) => (
        <button key={m} className="sleep-btn" onClick={() => onSet(m)} title={`Stop in ${m} minutes`}>
          {m}
        </button>
      ))}
    </div>
  );
}
