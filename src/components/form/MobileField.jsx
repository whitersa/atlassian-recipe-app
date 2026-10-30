import { useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { P } from '../propTypes';

/**
 * MobileField:
 * - Aligned required asterisk `*` & label.
 * - Smooth 320ms error expansion (`grid-template-rows: 0fr -> 1fr` + `opacity: 0 -> 1`).
 * - Retains last error text while collapsing so text fades cleanly without snapping empty.
 */
export function MobileField({
  label,
  htmlFor,
  required = false,
  hint = '',
  error = '',
  children,
  className = '',
}) {
  const [retainedError, setRetainedError] = useState(error || '');
  if (error && error !== retainedError) {
    setRetainedError(error);
  }

  const hasError = Boolean(error);

  return (
    <div
      className={`m-field ${className}`.trim()}
      data-invalid={hasError ? 'true' : undefined}
    >
      {label && (
        <div className="m-field-label-row">
          <label htmlFor={htmlFor} className="m-field-label">
            {required && (
              <span className="m-field-required" aria-hidden="true">
                *
              </span>
            )}
            <span>{label}：</span>
          </label>
          {hint && <span className="m-field-hint">{hint}</span>}
        </div>
      )}

      {children}

      <div
        className="m-field-error-shell"
        data-open={hasError ? 'true' : undefined}
        aria-hidden={!hasError}
      >
        <div className="m-field-error-inner">
          <p className="m-field-error-text" role={hasError ? 'alert' : undefined}>
            <CircleAlert size={13} strokeWidth={2.2} style={{ flexShrink: 0 }} />
            <span>{error || retainedError}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

MobileField.propTypes = {
  label: P.node,
  htmlFor: P.string,
  required: P.bool,
  hint: P.node,
  error: P.string,
  children: P.node,
  className: P.string,
};

