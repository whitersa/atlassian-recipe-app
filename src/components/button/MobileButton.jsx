import { forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import { ButtonBase } from './ButtonBase';
import { P } from '../propTypes';

export const MobileButton = forwardRef(function MobileButton(
  {
    variant = 'secondary',
    size = 'md',
    icon = null,
    iconEnd = null,
    iconOnly = false,
    loading = false,
    disabled = false,
    block = false,
    type = 'button',
    className = '',
    children,
    ...rest
  },
  forwardedRef
) {
  const hasLabel = children !== undefined && children !== null && children !== false;
  const hasIconText = Boolean(hasLabel && (icon || iconEnd));
  const iconPixelSize = iconOnly ? 20 : 16;

  return (
    <ButtonBase
      ref={forwardedRef}
      type={type}
      disabled={disabled || loading}
      className={`m-btn ${className}`.trim()}
      data-variant={variant}
      data-size={size}
      data-icon-only={iconOnly ? 'true' : undefined}
      data-icon-text={hasIconText ? 'true' : undefined}
      data-loading={loading ? 'true' : undefined}
      data-block={block ? 'true' : undefined}
      {...rest}
    >
      <span className="m-btn-content">
        {icon && <span className="m-btn-icon">{icon}</span>}
        {hasLabel && <span className="m-btn-label">{children}</span>}
        {iconEnd && <span className="m-btn-icon">{iconEnd}</span>}
      </span>
      {loading && (
        <span className="m-btn-loading" aria-hidden="true">
          <LoaderCircle size={iconPixelSize} strokeWidth={2.25} className="m-btn-spinner" />
        </span>
      )}
    </ButtonBase>
  );
});

MobileButton.propTypes = {
  variant: P.string,
  size: P.string,
  icon: P.node,
  iconEnd: P.node,
  iconOnly: P.bool,
  loading: P.bool,
  disabled: P.bool,
  block: P.bool,
  type: P.string,
  className: P.string,
  children: P.node,
};

