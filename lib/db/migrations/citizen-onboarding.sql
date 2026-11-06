-- Additive tables must already exist. All original incident protections remain.
LOCK TABLE citizen_cases, citizen_case_events IN SHARE ROW EXCLUSIVE MODE;

CREATE OR REPLACE FUNCTION santi_prepare_citizen_case() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_name text;
BEGIN
  SELECT username INTO owner_name FROM global_command_users WHERE id=NEW.owner_id;
  NEW.created_at := date_trunc('milliseconds', clock_timestamp());
  NEW.original := NEW.original || jsonb_build_object(
    'id', NEW.id, 'ownerId', NEW.owner_id, 'ownerUsername', owner_name,
    'createdAt', to_char(NEW.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  NEW.original_canonical := NEW.original::text;
  NEW.original_hash := encode(sha256(convert_to(NEW.original_canonical, 'UTF8')), 'hex');
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION santi_prepare_citizen_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('citizen:' || NEW.case_id::text, 0));
  SELECT hash INTO previous FROM citizen_case_events WHERE case_id=NEW.case_id ORDER BY id DESC LIMIT 1;
  IF previous IS NULL THEN
    SELECT original_hash INTO previous FROM citizen_cases WHERE id=NEW.case_id;
  END IF;
  IF previous IS NULL THEN RAISE EXCEPTION 'Missing original citizen case'; END IF;
  NEW.previous_hash := previous;
  NEW.created_at := date_trunc('milliseconds', clock_timestamp());
  NEW.canonical := jsonb_build_object(
    'version', 1, 'id', NEW.id, 'caseId', NEW.case_id, 'kind', NEW.kind,
    'payload', NEW.payload, 'actorId', NEW.actor_id, 'previousHash', NEW.previous_hash,
    'createdAt', to_char(NEW.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )::text;
  NEW.hash := encode(sha256(convert_to(NEW.canonical, 'UTF8')), 'hex');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS santi_citizen_prepare ON citizen_cases;
CREATE TRIGGER santi_citizen_prepare BEFORE INSERT ON citizen_cases
  FOR EACH ROW EXECUTE FUNCTION santi_prepare_citizen_case();
DROP TRIGGER IF EXISTS santi_citizen_prepare ON citizen_case_events;
CREATE TRIGGER santi_citizen_prepare BEFORE INSERT ON citizen_case_events
  FOR EACH ROW EXECUTE FUNCTION santi_prepare_citizen_event();
DROP TRIGGER IF EXISTS santi_no_mutation ON citizen_cases;
CREATE TRIGGER santi_no_mutation BEFORE UPDATE OR DELETE ON citizen_cases
  FOR EACH ROW EXECUTE FUNCTION santi_forbid_mutation();
DROP TRIGGER IF EXISTS santi_no_truncate ON citizen_cases;
CREATE TRIGGER santi_no_truncate BEFORE TRUNCATE ON citizen_cases
  FOR EACH STATEMENT EXECUTE FUNCTION santi_forbid_mutation();
DROP TRIGGER IF EXISTS santi_no_mutation ON citizen_case_events;
CREATE TRIGGER santi_no_mutation BEFORE UPDATE OR DELETE ON citizen_case_events
  FOR EACH ROW EXECUTE FUNCTION santi_forbid_mutation();
DROP TRIGGER IF EXISTS santi_no_truncate ON citizen_case_events;
CREATE TRIGGER santi_no_truncate BEFORE TRUNCATE ON citizen_case_events
  FOR EACH STATEMENT EXECUTE FUNCTION santi_forbid_mutation();
