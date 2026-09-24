package com.caron.basekit.core.code;

import java.io.Serializable;
import java.util.Objects;

public class CodeAttributeValueId implements Serializable {
    public String CODE_ID;
    public String ATTRIBUTE_DEF_ID;

    public CodeAttributeValueId() {}
    public CodeAttributeValueId(String codeId, String attributeDefId) { this.CODE_ID = codeId; this.ATTRIBUTE_DEF_ID = attributeDefId; }
    @Override public boolean equals(Object other) { return other instanceof CodeAttributeValueId id && Objects.equals(CODE_ID, id.CODE_ID) && Objects.equals(ATTRIBUTE_DEF_ID, id.ATTRIBUTE_DEF_ID); }
    @Override public int hashCode() { return Objects.hash(CODE_ID, ATTRIBUTE_DEF_ID); }
}
