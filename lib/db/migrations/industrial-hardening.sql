-- RAISE LOG is external to transaction rollback. A table INSERT inside a failing
-- trigger would be rolled back too; NEVER describe it as a durable audit record.
CREATE OR REPLACE FUNCTION santi_forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target text;
BEGIN
  IF TG_OP <> 'TRUNCATE' THEN target := to_jsonb(OLD)->>'id'; END IF;
  RAISE LOG 'SANTI_MUTATION_REJECTED table=% operation=% target=% db_role=% request_id=% actor_id=%',
    TG_TABLE_NAME, TG_OP, COALESCE(target,'ALL'), current_user,
    COALESCE(current_setting('santi.request_id', true),'unattributed'),
    COALESCE(current_setting('santi.actor_id', true),'unattributed');
  RAISE EXCEPTION 'SANTI_APPEND_ONLY: original records cannot be updated, deleted or truncated; use an amendment'
    USING ERRCODE = '55000';
END;
$$;
DROP TRIGGER IF EXISTS santi_no_mutation ON incident_mutation_attempts;
CREATE TRIGGER santi_no_mutation BEFORE UPDATE OR DELETE ON incident_mutation_attempts
  FOR EACH ROW EXECUTE FUNCTION santi_forbid_mutation();
DROP TRIGGER IF EXISTS santi_no_truncate ON incident_mutation_attempts;
CREATE TRIGGER santi_no_truncate BEFORE TRUNCATE ON incident_mutation_attempts
  FOR EACH STATEMENT EXECUTE FUNCTION santi_forbid_mutation();
