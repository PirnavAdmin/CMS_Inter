import React from "react";
import { useEffectivePermissions } from "./useEffectivePermissions";
import { ACTIONS } from "./rolesPermissions.constants";

/**
 * Declarative component for guarding in-page UI elements, sections, and features.
 * 
 * Usage:
 * <PermissionGate module="fee-management" screen="fee-collection" action="create" fallback={<span>Locked</span>}>
 *    <Button>Collect Payment</Button>
 * </PermissionGate>
 */
export function PermissionGate({
  module,
  screen = null,
  action = ACTIONS.VIEW,
  fallback = null,
  children,
}) {
  const { canDo, canView, loading } = useEffectivePermissions();

  if (loading) return null;

  const hasAccess = screen
    ? canDo(module, action, screen)
    : (action === ACTIONS.VIEW ? canView(module) : canDo(module, action));

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * Button wrapper that either hides or disables buttons when permission is lacking.
 */
export function PermissionButton({
  module,
  screen = null,
  action = ACTIONS.VIEW,
  disableInsteadOfHide = false,
  tooltipMessage,
  disabled = false,
  children,
  ...props
}) {
  const { canDo, canView } = useEffectivePermissions();

  const hasAccess = screen
    ? canDo(module, action, screen)
    : (action === ACTIONS.VIEW ? canView(module) : canDo(module, action));

  if (!hasAccess) {
    if (!disableInsteadOfHide) return null;
    return (
      <span
        title={tooltipMessage || `You do not have permission to perform '${action}' on this screen`}
        style={{ display: "inline-block", cursor: "not-allowed" }}
      >
        {React.cloneElement(children, {
          disabled: true,
          style: { ...children.props?.style, pointerEvents: "none", opacity: 0.5 },
          ...props,
        })}
      </span>
    );
  }

  return React.cloneElement(children, { disabled, ...props });
}

export default PermissionGate;
