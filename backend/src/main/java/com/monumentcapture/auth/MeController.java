package com.monumentcapture.auth;

import java.time.Instant;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {
    @GetMapping("/api/me")
    public MeResponse me(ApplicationAuthentication authentication) {
        ApplicationUser user = authentication.user();
        return new MeResponse(user.id(), user.displayName(), user.email(), user.role(), user.createdAt(), Instant.now());
    }

    public record MeResponse(UUID id, String displayName, String email, String role, Instant createdAt, Instant serverNow) {}
}
