const paths = {
  spark: <path d="M12 2.8c.5 4.7 2.5 6.7 7.2 7.2-4.7.5-6.7 2.5-7.2 7.2-.5-4.7-2.5-6.7-7.2-7.2 4.7-.5 6.7-2.5 7.2-7.2ZM19 16c.2 1.8 1 2.6 2.8 2.8-1.8.2-2.6 1-2.8 2.8-.2-1.8-1-2.6-2.8-2.8 1.8-.2 2.6-1 2.8-2.8Z" />,
  arrow: <path d="m9 18 6-6-6-6" />,
  download: <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" />,
  reset: <path d="M4 10a8 8 0 1 1 2.3 7.7M4 10V4m0 6h6" />,
  check: <path d="m5 12 4 4L19 6" />,
  image: <path d="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01" />,
  wand: <path d="m4 20 10-10m-8-2L4 6m4 0 2-2m6 2 1-3m1 6 3-1m-7 10 1 3m3-6 3 1" />,
  copy: <path d="M9 9h10v10H9zM5 15H3V3h12v2" />,
  lock: <path d="M7 10.5V7a5 5 0 0 1 10 0v3.5M5 10.5h14V21H5zM12 14.5v3" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  shield: <path d="M12 3l7 2.6v5.2c0 4.5-2.9 8.4-7 10.2-4.1-1.8-7-5.7-7-10.2V5.6z" />,
  upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7-5-5-5 5m5-5v12" />,
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  trash: <path d="M3 6h18m-2 0-1 14H6L5 6m3 0V3h8v3m-6 4v6m4-6v6" />,
  eraser: <path d="m7 21-4-4L16 4a2.8 2.8 0 0 1 4 4L9 19l-2 2Zm-2-6 4 4m4-4h8" />,
  brush: <path d="m14 4 6 6M4 20c2 0 4-1 4-3 0-1-.5-2-1-3l9-9a2.8 2.8 0 0 1 4 4l-9 9c-1-.5-2-1-3-1-2 0-3 1-4 3Z" />,
};

export function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={name === 'spark' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
