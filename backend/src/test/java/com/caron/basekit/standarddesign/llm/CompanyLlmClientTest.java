package com.caron.basekit.standarddesign.llm;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;

class CompanyLlmClientTest {
    @Test void sendsPostAndReadsContentAndClassifiesFailuresWithoutProviderBody() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var status = new java.util.concurrent.atomic.AtomicInteger(200);
        var body = new java.util.concurrent.atomic.AtomicReference<>("{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"result\"}}]}");
        var method = new java.util.concurrent.atomic.AtomicReference<String>();
        server.createContext("/v1/chat/completions", exchange -> {
            method.set(exchange.getRequestMethod());
            exchange.getRequestBody().readAllBytes();
            byte[] bytes = body.get().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(status.get(), bytes.length);
            try (var out = exchange.getResponseBody()) { out.write(bytes); }
        });
        server.start();
        try {
            var client = new CompanyLlmClient(new LlmProperties(true, "http://127.0.0.1:" + server.getAddress().getPort() + "/v1/", "test-key", "test-model", "/chat/completions"));
            assertEquals("result", client.chat("system", "input").content());
            assertEquals("POST", method.get());
            status.set(401); body.set("secret provider details");
            var denied = assertThrows(LlmConnectionException.class, () -> client.chat("system", "input"));
            assertTrue(denied.diagnosticMessage().contains("HTTP 401"));
            assertFalse(denied.diagnosticMessage().contains("secret"));
            status.set(200); body.set("not-json");
            assertTrue(assertThrows(LlmConnectionException.class, () -> client.chat("system", "input")).diagnosticMessage().contains("형식"));
            body.set("{\"choices\":[{\"message\":{\"content\":\"\"}}]}");
            assertTrue(assertThrows(LlmConnectionException.class, () -> client.chat("system", "input")).diagnosticMessage().contains("content"));
        } finally { server.stop(0); }
    }
}
