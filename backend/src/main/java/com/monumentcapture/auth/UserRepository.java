package com.monumentcapture.auth;

import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {
    private final JdbcTemplate jdbc;

    public UserRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<ApplicationUser> findBySubject(UUID subject) {
        return jdbc.query("SELECT id, display_name, email, role, created_at FROM app.users WHERE auth_subject_id = ?",
                (rs, row) -> new ApplicationUser(rs.getObject("id", UUID.class), rs.getString("display_name"),
                        rs.getString("email"), rs.getString("role"), rs.getTimestamp("created_at").toInstant()), subject)
                .stream().findFirst();
    }
}
