package com.monumentcapture.auth;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import com.monumentcapture.health.HealthController;

@WebMvcTest({MeController.class, HealthController.class})
@Import(SecurityConfig.class)
class SecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtDecoder decoder;
    @MockitoBean UserRepository users;
    private final UUID subject = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    Jwt token() {
        return Jwt.withTokenValue("valid").header("alg", "RS256").subject(subject.toString())
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(900)).build();
    }
    void account(String role) {
        when(decoder.decode("valid")).thenReturn(token());
        when(users.findBySubject(subject)).thenReturn(Optional.of(new ApplicationUser(userId,"Player","player@example.com",role,Instant.now())));
    }
    @Test void healthIsPublicAndMeRequiresAuthentication() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk());
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error.code").value("unauthenticated"));
    }
    @Test void returnsApplicationIdentityRatherThanProviderId() throws Exception {
        account("player");
        mvc.perform(get("/api/me").header(HttpHeaders.AUTHORIZATION,"Bearer valid"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.display_name").value("Player")).andExpect(jsonPath("$.role").value("player"))
                .andExpect(jsonPath("$.server_now").exists());
    }
    @Test void unmappedIdentityIsForbidden() throws Exception {
        when(decoder.decode("valid")).thenReturn(token());
        when(users.findBySubject(subject)).thenReturn(Optional.empty());
        mvc.perform(get("/api/me").header(HttpHeaders.AUTHORIZATION,"Bearer valid"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.error.code").value("account_not_provisioned"));
    }
    @Test void invalidTokenIsUnauthorized() throws Exception {
        when(decoder.decode("bad")).thenThrow(new BadJwtException("bad signature"));
        mvc.perform(get("/api/me").header(HttpHeaders.AUTHORIZATION,"Bearer bad"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(users);
    }
    @Test void playerCannotUseModeratorRoutes() throws Exception {
        account("player");
        mvc.perform(post("/api/moderator/monuments").header(HttpHeaders.AUTHORIZATION,"Bearer valid"))
                .andExpect(status().isForbidden());
    }
    @Test void moderatorCannotSubmitPlayerCaptures() throws Exception {
        account("moderator");
        mvc.perform(post("/api/captures").header(HttpHeaders.AUTHORIZATION,"Bearer valid"))
                .andExpect(status().isForbidden());
    }
    @Test void lookupOutageIsServiceUnavailable() throws Exception {
        when(decoder.decode("valid")).thenReturn(token());
        when(users.findBySubject(subject)).thenThrow(new DataAccessResourceFailureException("offline"));
        mvc.perform(get("/api/me").header(HttpHeaders.AUTHORIZATION,"Bearer valid"))
                .andExpect(status().isServiceUnavailable());
    }
    @Test void configuredOriginCanPreflightButOtherOriginsCannot() throws Exception {
        mvc.perform(options("/api/me").header("Origin","http://localhost:8081")
                .header("Access-Control-Request-Method","GET").header("Access-Control-Request-Headers","authorization"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","http://localhost:8081"));
        mvc.perform(options("/api/me").header("Origin","https://untrusted.example")
                .header("Access-Control-Request-Method","GET")).andExpect(status().isForbidden());
    }
}
