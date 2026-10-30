import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { P } from '../propTypes';

/**
 * MobileSelect:
 * - Chevron rotates 180deg in 120ms (`--m-duration-fast`).
 * - Dropdown menu fades in over 320ms (`--m-ease-panel`), zero option scaling or stagger.
 * - Value selection & closing respond immediately (0ms close transition).
 */
export function MobileSelect({
  id,
  options,
  value,
  onChange,
  placeholder = '请选择',
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        const idx = options.findIndex((o) => o.value === value && !o.disabled);
        setHighlightIdx(idx >= 0 ? idx : options.findIndex((o) => !o.disabled));
      }
      return next;
    });
  };

  const commitValue = (nextValue) => {
    onChange?.(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleOpen();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const enabledIndices = options
        .map((opt, idx) => (opt.disabled ? -1 : idx))
        .filter((idx) => idx >= 0);
      if (enabledIndices.length === 0) return;
      const currentPos = enabledIndices.indexOf(highlightIdx);
      const nextPos =
        currentPos < 0
          ? 0
          : (currentPos + step + enabledIndices.length) % enabledIndices.length;
      setHighlightIdx(enabledIndices[nextPos]);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const target = options[highlightIdx];
      if (target && !target.disabled) {
        commitValue(target.value);
      }
    }
  };

  return (
    <div
      ref={rootRef}
      className={`m-select ${className}`.trim()}
      data-open={open ? 'true' : undefined}
    >
      <button
        id={id}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="m-select-trigger"
        data-placeholder={!selectedOption ? 'true' : undefined}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
      </button>

      <ChevronDown size={16} strokeWidth={2.2} className="m-select-chevron" />

      {open && (
        <div className="m-select-menu" role="listbox">
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlightIdx;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                disabled={opt.disabled}
                aria-selected={isSelected}
                className="m-select-option"
                data-selected={isSelected ? 'true' : undefined}
                data-highlighted={isHighlighted ? 'true' : undefined}
                onPointerEnter={() => !opt.disabled && setHighlightIdx(idx)}
                onClick={() => !opt.disabled && commitValue(opt.value)}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={15} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

MobileSelect.propTypes = {
  id: P.string,
  options: P.array.isRequired,
  value: P.string,
  onChange: P.func,
  placeholder: P.string,
  disabled: P.bool,
  className: P.string,
};

