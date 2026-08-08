import { searchSampleType2Rows } from './searchSampleType2.mock';
import type { SearchSampleType2Condition } from './searchSampleType2.types';

function includes(source: string, keyword: string) {
  return keyword === '' || source.toLowerCase().includes(keyword.trim().toLowerCase());
}

export const searchSampleType2Repository = {
  search(condition: SearchSampleType2Condition) {
    return searchSampleType2Rows.filter((row) =>
      includes(row.REQUEST_NO, condition.requestNo) &&
      includes(row.REQUEST_NAME, condition.requestName) &&
      (condition.requestType === '' || row.REQUEST_TYPE === condition.requestType) &&
      (condition.status === '' || row.STATUS === condition.status) &&
      includes(row.COMPANY_NAME, condition.companyName) &&
      includes(row.DEPARTMENT_NAME, condition.departmentName) &&
      includes(row.REQUESTER_NAME, condition.requesterName) &&
      (condition.priority === '' || row.PRIORITY === condition.priority) &&
      (condition.requestedFrom === '' || row.REQUESTED_AT >= condition.requestedFrom) &&
      (condition.requestedTo === '' || row.REQUESTED_AT <= condition.requestedTo) &&
      includes(row.OWNER_NAME, condition.ownerName) &&
      (condition.keyword === '' ||
        includes(`${row.REQUEST_NAME} ${row.DEPARTMENT_NAME} ${row.REQUESTER_NAME}`, condition.keyword)),
    );
  },
};
