import './VolumeControl.css';

export default function VolumeControl({ volume, muted, onVolumeChange, onToggleMute }) {
  return (
    <div className="volume-control">
      <button
        className="vol-mute"
        onClick={onToggleMute}
        title={muted ? 'Unmute (M)' : 'Mute (M)'}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? 'MUTE' : 'VOL'}
      </button>
      <input
        className="vol-slider"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        style={{ '--vol-pct': `${Math.round(volume * 100)}%` }}
        aria-label="Volume"
      />
    </div>
  );
}
