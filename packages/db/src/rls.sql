-- SIGNAL tenant isolation via Row-Level Security.
--
-- Two DB roles:
--   * `signal`      — table owner, used for migrations + the ingestion/system
--                     path (resolves org from the project key, writes with
--                     explicit organization_id). Owner bypasses RLS.
--   * `signal_app`  — least-privilege role for authenticated dashboard/API
--                     reads. Subject to RLS: every tenant-scoped transaction
--                     sets  SELECT set_config('app.org_id', '<uuid>', true)
--                     from the verified session — never from client input.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'signal_app') THEN
    CREATE ROLE signal_app LOGIN PASSWORD 'signal_app_dev_password';
  END IF;
END $$;

GRANT CONNECT ON DATABASE signal TO signal_app;
GRANT USAGE ON SCHEMA public TO signal_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO signal_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO signal_app;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      AND tablename IN (
        'organization_members','projects','project_domains','project_keys',
        'event_definitions','saved_reports','admin_audit_logs',
        'visitors','sessions','events','page_views','attributions',
        'consent_records','daily_aggregates'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', r.tablename);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = current_setting(''app.org_id'', true)::uuid)',
      r.tablename
    );
  END LOOP;

  EXECUTE 'ALTER TABLE organizations ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS tenant_isolation ON organizations';
  EXECUTE 'CREATE POLICY tenant_isolation ON organizations USING (id = current_setting(''app.org_id'', true)::uuid)';

  -- users/auth/password tables are NOT tenant-scoped: auth precedes org context.
  -- geo_locations is shared reference data, readable by all tenants.
END $$;
