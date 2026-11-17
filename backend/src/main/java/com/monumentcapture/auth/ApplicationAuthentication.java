package com.monumentcapture.auth;

import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

public class ApplicationAuthentication extends JwtAuthenticationToken {
    private final ApplicationUser user;

    public ApplicationAuthentication(Jwt jwt, ApplicationUser user) {
        super(jwt, List.of(new SimpleGrantedAuthority("ROLE_" + user.role())), user.id().toString());
        this.user = user;
    }

    public ApplicationUser user() { return user; }
}
