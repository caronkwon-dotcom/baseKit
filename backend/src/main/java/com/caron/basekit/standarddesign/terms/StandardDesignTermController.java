package com.caron.basekit.standarddesign.terms;

import com.caron.basekit.common.api.ApiResponse;
import com.caron.basekit.common.api.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ExceptionHandler;

@RestController
@RequestMapping("/api/standard-design/terms")
class StandardDesignTermController {

    private final StandardDesignTermService service;

    StandardDesignTermController(StandardDesignTermService service) {
        this.service = service;
    }

    @GetMapping
    ApiResponse<StandardDesignTermPage> search(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ApiResponse.success(service.search(keyword, page, size));
    }

    @GetMapping("/{termId}")
    ApiResponse<StandardDesignTerm> get(@PathVariable String termId) {
        return ApiResponse.success(service.get(termId));
    }

    @ExceptionHandler(StandardDesignTermNotFoundException.class)
    ResponseEntity<ErrorResponse> handleNotFound(StandardDesignTermNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of("STANDARD_TERM_NOT_FOUND", exception.getMessage()));
    }
}
