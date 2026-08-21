import useSimulatedProgress from '../hooks/useSimulatedProgress.js';

export default function GenerationProgress({ running, failed = false, expectedMs, operation = 'generate' }) {
  const { progress, stage, active, finishing } = useSimulatedProgress({
    running,
    failed,
    expectedMs,
    operation,
  });
  if (!active) return null;

  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));
  return (
    <div
      className={`gen-progress${finishing ? ' is-finishing' : ''}`}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div className="gen-progress-track">
        <i className="gen-progress-fill" style={{ width: `${percentage}%` }} />
      </div>
      <div className="gen-progress-meta">
        <span>{stage}</span>
        <b>{percentage}%</b>
      </div>
    </div>
  );
}
