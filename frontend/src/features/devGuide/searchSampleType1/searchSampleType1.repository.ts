import { searchSampleTypeRows } from './searchSampleType1.mock';
import type { SearchSampleType1Condition } from './searchSampleType1.types';

export const searchSampleType1Repository = {
    search(condition: SearchSampleType1Condition) {
        const sampleName = condition.sampleName.trim().toLowerCase();

        return searchSampleTypeRows.filter((row) =>
            (sampleName === '' || row.SAMPLE_NAME.toLowerCase().includes(sampleName)) &&
            (condition.sampleType === '' || row.SAMPLE_TYPE === condition.sampleType) &&
            (condition.useYn === '' || row.USE_YN === condition.useYn),
        );
    },
};
