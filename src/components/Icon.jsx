const PATHS = {
  play: <path d="M8.5 5v14l10.5-7z" />,
  pause: <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />,
  retry: (
    <path
      d="M18.5 12a6.5 6.5 0 1 1-2.2-4.9M18.6 4.6v3.2h-3.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  previous: (
    <>
      <path d="M7 6v12" fill="none" />
      <path d="M18 6.5 10.5 12l7.5 5.5z" />
    </>
  ),
  star: <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />,
  volume: (
    <>
      <path d="M4 9.5h3l4-3.5v12l-4-3.5H4z" />
      <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  muted: (
    <>
      <path d="M4 9.5h3l4-3.5v12l-4-3.5H4z" />
      <path d="m15.5 9.5 5 5M20.5 9.5l-5 5" />
    </>
  ),
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
};

/** Inline icons; colour and stroke come from the surrounding CSS. */
export default function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
