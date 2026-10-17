package com.caron.basekit.core.localauth;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.*;
import jakarta.servlet.http.*;
import static org.junit.jupiter.api.Assertions.*;
class LocalTestAuthProviderTest {
 private static final String SECRET="test-only-not-a-real-credential-123456789";
 private MockEnvironment env() {
  var e=new MockEnvironment().withProperty("server.address","127.0.0.1").withProperty("server.port","8081")
   .withProperty("basekit.local-test-auth.password",SECRET); e.setActiveProfiles("local","common"); return e;
 }
 private MockHttpServletRequest request(String method,String path) {
  var r=new MockHttpServletRequest(method,path); r.setRemoteAddr("127.0.0.1");r.setLocalAddr("127.0.0.1");r.setServerName("localhost");
  if(!method.equals("GET"))r.addHeader("Origin","http://localhost:5174");return r;
 }
 @Test void rejectsEveryNonLocalProfileAndUnsafeBindingOrCredential() {
  for(var profiles:new String[][]{{},{"common"},{"dev","common"},{"local","common","prod"},{"local","common","production"},{"local","common","staging"},{"test","local","common"}}){
   var e=env();e.setActiveProfiles(profiles);assertThrows(IllegalStateException.class,()->new LocalTestAuthProvider(e));
  }
  for(var entry:new String[][]{{"server.address","0.0.0.0"},{"server.address","localhost"},{"server.port","8080"},{"basekit.local-test-auth.password","short"}}){
   var e=env(); e.setProperty(entry[0],entry[1]);assertThrows(IllegalStateException.class,()->new LocalTestAuthProvider(e));
  }
 }
 @Test void credentialsSessionRotationCsrfScopeAndLogout() throws Exception {
  var provider=new LocalTestAuthProvider(env());
  var anonymous=request("GET","/api/core/menu-execution-settings");var res=new MockHttpServletResponse();
  provider.doFilter(anonymous,res,new MockFilterChain());assertEquals(401,res.getStatus());
  var login=request("POST","/api/core/local-test-auth"); login.setParameter("username","common-reviewer");login.setParameter("password","wrong");
  res=new MockHttpServletResponse();provider.doFilter(login,res,new MockFilterChain());assertEquals(401,res.getStatus());
  login.setParameter("password",SECRET);var previous=login.getSession();
  res=new MockHttpServletResponse();provider.doFilter(login,res,new MockFilterChain());assertEquals(302,res.getStatus());assertNotSame(previous,login.getSession());
  var session=(MockHttpSession)login.getSession();assertEquals(1800,session.getMaxInactiveInterval());
  var api=request("PUT","/api/core/menu-execution-settings/SYS");api.setSession(session);
  res=new MockHttpServletResponse();var chain=new MockFilterChain();provider.doFilter(api,res,chain);
  var trusted=(HttpServletRequest)chain.getRequest();assertNotNull(trusted);assertEquals("common-reviewer",trusted.getUserPrincipal().getName());
  assertTrue(provider.hasProgram(trusted,"MENU_MGMT"));assertTrue(provider.hasButtonGroup(trusted,"MENU_MGMT","SAVE"));
  assertTrue(provider.hasProgram(trusted,"DOCUMENT_CENTER"));assertFalse(provider.hasProgram(trusted,"USER_MGMT"));assertFalse(provider.hasButtonGroup(trusted,"MENU_MGMT","DELETE"));
  assertFalse(provider.hasProgram(anonymous,"MENU_MGMT"));
  api.removeHeader("Origin");res=new MockHttpServletResponse();provider.doFilter(api,res,new MockFilterChain());assertEquals(403,res.getStatus());
  api.addHeader("Origin","https://attacker.invalid");res=new MockHttpServletResponse();provider.doFilter(api,res,new MockFilterChain());assertEquals(403,res.getStatus());
  var forbidden=request("GET","/api/core/users");forbidden.setSession(session);res=new MockHttpServletResponse();provider.doFilter(forbidden,res,new MockFilterChain());assertEquals(403,res.getStatus());
  var remote=request("GET","/api/core/window-access");remote.setSession(session);remote.setRemoteAddr("192.168.1.5");res=new MockHttpServletResponse();provider.doFilter(remote,res,new MockFilterChain());assertEquals(403,res.getStatus());
  remote.setRemoteAddr("127.0.0.1");remote.setServerName("attacker.invalid");res=new MockHttpServletResponse();provider.doFilter(remote,res,new MockFilterChain());assertEquals(403,res.getStatus());
  var logout=request("POST","/api/core/local-test-auth/logout");logout.setSession(session);res=new MockHttpServletResponse();provider.doFilter(logout,res,new MockFilterChain());assertEquals(204,res.getStatus());assertTrue(session.isInvalid());
 }
}
