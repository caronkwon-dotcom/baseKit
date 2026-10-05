package com.caron.basekit.core.endpoint;

import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface EndpointMapper {
    List<EndpointData> findEndpoints(@Param("PROGRAM_ID") String programId);
    List<ButtonGroup> findGroups(@Param("PROGRAM_ID") String programId);
    int countEndpoint(@Param("ENDPOINT_ID") String endpointId);
    void markStale();
    void insertEndpoint(EndpointData endpoint);
    void updateEndpoint(EndpointData endpoint);
    void deleteMappings(@Param("PROGRAM_ID") String programId, @Param("ENDPOINT_ID") String endpointId);
    void insertMapping(@Param("PROGRAM_ID") String programId, @Param("ENDPOINT_ID") String endpointId, @Param("GROUP_CODE") String groupCode);
    void deleteGroups(@Param("PROGRAM_ID") String programId);
    void insertGroup(@Param("PROGRAM_ID") String programId, @Param("GROUP") ButtonGroup group);
    List<EndpointGrant> findGrants(@Param("ENDPOINT_ID") String endpointId);
    record EndpointGrant(String PROGRAM_KEY, String GROUP_CODE, String USE_YN) {}
}
