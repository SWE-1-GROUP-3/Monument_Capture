package com.monumentcapture.auth;

import java.time.Instant;
import java.util.UUID;

public record ApplicationUser(UUID id, String displayName, String email, String role, Instant createdAt) {}
