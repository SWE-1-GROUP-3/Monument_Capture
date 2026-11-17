# Supabase branch decisions

Confirmed by the user on November 17, 2026. These decisions apply to the local `feat/supabase-mvp` branch, created from `integration/mvp-baseline` at `9bc66b5`.

## Confirmed choices

- Integration branch: `integration/mvp-baseline`, originally based on `non_demo`.
- Workflow: feature branches start from the integration branch; changes return through pull requests once publication is authorized.
- MVP scope and schema/API contract: accepted as documented in [MVP decisions](mvp-decisions.md) and the [backend contract](backend-schema-api-contract.md).
- Database: Supabase-hosted PostgreSQL with PostGIS.
- Photos: Supabase private Storage.
- Authentication: Supabase Auth for pre-created email/password accounts, with bearer access tokens verified by Spring Boot.
- Spring Boot/Java 17 remains responsible for gameplay APIs, role/ownership authorization, GPS validation, capture persistence, approval transactions, and reports.

This records the user's choice for this branch. Teammates' AWS progress and independent approval have not been verified. No remote push, external document edit, or shared-service change is performed by this documentation update.

## Reason for the change

Using one managed platform for database, private photos, and authentication reduces the number of services the team needs to configure for the MVP. Supabase supports the selected PostgreSQL/PostGIS model, email/password accounts, and signed access to private objects. Keeping Spring Boot and SQL migrations preserves the project's backend architecture and transaction rules.

The goal is to spend the remaining sprint implementing and testing capture/moderation behavior. Free-plan quotas, project availability, and account limits still need checking before shared use and the presentation; this decision does not promise unlimited free hosting.

Provider references: [PostGIS](https://supabase.com/docs/guides/database/extensions/postgis), [password authentication](https://supabase.com/docs/guides/auth/passwords), [private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals), and [pricing](https://supabase.com/pricing).

## Implementation boundaries

### Database

Use versioned Flyway migrations and a restricted application database identity. Keep migration/admin credentials separate. Store gameplay tables in a dedicated `app` schema, outside the exposed Data API schemas; qualify migrations and queries consistently. Do not grant anonymous/authenticated Data API roles direct access to gameplay tables. Browser/native clients use Spring Boot for gameplay data.

Enable PostGIS through authorized setup. Use a TLS PostgreSQL connection: direct where supported by the development network, or Supabase's session pooler for IPv4 environments. Keep connection details in local environment variables. Test migrations on a disposable PostgreSQL/PostGIS database before applying them to shared services. [Connection options](https://supabase.com/docs/guides/database/connecting-to-postgres)

### Authentication

Use the official frontend SDK for login, refresh, and current-session logout. Spring Boot validates access JWTs against the selected project's asymmetric signing keys and maps verified subjects to provisioned application users. Application roles remain in the database. The backend contract defines identity mapping, errors, and logout expiry limitations. Public signup stays disabled; account provisioning is trusted administrative work.

### Private photo storage

Create a private bucket with JPEG/PNG/WebP restrictions and a 10 MiB limit. The backend issues grants only after checking player identity, monument access, and upload metadata. Use unique server-generated object paths and disable overwrite/upsert. Do not grant clients general list/read/update/delete rights. Keep the storage secret key on the backend; the frontend receives only its publishable key and scoped upload grants.

Return the actual signed upload expiry (currently two hours) and required upload method/headers. Before capture acceptance, inspect actual bytes, decodability, size, ownership binding, and lifecycle state. Verify that a still-valid grant cannot overwrite accepted evidence. Issue short-lived read URLs only to the capture owner or moderators after backend authorization. Apply the contract's cleanup rules to abandoned uploads. [Signed uploads](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)

## Remaining work

- Create or obtain authorized access to the shared Supabase project and private bucket; configure credentials locally without committing secrets.
- Implement and validate step 4A migrations, including `users.auth_subject_id`, constraints, and real monument seeds.
- Implement step 4B authentication/authorization and provision test accounts.
- Implement step 4C account-isolated frontend drafts.
- Complete step 4D local configuration and verify teammate connectivity.
- Assign owners, coordinate with teammates about any existing AWS work, and synchronize external requirements/design documents.

These are implementation and coordination tasks. Recording a provider choice does not mark them complete.

## Returning to the baseline

Keep the Supabase changes committed on this branch before switching. With a clean working tree:

```bash
git switch integration/mvp-baseline
```

To resume the Supabase version:

```bash
git switch feat/supabase-mvp
```

The baseline retains the earlier provider-neutral contract with AWS as the original hosting plan; it is not an implemented AWS backend. Switching branches only changes local repository files. It does not undo future cloud resources or database changes. No merge, push, resource provisioning, or destructive reset is needed to return to the baseline.
