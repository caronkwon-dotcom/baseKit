package com.caron.basekit.standarddesign.terms;

class StandardDesignTermNotFoundException extends RuntimeException {
    StandardDesignTermNotFoundException(String termId) {
        super("용어를 찾을 수 없습니다: " + termId);
    }
}
