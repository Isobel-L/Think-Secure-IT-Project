import { Icon } from './Icons.jsx';

export default function ParameterSection({ section, selections, onToggle, open, locked }) {
  const sectionCount = section.groups.reduce((total, group) => total + (selections[group.id]?.length || 0), 0);

  return (
    <details className="parameter-section" open={open}>
      <summary>
        <span className="section-index">{String(section.index + 1).padStart(2, '0')}</span>
        <span className="section-title-wrap">
          <span className="section-title">{section.name}</span>
          <span className="section-eyebrow">{section.eyebrow}</span>
        </span>
        {sectionCount > 0 && <span className="section-count">已选 {sectionCount}</span>}
        <span className="summary-arrow"><Icon name="arrow" size={17} /></span>
      </summary>

      <div className="section-content">
        {section.groups.map((group) => (
          <fieldset className="option-group" key={group.id}>
            <legend>
              {group.label}
              {group.mode === 'single' && <span>单选</span>}
              {group.maxSelections > 1 && <span>最多 {group.maxSelections} 项</span>}
            </legend>
            <div className="option-list">
              {group.options.map((option) => {
                const active = selections[group.id]?.includes(option.id);
                return (
                  <button
                    className={`option-chip${active ? ' active' : ''}${locked ? ' locked' : ''}`}
                    type="button"
                    aria-pressed={active}
                    aria-disabled={locked}
                    onClick={() => onToggle(group, option)}
                    key={option.id}
                  >
                    {active && <Icon name="check" size={13} />}
                    {option.label}
                    {option.reliability === 'experimental' && <small className="option-status">实验</small>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </details>
  );
}
