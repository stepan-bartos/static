import './ScanButton.css';

export default function ScanButton({ isScanning, onScan, disabled }) {
  return (
    <button
      className={`scan-button ${isScanning ? 'scan-button--scanning' : ''}`}
      onClick={onScan}
      disabled={disabled || isScanning}
    >
      {isScanning ? 'Scanning...' : 'Scan'}
    </button>
  );
}
