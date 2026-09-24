import type { ActionCode } from '../../constants/actionCodes';

export function canUseGridAction(
  actionCode: ActionCode,
  programActionCodes: readonly ActionCode[],
  hasPermission: (actionCode: ActionCode) => boolean,
) {
  return programActionCodes.includes(actionCode) && hasPermission(actionCode);
}
