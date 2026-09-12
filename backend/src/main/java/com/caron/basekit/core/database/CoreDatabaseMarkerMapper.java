package com.caron.basekit.core.database;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CoreDatabaseMarkerMapper {

    CoreDatabaseMarker findFoundationMarker();
}
