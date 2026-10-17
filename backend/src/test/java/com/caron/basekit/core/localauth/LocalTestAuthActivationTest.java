package com.caron.basekit.core.localauth;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.junit.jupiter.api.Assertions.*;
class LocalTestAuthActivationTest {
 private final ApplicationContextRunner context=new ApplicationContextRunner().withUserConfiguration(LocalTestAuthProvider.class);
 @Test void defaultAndExplicitlyDisabledDoNotInstallTestProvider() {
  context.run(c->assertFalse(c.containsBean("localTestAuthProvider")));
  context.withPropertyValues("basekit.local-test-auth.enabled=false").run(c->assertFalse(c.containsBean("localTestAuthProvider")));
 }
 @Test void accidentalProductionOptInFailsStartupInsteadOfGrantingAccess() {
  context.withPropertyValues("basekit.local-test-auth.enabled=true", "spring.profiles.active=local,common,production",
   "server.address=127.0.0.1", "server.port=8081", "basekit.local-test-auth.password=test-only-production-rejection-123456789")
   .run(c->assertNotNull(c.getStartupFailure()));
 }
}
