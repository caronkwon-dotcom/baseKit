package com.caron.basekit.core.endpoint;

public record EndpointData(String ENDPOINT_ID, String HTTP_METHOD, String PATH,
        String CONTROLLER_CLASS, String HANDLER_METHOD, String COLLECTION_STATUS,
        String MAPPING_STATUS, String GROUP_CODE) {}
