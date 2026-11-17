package com.monumentcapture.auth;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean
    JwtDecoder jwtDecoder(@Value("${app.auth.issuer}") String issuer,
                          @Value("${app.auth.audience}") String audience) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(issuer + "/.well-known/jwks.json")
                .jwsAlgorithms(algorithms -> { algorithms.clear(); algorithms.add(SignatureAlgorithm.ES256);
                    algorithms.add(SignatureAlgorithm.RS256); }).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuer), claimsValidator(audience)));
        return decoder;
    }

    static OAuth2TokenValidator<Jwt> claimsValidator(String audience) {
        return jwt -> {
            try {
                String subject = jwt.getSubject();
                if (!UUID.fromString(subject).toString().equalsIgnoreCase(subject)) throw new IllegalArgumentException("Invalid subject");
                if (jwt.getExpiresAt() != null && jwt.getAudience().contains(audience)) {
                    return OAuth2TokenValidatorResult.success();
                }
            } catch (IllegalArgumentException | NullPointerException ignored) { }
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid access token claims", null));
        };
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http, JwtDecoder decoder, UserRepository users, ObjectMapper mapper) throws Exception {
        org.springframework.security.web.AuthenticationEntryPoint entryPoint = (req, res, ex) -> {
            if (ex instanceof UnprovisionedUserException) error(res, mapper, 403, "account_not_provisioned", "Account access has not been provisioned.");
            else if (ex instanceof AuthenticationServiceException) error(res, mapper, 503, "authentication_unavailable", "Account verification is temporarily unavailable.");
            else error(res, mapper, 401, "unauthenticated", "Invalid or expired access token.");
        };
        return http.csrf(csrf -> csrf.disable()).cors(cors -> {})
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                        .requestMatchers("/api/moderator/**").hasRole("moderator")
                        .requestMatchers("/api/me/holdings", "/api/me/captures/**", "/api/uploads/**", "/api/captures/**").hasRole("player")
                        .anyRequest().authenticated())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((req, res, ex) -> error(res, mapper, 401, "unauthenticated", "Login required."))
                        .accessDeniedHandler((req, res, ex) -> error(res, mapper, 403, "forbidden", "Access denied.")))
                .oauth2ResourceServer(oauth -> oauth
                        .authenticationEntryPoint(entryPoint)
                        .withObjectPostProcessor(new org.springframework.security.config.ObjectPostProcessor<org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter>() {
                            @Override public <O extends org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter> O postProcess(O filter) {
                                var handler = new org.springframework.security.web.authentication.AuthenticationEntryPointFailureHandler(entryPoint);
                                handler.setRethrowAuthenticationServiceException(false);
                                filter.setAuthenticationFailureHandler(handler);
                                return filter;
                            }
                        })
                        .accessDeniedHandler((req, res, ex) -> error(res, mapper, 403, "forbidden", "Access denied."))
                        .jwt(jwt -> jwt.decoder(decoder).jwtAuthenticationConverter(token -> {
                            try {
                                var user = users.findBySubject(UUID.fromString(token.getSubject()))
                                        .orElseThrow(UnprovisionedUserException::new);
                                return new ApplicationAuthentication(token, user);
                            } catch (DataAccessException ex) {
                                throw new AuthenticationServiceException("Account lookup unavailable", ex);
                            }
                        }))).build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.allowed-origins}") List<String> origins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    private static void error(HttpServletResponse response, ObjectMapper mapper, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(response.getOutputStream(), Map.of("error", Map.of("code", code, "message", message, "details", Map.of()), "server_now", Instant.now()));
    }

    private static class UnprovisionedUserException extends org.springframework.security.core.AuthenticationException {
        UnprovisionedUserException() { super("Account not provisioned"); }
    }
}
