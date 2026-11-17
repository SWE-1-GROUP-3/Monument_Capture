package com.monumentcapture;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {"spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration"})
class MonumentCaptureApplicationTests {
    @org.springframework.test.context.bean.override.mockito.MockitoBean
    org.springframework.jdbc.core.JdbcTemplate jdbc;

    @Test
    void contextLoads() {
    }
}
