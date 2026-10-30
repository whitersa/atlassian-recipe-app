import { forwardRef, useRef, useImperativeHandle } from 'react';
import { X } from 'lucide-react';
import { P } from '../propTypes';

/**
 * MobileInput & MobileTextarea:
 * - Default 1px neutral border; on focus switches color + adds `inset 0 0 0 1px` for a visual 2px border
 *   with ZERO outer ring and ZERO text/layout movement.
 */
export const MobileInput = forwardRef(function MobileInput(
  {
    value,
    onChange,
    clearable = false,
    onClear,
    disabled = false,
    invalid = false,
    className = '',
    ...rest
  },
  forwardedRef
) {
  const inputRef = useRef(null);
  useImperativeHandle(forwardedRef, () => inputRef.current);

  const showClear = Boolean(clearable && !disabled && value && String(value).length > 0);

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
    inputRef.current?.focus();
  };

  return (
    <div className="m-input-wrap">
      <input
        ref={inputRef}
        value={value}
        onChange={onChange}
        disabled={disabled}
        data-invalid={invalid ? 'true' : undefined}
        data-has-clear={clearable ? 'true' : undefined}
        className={`m-input ${className}`.trim()}
        {...rest}
      />
      {clearable && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="清空输入"
          className="m-input-clear"
          data-visible={showClear ? 'true' : undefined}
          onClick={handleClear}
        >
          <X size={14} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
});

MobileInput.propTypes = {
  value: P.oneOfType([P.string, P.number]),
  onChange: P.func,
  clearable: P.bool,
  onClear: P.func,
  disabled: P.bool,
  invalid: P.bool,
  className: P.string,
};

export const MobileTextarea = forwardRef(function MobileTextarea(
  { value, onChange, disabled = false, invalid = false, className = '', ...rest },
  forwardedRef
) {
  return (
    <textarea
      ref={forwardedRef}
      value={value}
      onChange={onChange}
      disabled={disabled}
      data-invalid={invalid ? 'true' : undefined}
      className={`m-textarea ${className}`.trim()}
      {...rest}
    />
  );
});

MobileTextarea.propTypes = {
  value: P.string,
  onChange: P.func,
  disabled: P.bool,
  invalid: P.bool,
  className: P.string,
};

