package com.caron.basekit.core.localauth;

import com.caron.basekit.core.endpoint.EndpointPermissionProvider;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.Principal;
import java.util.*;

/** Explicit COMMON loopback review identity; never a substitute for the Host provider. */
@Component
@Order(-100)
@ConditionalOnProperty(name="basekit.local-test-auth.enabled", havingValue="true")
public class LocalTestAuthProvider extends OncePerRequestFilter implements EndpointPermissionProvider {
    private static final String IDENTITY = LocalTestAuthProvider.class.getName()+".identity";
    private static final String USER = "common-reviewer";
    private static final Set<String> PROGRAMS = Set.of("MENU_MGMT", "DOCUMENT_CENTER", "LYT_L1R2");
    private final byte[] password;
    public LocalTestAuthProvider(Environment environment) {
        var profiles = Set.copyOf(Arrays.asList(environment.getActiveProfiles()));
        String secret = environment.getProperty("basekit.local-test-auth.password", "");
        if (!profiles.contains("local") || !profiles.contains("common")
                || !Set.of("local", "common").containsAll(profiles)
                || !"127.0.0.1".equals(environment.getProperty("server.address"))
                || !"8081".equals(environment.getProperty("server.port")) || secret.length()<32)
            throw new IllegalStateException("Local test authentication requires only local,common profiles, 127.0.0.1:8081 and a 32+ character credential.");
        password = secret.getBytes(StandardCharsets.UTF_8);
    }
    private static boolean loopback(String value) {
        return Set.of("127.0.0.1", "::1", "0:0:0:0:0:0:0:1").contains(value);
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!request.getRequestURI().startsWith("/api/")) { chain.doFilter(request,response); return; }
        response.setHeader("Cache-Control", "no-store");
        if (!loopback(request.getRemoteAddr()) || !loopback(request.getLocalAddr())
                || !Set.of("localhost", "127.0.0.1").contains(request.getServerName())) {
            response.sendError(403,"Local test authentication is loopback only."); return;
        }
        boolean unsafe = !Set.of("GET", "HEAD", "OPTIONS").contains(request.getMethod());
        if (unsafe && !"http://localhost:5174".equals(request.getHeader("Origin"))) {
            response.sendError(403,"COMMON same-origin request required."); return;
        }
        String path = request.getRequestURI();
        if (path.equals("/api/core/local-test-auth")) {
            response.setContentType("text/html;charset=UTF-8");
            response.setHeader("Content-Security-Policy", "default-src 'none'; form-action 'self'; frame-ancestors 'none'");
            if (request.getMethod().equals("GET")) {
                response.getWriter().write("<!doctype html><html lang='ko'><title>COMMON 로컬 테스트 인증</title><h1>COMMON 로컬 테스트 인증</h1><p>common-reviewer / COMMON_REVIEWER: 메뉴 설정 조회·저장, DOCUMENT_CENTER·LYT_L1R2 실행만 허용</p><form method='post'><label>사용자 <input name='username' autocomplete='username' required></label><label>테스트 자격 <input name='password' type='password' autocomplete='current-password' required></label><button>로그인</button></form></html>"); return;
            }
            if (request.getMethod().equals("POST") && USER.equals(request.getParameter("username"))
                    && MessageDigest.isEqual(password, Objects.toString(request.getParameter("password"), "").getBytes(StandardCharsets.UTF_8))) {
                if (request.getSession(false)!=null) request.getSession(false).invalidate();
                var session=request.getSession(true);
                session.setAttribute(IDENTITY, USER); session.setMaxInactiveInterval(1800);
                response.sendRedirect("/baseKit/"); return;
            }
            response.sendError(401,"Invalid local test credentials."); return;
        }
        var session = request.getSession(false);
        if (session==null || !USER.equals(session.getAttribute(IDENTITY))) {
            response.sendError(401,"COMMON 로컬 테스트 로그인이 필요합니다: /api/core/local-test-auth"); return;
        }
        if (path.equals("/api/core/local-test-auth/logout") && request.getMethod().equals("POST")) {
            session.invalidate(); response.setStatus(204); return;
        }
        // Review identity has no general business/administration API grant.
        if (!path.equals("/api/core/window-access") && !path.equals("/api/core/menu-execution-settings")
                && !path.matches("/api/core/menu-execution-settings/[^/]+")) {
            response.sendError(403,"COMMON_REVIEWER has no API grant."); return;
        }
        chain.doFilter(new HttpServletRequestWrapper(request) {
            @Override public Principal getUserPrincipal() { return () -> USER; }
            @Override public String getRemoteUser() { return USER; }
            @Override public boolean isUserInRole(String role) { return "COMMON_REVIEWER".equals(role); }
        }, response);
    }
    @Override public boolean hasProgram(HttpServletRequest request, String programKey) {
        var session=request.getSession(false);
        return session!=null && USER.equals(session.getAttribute(IDENTITY))
                && request.getUserPrincipal()!=null && USER.equals(request.getUserPrincipal().getName()) && PROGRAMS.contains(programKey);
    }
    @Override public boolean hasButtonGroup(HttpServletRequest request, String programKey, String groupCode) {
        return hasProgram(request,programKey) && "MENU_MGMT".equals(programKey) && "SAVE".equals(groupCode);
    }
}
