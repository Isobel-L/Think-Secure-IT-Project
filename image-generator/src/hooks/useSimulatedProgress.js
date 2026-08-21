import { useEffect, useRef, useState } from 'react';
import { computeSimulatedProgress, progressStageLabel } from '../progressModel.js';

const TICK_MS = 250;
const FINISH_MS = 400;
const SUCCESS_HOLD_MS = 300;

export default function useSimulatedProgress({
  running,
  failed = false,
  expectedMs,
  operation = 'generate',
}) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const progressRef = useRef(0);
  const startedAtRef = useRef(0);
  const wasRunningRef = useRef(false);
  const finishingRef = useRef(false);

  useEffect(() => {
    let intervalId;
    let finishIntervalId;
    let finishTimerId;
    let hideTimerId;

    const updateProgress = (next) => {
      const monotonic = Math.max(progressRef.current, next);
      progressRef.current = monotonic;
      setProgress(monotonic);
    };

    if (failed) {
      wasRunningRef.current = false;
      finishingRef.current = false;
      progressRef.current = 0;
      setProgress(0);
      setFinishing(false);
      setActive(false);
    } else if (running) {
      if (!wasRunningRef.current) {
        startedAtRef.current = Date.now();
        progressRef.current = 0;
        setProgress(0);
      }
      wasRunningRef.current = true;
      finishingRef.current = false;
      setFinishing(false);
      setActive(true);

      const tick = () => updateProgress(computeSimulatedProgress(Date.now() - startedAtRef.current, { expectedMs }));
      tick();
      intervalId = window.setInterval(tick, TICK_MS);
    } else if (wasRunningRef.current) {
      wasRunningRef.current = false;
      finishingRef.current = true;
      setActive(true);
      setFinishing(true);
      const from = progressRef.current;
      const finishStartedAt = Date.now();
      const finishTick = () => {
        const ratio = Math.min(1, (Date.now() - finishStartedAt) / FINISH_MS);
        updateProgress(from + ((1 - from) * ratio));
      };
      finishTick();
      finishIntervalId = window.setInterval(finishTick, 50);
      finishTimerId = window.setTimeout(() => {
        window.clearInterval(finishIntervalId);
        updateProgress(1);
      }, FINISH_MS);
      hideTimerId = window.setTimeout(() => {
        finishingRef.current = false;
        progressRef.current = 0;
        setProgress(0);
        setFinishing(false);
        setActive(false);
      }, FINISH_MS + SUCCESS_HOLD_MS);
    } else if (finishingRef.current) {
      // 兜底：finishing 序列进行中若因依赖变化（如 expectedMs）导致 effect 重跑，
      // 上面的分支都不会命中而定时器已被清理，这里直接复位，避免进度条永久卡在中途。
      finishingRef.current = false;
      progressRef.current = 0;
      setProgress(0);
      setFinishing(false);
      setActive(false);
    }

    return () => {
      window.clearInterval(intervalId);
      window.clearInterval(finishIntervalId);
      window.clearTimeout(finishTimerId);
      window.clearTimeout(hideTimerId);
    };
  }, [expectedMs, failed, running]);

  return {
    progress,
    stage: progressStageLabel(progress, operation),
    active,
    finishing,
  };
}
