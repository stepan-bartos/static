import Icon from './Icon.jsx';

export default function VolumeControl({ volume, muted, onChange, onToggleMute }) {
  return (
    <div className="ctl volume">
      <button
        className="ctl-icon"
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        title={muted ? 'Unmute (M)' : 'Mute (M)'}
      >
        <Icon name={muted ? 'muted' : 'volume'} />
      </button>
      <input
        className="vol"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ '--v': `${Math.round(volume * 100)}%` }}
        aria-label="Volume"
      />
    </div>
  );
}
