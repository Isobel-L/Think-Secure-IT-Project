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
    if (loading) return '处理中…';
    if (mode === 'renew') return `续订 ${plan.name}（${yuan(payAmount(plan, mode))}）`;
    if (mode === 'upgrade') return `补差价升级（${yuan(payAmount(plan, mode))}）`;
    if (mode === 'blocked') return '高级套餐不可降级';
    return `购买 ${plan.name}`;
  };

  const testLabel = { buy: '模拟开通', renew: '模拟续订', upgrade: '模拟升级' };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="购买下载额度">
      <div className="dialog-card plan-dialog">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="关闭">
          <Icon name="close" size={15} />
        </button>
        <span className="dialog-eyebrow">下载套餐</span>
        <h3>选择适合你的额度</h3>
        <p className="dialog-message">套餐额度优先使用；生成和修改图片仍然免费。</p>

        {plans.length ? (
          <div className="plan-grid">
            {plans.map((plan) => {
              const mode = cardMode(plan);
              const current = mode === 'renew';
              return (
                <article className={`plan-card${current ? ' is-current' : ''}`} key={plan.id}>
                  <div className="plan-card-heading">
                    <strong>{plan.name}</strong>
                    {current && <span>当前套餐 · {formatExpiry(activePlan.expiresAt)}到期</span>}
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
                    <p className="plan-cancelled-note">已取消续期，{formatExpiry(activePlan.expiresAt)}到期后停止；续订可恢复。</p>
                  )}
                  {current && !activePlan.cancelled && !confirmCancel && (
                    <button className="plan-cancel-button" type="button" onClick={() => setConfirmCancel(true)} disabled={loading}>
                      取消订阅
                    </button>
                  )}
                  {current && !activePlan.cancelled && confirmCancel && (
                    <div className="plan-cancel-confirm">
                      <p>取消后套餐保留至 {formatExpiry(activePlan.expiresAt)}，期间额度照常使用，到期后不再续期。</p>
                      <div>
                        <button type="button" onClick={() => onCancelPlan?.()} disabled={loading}>确认取消</button>
                        <button type="button" onClick={() => setConfirmCancel(false)} disabled={loading}>保留套餐</button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="plan-loading">正在读取套餐信息…</p>
        )}

        <p className="plan-footnote">
          套餐有效期均为 30 天，到期前后都可续订顺延 30 天；Go / Plus 的每日额度按东八区自然日次日刷新，Pro 在订阅期内不限量。已持有套餐时可补差价升级到更高级别，高级套餐不可降级。
        </p>

        <div className="single-credit-row">
          <div><strong>单次下载</strong><span>¥5 · 1 次下载额度，永久有效</span></div>
          <div>
            <button type="button" onClick={() => onCheckout?.(null)} disabled={loading}>购买 1 次</button>
            {billing?.testPaymentEnabled && (
              <button type="button" onClick={() => onTestPurchase?.(null)} disabled={loading}>模拟购买 1 次</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
