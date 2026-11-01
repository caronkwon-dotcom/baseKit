package com.caron.basekit.core.menu;

import com.caron.basekit.core.program.ProgramService;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MenuRuntimeServiceTest {
    @Test
    void propagatesMenuQueryFailureInsteadOfReturningAnEmptyMenuTree() {
        MenuMapper mapper = mock(MenuMapper.class);
        ProgramService programService = mock(ProgramService.class);
        DataAccessResourceFailureException failure = new DataAccessResourceFailureException("DB unavailable");
        when(mapper.findMenus(null, null, null, null, "Y")).thenThrow(failure);

        MenuService service = new MenuService(mapper, programService);

        assertThrows(DataAccessResourceFailureException.class, service::findRuntimeMenuTree);
    }
}
