/**
 * Step 4: Search Sample Type 1 모듈 export
 *
 * 외부에서는 이 폴더 내부 파일을 직접 참조하지 않고,
 * index.ts를 통해 필요한 화면/타입/mock을 가지도록 한다.
 */
export { default as SearchSampleType1Page} from './SearchSampleType1Page';
export type { SearchSampleType1Row } from './searchSampleType1.types';
export { searchSampleTypeRows } from './searchSampleType1.mock';