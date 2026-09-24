/**
 * Step 4: Search Sample Type 1 모듈 export
 *
 * 외부에서는 이 폴더 내부 파일을 직접 참조하지 않고,
 * index.ts를 통해 화면과 공개 타입만 사용한다.
 */
export { default as SearchSampleType1Page} from './SearchSampleType1Page';
export type {
    SearchSampleType1Condition,
    SearchSampleType1Row,
} from './searchSampleType1.types';
