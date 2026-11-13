import Icon from './Icon.jsx';

const SHORTCUTS = [
  ['Space', 'Play / pause'],
  ['S', 'Scan'],
  ['B', 'Previous station'],
  ['F', 'Favorite'],
  ['← →', 'Change genre'],
  ['↑ ↓', 'Volume'],
  ['M', 'Mute'],
  ['L', 'Listening log'],
  ['?', 'This list'],
];

export default function ShortcutHelp({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="shortcuts" role="dialog" aria-label="Keyboard shortcuts">
      <div className="shortcuts-head">
        <span>Shortcuts</span>
        <button className="log-close" onClick={onClose} aria-label="Close shortcuts">
          <Icon name="close" />
        </button>
      </div>
      <dl>
        {SHORTCUTS.map(([keys, description]) => (
          <div className="shortcuts-row" key={keys}>
            <dt>{description}</dt>
            <dd><kbd>{keys}</kbd></dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
