package com.caron.basekit.core.endpoint;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Component
public class EndpointCollector {
    private final RequestMappingHandlerMapping mapping;
    private final EndpointService service;
    public EndpointCollector(@Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping mapping, EndpointService service) { this.mapping=mapping; this.service=service; }
    @EventListener(ApplicationReadyEvent.class)
    public void collect() {
        List<EndpointData> endpoints = new ArrayList<>();
        mapping.getHandlerMethods().forEach((info, handler) -> {
            if (!handler.getBeanType().getPackageName().startsWith("com.caron.basekit")) return;
            Set<RequestMethod> methods = info.getMethodsCondition().getMethods();
            if (methods.isEmpty()) methods = EnumSet.allOf(RequestMethod.class);
            for (String path : info.getPatternValues()) for (RequestMethod method : methods) {
                // Keep overloads with params/headers/consumes distinct without guessing source mappings.
                String id = id(method.name(), path, handler.getMethod().toGenericString(), info.toString());
                endpoints.add(new EndpointData(id,method.name(),path,handler.getBeanType().getName(),handler.getMethod().toGenericString(),"ACTIVE","UNMAPPED",null));
            }
        });
        service.collect(endpoints);
    }
    static String id(String... parts) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(String.join("\n",parts).getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
