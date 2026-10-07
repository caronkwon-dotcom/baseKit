import type { GridRowState } from '../../../components/grid/gridRowState';
import type { GroupMember } from './requirementGroupApi';

/** Compare saved business fields only; fetched Requirement snapshots are not edits. */
export function groupMemberRowState(member: GroupMember, original?: GroupMember): GridRowState {
  if (!original) return 'INSERTED';
  const unchanged = member.INCLUSION_REASON === original.INCLUSION_REASON
    && member.HUMAN_YN === original.HUMAN_YN
    && member.REVIEWED_REVISION === original.REVIEWED_REVISION
    && member.SOURCE_ANALYSIS_IDS.length === original.SOURCE_ANALYSIS_IDS.length
    && member.SOURCE_ANALYSIS_IDS.every(id => original.SOURCE_ANALYSIS_IDS.includes(id));
  return unchanged ? 'NORMAL' : 'UPDATED';
}
