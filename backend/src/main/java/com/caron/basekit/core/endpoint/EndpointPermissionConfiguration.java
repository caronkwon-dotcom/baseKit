package com.caron.basekit.core.endpoint;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.server.ResponseStatusException;
import jakarta.servlet.http.*;

@Configuration
public class EndpointPermissionConfiguration implements WebMvcConfigurer {
    private final ObjectProvider<EndpointMapper> mapper;
    private final ObjectProvider<EndpointPermissionProvider> provider;
    private final RequestMappingHandlerMapping mapping;
    public EndpointPermissionConfiguration(ObjectProvider<EndpointMapper> mapper, ObjectProvider<EndpointPermissionProvider> provider,
            @Qualifier("requestMappingHandlerMapping") @org.springframework.context.annotation.Lazy RequestMappingHandlerMapping mapping) {
        this.mapper=mapper; this.provider=provider; this.mapping=mapping;
    }
    @Override public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                EndpointPermissionProvider permissions = provider.getIfAvailable();
                // Current foundation has no authenticated session. Host opts in by supplying this bean.
                if (permissions==null || !(handler instanceof HandlerMethod method)) return true;
                String path = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
                var info = mapping.getHandlerMethods().entrySet().stream()
                        .filter(e -> e.getValue().getMethod().equals(method.getMethod()) && e.getKey().getPatternValues().contains(path)
                                && e.getKey().getMatchingCondition(request)!=null).findFirst().orElse(null);
                if (info==null) return true;
                String httpMethod=request.getMethod();
                if ("HEAD".equals(httpMethod) && !info.getKey().getMethodsCondition().getMethods().contains(org.springframework.web.bind.annotation.RequestMethod.HEAD)) httpMethod="GET";
                String id=EndpointCollector.id(httpMethod,path,method.getMethod().toGenericString(),info.getKey().toString());
                if (!EndpointPermissionPolicy.allowed(mapper.getObject().findGrants(id),
                        key -> permissions.hasProgram(request,key), (key,group) -> permissions.hasButtonGroup(request,key,group)))
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,"프로그램 또는 버튼 권한 그룹 실행 권한이 없습니다.");
                return true;
            }
        }).addPathPatterns("/api/**");
    }
}
