import { pickShowcaseAvatars } from '../heroShowcase.js';

export default function HeroShowcase({ items }) {
  const slots = pickShowcaseAvatars(items);

  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="avatar-disc disc-back">
        {slots.back ? <img src={slots.back} alt="" /> : <span>潮流</span>}
      </div>
      <div className="avatar-disc disc-main">
        {slots.main
          ? <img src={slots.main} alt="" />
          : <div className="avatar-face"><i /><b /><i /></div>}
        <strong>AI</strong>
      </div>
      <div className="avatar-disc disc-front">
        {slots.front ? <img src={slots.front} alt="" /> : <span>专属</span>}
      </div>
      <div className="hero-spark">✦</div>
    </div>
  );
}
