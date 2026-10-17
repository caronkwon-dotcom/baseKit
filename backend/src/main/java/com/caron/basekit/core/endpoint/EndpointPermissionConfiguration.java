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
    private final com.caron.basekit.core.windowaccess.WindowAccessPolicy accessPolicy;
    public EndpointPermissionConfiguration(ObjectProvider<EndpointMapper> mapper, ObjectProvider<EndpointPermissionProvider> provider,
            @Qualifier("requestMappingHandlerMapping") @org.springframework.context.annotation.Lazy RequestMappingHandlerMapping mapping, org.springframework.core.env.Environment environment) {
        this.mapper=mapper; this.provider=provider; this.mapping=mapping; this.accessPolicy=new com.caron.basekit.core.windowaccess.WindowAccessPolicy(environment);
    }
    @Override public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                EndpointPermissionProvider permissions = provider.getIfAvailable();
                // Production APIs require trusted Host integration and an authenticated principal.
                if (!accessPolicy.developmentEnvironment() && (permissions==null || request.getUserPrincipal()==null))
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Host 인증 연결이 필요합니다.");
                if (permissions==null || !(handler instanceof HandlerMethod method)) return true;
                String path = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
                var info = mapping.getHandlerMethods().entrySet().stream()
                        .filter(e -> e.getValue().getMethod().equals(method.getMethod()) && e.getKey().getPatternValues().contains(path)
                                && e.getKey().getMatchingCondition(request)!=null).findFirst().orElse(null);
                if (info==null) {
                    if (!accessPolicy.developmentEnvironment()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
                    return true;
                }
                String httpMethod=request.getMethod();
                if ("HEAD".equals(httpMethod) && !info.getKey().getMethodsCondition().getMethods().contains(org.springframework.web.bind.annotation.RequestMethod.HEAD)) httpMethod="GET";
                String id=EndpointCollector.id(httpMethod,path,method.getMethod().toGenericString(),info.getKey().toString());
                var grants=mapper.getObject().findGrants(id);
                // This endpoint performs its own catalog, principal and Host grant checks.
                boolean selfAuthorized=method.getBeanType().equals(com.caron.basekit.core.windowaccess.WindowAccessController.class)
                        || method.getBeanType().equals(com.caron.basekit.core.menuexecution.MenuExecutionController.class);
                if (!accessPolicy.developmentEnvironment() && grants.isEmpty() && !selfAuthorized)
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,"API 권한 매핑이 필요합니다.");
                if (!EndpointPermissionPolicy.allowed(grants,
                        key -> permissions.hasProgram(request,key), (key,group) -> permissions.hasButtonGroup(request,key,group)))
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,"프로그램 또는 버튼 권한 그룹 실행 권한이 없습니다.");
                return true;
            }
        }).addPathPatterns("/api/**");
    }
}
