export interface CodeManageDetailReloaders<TSearch> {
  attributes: (groupId: string) => Promise<void>;
  codes: (groupId: string, search: TSearch) => Promise<void>;
}

export async function reloadSavedCodeDetail<TSearch>(
  dataset: keyof CodeManageDetailReloaders<TSearch>,
  groupId: string,
  search: TSearch,
  reloaders: CodeManageDetailReloaders<TSearch>,
) {
  if (dataset === 'attributes') await reloaders.attributes(groupId);
  else await reloaders.codes(groupId, search);
}
