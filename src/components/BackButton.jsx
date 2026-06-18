import './BackButton.css';

export default function BackButton({ onBack, disabled }) {
  return (
    <button
      className="back-button"
      onClick={onBack}
      disabled={disabled}
      title="Previous station"
      aria-label="Previous station"
    >
      {'‹'}
    </button>
  );
}
