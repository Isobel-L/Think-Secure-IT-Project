import { useEffect, useState } from 'react';
import { Icon } from './Icons.jsx';

function formatExpiry(value) {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

function yuan(minor) {
  const value = minor / 100;
  return Number.isInteger(value) ? `¥${value}` : `¥${value.toFixed(2)}`;
}

export default function PlanDialog({ billing, onClose, onCheckout, onTestPurchase, onCancelPlan, loading }) {
  const plans = Array.isArray(billing?.plans) ? billing.plans : [];
  const activePlan = billing?.plan || null;
  const activeCatalog = activePlan ? plans.find((plan) => plan.id === activePlan.id) || null : null;
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!activePlan) setConfirmCancel(false);
  }, [activePlan]);

  const cardMode = (plan) => {
    if (!activePlan || !activeCatalog) return 'buy';
    if (plan.id === activePlan.id) return 'renew';
    return plan.tier > activeCatalog.tier ? 'upgrade' : 'blocked';
  };

  const payAmount = (plan, mode) => (
    mode === 'upgrade' && activeCatalog ? plan.priceMinor - activeCatalog.priceMinor : plan.priceMinor
  );

  const buyLabel = (plan, mode) => {
    if (loading) return 'Working…';
    if (mode === 'renew') return `Renew ${plan.name} (${yuan(payAmount(plan, mode))})`;
    if (mode === 'upgrade') return `Upgrade for the difference (${yuan(payAmount(plan, mode))})`;
    if (mode === 'blocked') return 'A higher plan cannot be downgraded';
    return `Buy ${plan.name}`;
  };

  const testLabel = { buy: 'Simulate purchase', renew: 'Simulate renewal', upgrade: 'Simulate upgrade' };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="Buy download credits">
      <div className="dialog-card plan-dialog">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close">
          <Icon name="close" size={15} />
        </button>
        <span className="dialog-eyebrow">Download plans</span>
        <h3>Pick the plan that fits</h3>
        <p className="dialog-message">Plan credits are used first. Generating and editing stay free.</p>

        {plans.length ? (
          <div className="plan-grid">
            {plans.map((plan) => {
              const mode = cardMode(plan);
              const current = mode === 'renew';
              return (
                <article className={`plan-card${current ? ' is-current' : ''}`} key={plan.id}>
                  <div className="plan-card-heading">
                    <strong>{plan.name}</strong>
                    {current && <span>Current plan &middot; expires {formatExpiry(activePlan.expiresAt)}</span>}
                  </div>
                  <div className="plan-price">{plan.priceLabel}<small>{plan.quotaLabel} · {plan.refreshLabel}</small></div>
                  <p>{plan.description}</p>
                  <button
                    className={`plan-buy-button${mode === 'blocked' ? ' is-blocked' : ''}`}
                    type="button"
                    onClick={() => onCheckout?.(plan.id)}
                    disabled={loading || mode === 'blocked'}
                  >
                    {buyLabel(plan, mode)}
                  </button>
                  {billing?.testPaymentEnabled && mode !== 'blocked' && (
                    <button
                      className="plan-test-button"
                      type="button"
                      onClick={() => onTestPurchase?.(plan.id)}
                      disabled={loading}
                    >
                      {testLabel[mode]}
                    </button>
                  )}
                  {current && activePlan.cancelled && (
                    <p className="plan-cancelled-note">Renewal cancelled. It stops after {formatExpiry(activePlan.expiresAt)}; renewing restores it.</p>
                  )}
                  {current && !activePlan.cancelled && !confirmCancel && (
                    <button className="plan-cancel-button" type="button" onClick={() => setConfirmCancel(true)} disabled={loading}>
                      Cancel subscription
                    </button>
                  )}
                  {current && !activePlan.cancelled && confirmCancel && (
                    <div className="plan-cancel-confirm">
                      <p>The plan runs until {formatExpiry(activePlan.expiresAt)} with its quota intact, then stops renewing.</p>
                      <div>
                        <button type="button" onClick={() => onCancelPlan?.()} disabled={loading}>Confirm cancellation</button>
                        <button type="button" onClick={() => setConfirmCancel(false)} disabled={loading}>Keep the plan</button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="plan-loading">Loading plan details…</p>
        )}

        <p className="plan-footnote">
          Every plan lasts 30 days and can be renewed for another 30 at any time. Go and Plus refresh their daily quota each calendar day in UTC+8; Pro is unlimited for the whole subscription. An existing plan can be upgraded by paying the difference, but a higher plan cannot be downgraded.
        </p>

        <div className="single-credit-row">
          <div><strong>Single download</strong><span>&yen;5 &middot; one credit, never expires</span></div>
          <div>
            <button type="button" onClick={() => onCheckout?.(null)} disabled={loading}>Buy one</button>
            {billing?.testPaymentEnabled && (
              <button type="button" onClick={() => onTestPurchase?.(null)} disabled={loading}>Simulate buying one</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
