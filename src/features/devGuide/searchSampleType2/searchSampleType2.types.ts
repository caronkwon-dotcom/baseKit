export interface SearchSampleType2Condition {
  requestNo: string;
  requestName: string;
  requestType: string;
  status: string;
  companyName: string;
  departmentName: string;
  requesterName: string;
  priority: string;
  requestedFrom: string;
  requestedTo: string;
  ownerName: string;
  keyword: string;
}

export interface SearchSampleType2Row {
  REQUEST_NO: string;
  REQUEST_NAME: string;
  REQUEST_TYPE: 'STANDARD' | 'URGENT' | 'CHANGE';
  STATUS: 'DRAFT' | 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED';
  COMPANY_NAME: string;
  DEPARTMENT_NAME: string;
  REQUESTER_NAME: string;
  PRIORITY: 'HIGH' | 'NORMAL' | 'LOW';
  OWNER_NAME: string;
  REQUESTED_AT: string;
}
