import './ShortcutHelp.css';

const SHORTCUTS = [
  ['Space', 'Play / pause'],
  ['S', 'Scan station'],
  ['F', 'Favorite'],
  ['← / →', 'Change genre'],
  ['B', 'Previous station'],
  ['M', 'Mute'],
  ['↑ / ↓', 'Volume'],
  ['?', 'Toggle this help'],
];

export default function ShortcutHelp({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="shortcut-help" role="dialog" aria-label="Keyboard shortcuts">
      <div className="shortcut-help-head">
        <span>Shortcuts</span>
        <button className="shortcut-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <dl>
        {SHORTCUTS.map(([key, desc]) => (
          <div className="shortcut-row" key={key}>
            <dt><kbd>{key}</kbd></dt>
            <dd>{desc}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
