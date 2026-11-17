package com.monumentcapture.auth;

import static org.junit.jupiter.api.Assertions.*;
import java.net.InetSocketAddress;
import java.time.Instant;
import java.util.*;
import com.sun.net.httpserver.HttpServer;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.*;

class JwtVerificationTest {
    String sign(RSAKey key, String issuer, String audience, String subject, Date expiry) throws Exception {
        var claims = new JWTClaimsSet.Builder().issuer(issuer).audience(audience).subject(subject);
        if (expiry != null) claims.expirationTime(expiry);
        var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-key").build(), claims.build());
        jwt.sign(new RSASSASigner(key));
        return jwt.serialize();
    }
    @Test void verifiesRealSignaturesIssuerAudienceExpiryAndSubject() throws Exception {
        RSAKey key = new RSAKeyGenerator(2048).keyID("test-key").generate();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        String issuer = "http://127.0.0.1:" + server.getAddress().getPort() + "/auth/v1";
        server.createContext("/auth/v1/.well-known/jwks.json", exchange -> {
            byte[] json = new JWKSet(key.toPublicJWK()).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type","application/json");
            exchange.sendResponseHeaders(200,json.length); exchange.getResponseBody().write(json); exchange.close();
        });
        server.start();
        try {
            JwtDecoder decoder = new SecurityConfig().jwtDecoder(issuer,"authenticated");
            String sub = UUID.randomUUID().toString();
            Date future = Date.from(Instant.now().plusSeconds(900));
            assertEquals(sub,decoder.decode(sign(key,issuer,"authenticated",sub,future)).getSubject());
            assertThrows(JwtException.class, () -> decoder.decode(sign(key,"https://wrong.example","authenticated",sub,future)));
            assertThrows(JwtException.class, () -> decoder.decode(sign(key,issuer,"wrong",sub,future)));
            assertThrows(JwtException.class, () -> decoder.decode(sign(key,issuer,"authenticated","not-uuid",future)));
            assertThrows(JwtException.class, () -> decoder.decode(sign(key,issuer,"authenticated",sub,null)));
            assertThrows(JwtException.class, () -> decoder.decode(sign(key,issuer,"authenticated",sub,Date.from(Instant.now().minusSeconds(120)))));
            RSAKey attacker = new RSAKeyGenerator(2048).keyID("test-key").generate();
            assertThrows(JwtException.class, () -> decoder.decode(sign(attacker,issuer,"authenticated",sub,future)));
        } finally { server.stop(0); }
    }
}
