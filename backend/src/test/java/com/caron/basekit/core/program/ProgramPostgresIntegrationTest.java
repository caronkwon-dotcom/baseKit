package com.caron.basekit.core.program;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(named="BASEKIT_DB_URL", matches="jdbc:postgresql:.+")
class ProgramPostgresIntegrationTest {
    @Autowired ProgramService service;
    @Test void verifiesV4MigrationAndSeed() { assertThat(service.findProgram("PROGRAM_MGMT").PROGRAM_KEY()).isEqualTo("PROGRAM_MGMT"); }
    @Test @Transactional void performsCrudOnPostgresAndRollsBack() {
        ProgramSaveRequest request = new ProgramSaveRequest("PG_PROGRAM_TEST","PG_PROGRAM_KEY","PG Test","SYSTEM","GRID","/pg-test",null,"Y");
        assertThat(service.createProgram(request).PROGRAM_ID()).isEqualTo("PG_PROGRAM_TEST");
        assertThatThrownBy(() -> service.createProgram(new ProgramSaveRequest("PG_PROGRAM_OTHER","PG_PROGRAM_KEY","Duplicate","SYSTEM","GRID","/duplicate",null,"Y"))).isInstanceOf(ProgramConflictException.class);
        assertThat(service.updateProgram("PG_PROGRAM_TEST", new ProgramSaveRequest("PG_PROGRAM_TEST","PG_PROGRAM_KEY","PG Updated","SYSTEM","GRID","/pg-test",null,"N")).USE_YN()).isEqualTo("N");
        service.deleteProgram("PG_PROGRAM_TEST");
        assertThatThrownBy(() -> service.findProgram("PG_PROGRAM_TEST")).isInstanceOf(ProgramNotFoundException.class);
    }
}
