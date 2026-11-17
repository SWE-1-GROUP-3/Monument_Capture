package com.monumentcapture;

import static org.junit.jupiter.api.Assertions.*;
import java.sql.*;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "RUN_DATABASE_TESTS", matches = "true")
@Transactional
class SchemaIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired javax.sql.DataSource dataSource;
    private UUID user, otherUser, monument, upload;
    @BeforeEach void fixture() {
        user = UUID.randomUUID(); otherUser = UUID.randomUUID();
        monument = jdbc.queryForObject("SELECT id FROM app.monuments WHERE name = 'Washington Square Arch'", UUID.class);
        for (UUID id : new UUID[]{user,otherUser}) jdbc.update("INSERT INTO app.users(id,auth_subject_id,email,display_name,role) VALUES (?,?,?,'Test','player')",id,UUID.randomUUID(),id+"@example.com");
        upload = upload(user);
    }
    UUID upload(UUID owner) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO app.photo_uploads(id,player_id,monument_id,object_key,content_type,expected_size_bytes,grant_expires_at,cleanup_after) VALUES (?,?,?,?,'image/jpeg',100,clock_timestamp()+interval '2 hours',clock_timestamp()+interval '24 hours')",id,owner,monument,id.toString());
        return id;
    }
    UUID capture(UUID photo, UUID player, UUID key) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
            INSERT INTO app.captures(id,monument_id,player_id,photo_upload_id,submitted_latitude,submitted_longitude,
                accuracy_m,location_recorded_at,request_received_at,reported_distance_m,monument_latitude_at_submission,
                monument_longitude_at_submission,capture_radius_m_at_submission,submission_key,request_fingerprint)
            VALUES (?,?,?,?,40.7312,-73.9971,8,now(),now(),0,40.7312,-73.9971,100,?,repeat('a',64))
            """,id,monument,player,photo,key);
        return id;
    }
    // Savepoints let each expected violation be tested without poisoning the test transaction.
    void rejected(String state, Runnable action) throws Exception {
        Connection connection = org.springframework.jdbc.datasource.DataSourceUtils.getConnection(dataSource);
        Savepoint savepoint = connection.setSavepoint();
        try {
            var failure = assertThrows(org.springframework.dao.DataIntegrityViolationException.class, action::run);
            assertEquals(state, ((SQLException)failure.getMostSpecificCause()).getSQLState());
        } finally { connection.rollback(savepoint); connection.releaseSavepoint(savepoint); }
    }
    @Test void seedsRepositoryCoordinatesAndPostgisWorks() {
        assertEquals(15,jdbc.queryForObject("SELECT count(*) FROM app.monuments",Integer.class));
        assertEquals(40.7312,jdbc.queryForObject("SELECT latitude FROM app.monuments WHERE id = ?",Double.class,monument));
        assertEquals(0.0,jdbc.queryForObject("SELECT ST_Distance(ST_SetSRID(ST_MakePoint(-73.9971,40.7312),4326)::geography,ST_SetSRID(ST_MakePoint(-73.9971,40.7312),4326)::geography)",Double.class));
    }
    @Test void enforcesPendingUniquenessAndRetryKeys() throws Exception {
        UUID key = UUID.randomUUID();
        UUID first = capture(upload,user,key);
        UUID nextUpload = upload(user);
        rejected("23505", () -> capture(nextUpload,user,UUID.randomUUID()));
        jdbc.update("UPDATE app.captures SET status='rejected' WHERE id=?",first);
        rejected("23505", () -> capture(nextUpload,user,key));
        capture(nextUpload,user,UUID.randomUUID());
    }
    @Test void preventsCrossPlayerPhotoReuseAndInvalidLocations() throws Exception {
        rejected("23503", () -> capture(upload,otherUser,UUID.randomUUID()));
        UUID id = capture(upload,user,UUID.randomUUID());
        rejected("23514", () -> jdbc.update("UPDATE app.captures SET accuracy_m=51 WHERE id=?",id));
        rejected("23514", () -> jdbc.update("UPDATE app.captures SET submitted_latitude='NaN'::float8 WHERE id=?",id));
        rejected("23514", () -> jdbc.update("UPDATE app.captures SET reported_distance_m=101 WHERE id=?",id));
        rejected("23514", () -> jdbc.update("UPDATE app.captures SET location_recorded_at=request_received_at-interval '31 seconds' WHERE id=?",id));
        rejected("23514", () -> jdbc.update("UPDATE app.captures SET status='in_progress' WHERE id=?",id));
    }
    @Test void enforcesSystemReviewAttributionAndOneHourHolds() throws Exception {
        UUID winner = capture(upload,user,UUID.randomUUID());
        UUID loser = capture(upload(otherUser),otherUser,UUID.randomUUID());
        rejected("23514", () -> jdbc.update("INSERT INTO app.capture_reviews(id,capture_id,decision,decision_source,reason,reviewed_at,lock_expires_at) VALUES (?,?,'approved','moderator',null,now(),now()+interval '1 hour')",UUID.randomUUID(),winner));
        rejected("23514", () -> jdbc.update("INSERT INTO app.capture_reviews(id,capture_id,decision,decision_source,moderator_id,reviewed_at,lock_expires_at) VALUES (?,?,'approved','moderator',?,now(),now()+interval '2 hours')",UUID.randomUUID(),winner,user));
        rejected("23514", () -> jdbc.update("INSERT INTO app.capture_reviews(id,capture_id,decision,decision_source,reason) VALUES (?,?,'rejected','system','Another capture won')",UUID.randomUUID(),loser));
        jdbc.update("INSERT INTO app.capture_reviews(id,capture_id,decision,decision_source,reason,caused_by_capture_id) VALUES (?,?,'rejected','system','Another capture won',?)",UUID.randomUUID(),loser,winner);
    }
    @Test void applicationCannotReadMigrationHistoryOrCreateTables() throws Exception {
        assertFalse(jdbc.queryForObject("SELECT has_schema_privilege(current_user,'flyway','USAGE')",Boolean.class));
        assertFalse(jdbc.queryForObject("SELECT has_schema_privilege(current_user,'app','CREATE')",Boolean.class));
    }
    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void concurrentDuplicatesCommitExactlyOnePendingCapture() throws Exception {
        UUID firstUpload = upload;
        UUID secondUpload = upload(user);
        var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        var start = new java.util.concurrent.CountDownLatch(1);
        try {
            java.util.concurrent.Callable<Boolean> first = () -> insertConcurrent(start, firstUpload);
            java.util.concurrent.Callable<Boolean> second = () -> insertConcurrent(start, secondUpload);
            var a = executor.submit(first); var b = executor.submit(second); start.countDown();
            int accepted = (a.get(10,java.util.concurrent.TimeUnit.SECONDS) ? 1 : 0)
                    + (b.get(10,java.util.concurrent.TimeUnit.SECONDS) ? 1 : 0);
            assertEquals(1,accepted);
            assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM app.captures WHERE player_id=? AND monument_id=? AND status='pending'",Integer.class,user,monument));
        } finally {
            executor.shutdownNow();
            executor.awaitTermination(10,java.util.concurrent.TimeUnit.SECONDS);
            jdbc.update("DELETE FROM app.captures WHERE player_id=?",user);
            jdbc.update("DELETE FROM app.photo_uploads WHERE player_id IN (?,?)",user,otherUser);
            jdbc.update("DELETE FROM app.users WHERE id IN (?,?)",user,otherUser);
        }
    }
    boolean insertConcurrent(java.util.concurrent.CountDownLatch start, UUID photo) throws Exception {
        start.await();
        try { capture(photo,user,UUID.randomUUID()); return true; }
        catch (org.springframework.dao.DuplicateKeyException expected) { return false; }
    }

}
