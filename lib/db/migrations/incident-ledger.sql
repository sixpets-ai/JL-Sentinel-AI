-- Run ONLY after the additive Drizzle schema push, within one DB transaction.
-- Canonical format v1: PostgreSQL jsonb::text UTF-8, SHA-256 lowercase hex.
-- Protect committed records, not database ownership, DDL, backups or host access.
LOCK TABLE incident_reports, tactical_demo_alerts, incident_ledger IN SHARE ROW EXCLUSIVE MODE;

CREATE OR REPLACE FUNCTION santi_forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'SANTI_APPEND_ONLY: use an amendment; original records cannot be updated, deleted or truncated'
    USING ERRCODE = '55000';
END;
$$;

CREATE OR REPLACE FUNCTION santi_prepare_ledger_entry() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE last_entry incident_ledger%ROWTYPE; envelope jsonb; base_payload jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.stream, 0));
  SELECT * INTO last_entry FROM incident_ledger WHERE stream = NEW.stream ORDER BY sequence DESC LIMIT 1;
  NEW.sequence := COALESCE(last_entry.sequence, 0) + 1;
  IF NEW.sequence = 1 AND NEW.event_type <> 'recorded' THEN
    RAISE EXCEPTION 'SANTI_LEDGER: first entry must seal the original';
  END IF;
  IF NEW.sequence > 1 AND NEW.event_type = 'recorded' THEN
    RAISE EXCEPTION 'SANTI_LEDGER: original already sealed';
  END IF;
  IF NEW.event_type IN ('route', 'report') THEN
    SELECT data->'original'->'payload' INTO base_payload
      FROM incident_ledger WHERE stream=NEW.stream AND sequence=1;
    IF base_payload IS NULL OR
      (NEW.data->'snapshot') - ARRAY['report','reportStatus','route','routeStatus'] IS DISTINCT FROM
      base_payload - ARRAY['report','reportStatus','route','routeStatus'] THEN
      RAISE EXCEPTION 'SANTI_IMMUTABLE_IDENTITY: report/route cannot replace folio or incident facts';
    END IF;
  END IF;
  NEW.previous_hash := COALESCE(last_entry.hash, repeat('0', 64));
  NEW.created_at := date_trunc('milliseconds', clock_timestamp());
  NEW.data_canonical := NEW.data::text;
  NEW.payload_hash := encode(sha256(convert_to(NEW.data_canonical, 'UTF8')), 'hex');
  envelope := jsonb_build_object(
    'version', 1, 'stream', NEW.stream, 'sequence', NEW.sequence,
    'eventType', NEW.event_type, 'data', NEW.data, 'actorId', NEW.actor_id, 'actor', NEW.actor,
    'createdAt', to_char(NEW.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'previousHash', NEW.previous_hash, 'payloadHash', NEW.payload_hash
  );
  NEW.canonical := envelope::text;
  NEW.hash := encode(sha256(convert_to(NEW.canonical, 'UTF8')), 'hex');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS santi_ledger_prepare ON incident_ledger;
CREATE TRIGGER santi_ledger_prepare BEFORE INSERT ON incident_ledger
  FOR EACH ROW EXECUTE FUNCTION santi_prepare_ledger_entry();

CREATE OR REPLACE FUNCTION santi_seal_incident() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE stream_id text; author_id integer; author_label text;
BEGIN
  stream_id := CASE WHEN TG_TABLE_NAME = 'incident_reports' THEN 'nexus:' ELSE 'tactical:' END || NEW.id::text;
  IF TG_TABLE_NAME = 'tactical_demo_alerts' THEN
    author_id := (to_jsonb(NEW)->>'user_id')::integer;
    SELECT username || ' · ' || role INTO author_label FROM global_command_users WHERE id=author_id;
  ELSE
    author_label := (to_jsonb(NEW)->>'agente') || ' · autoría declarada, no identidad verificada';
  END IF;
  INSERT INTO incident_ledger(stream, event_type, data, actor_id, actor)
    VALUES (stream_id, 'recorded', jsonb_build_object('original', to_jsonb(NEW), 'imported', false),
      author_id, COALESCE(author_label, 'Registro original · autoría según expediente'));
  RETURN NEW;
END;
$$;

-- Incorporation seals EXISTING current bytes; it does not certify their past.
INSERT INTO incident_ledger(stream, event_type, data, actor)
  SELECT 'nexus:' || r.id::text, 'recorded',
    jsonb_build_object('original', to_jsonb(r), 'imported', true),
    'Sello de incorporación histórica · sin certificación retroactiva'
  FROM incident_reports r
  WHERE NOT EXISTS (SELECT 1 FROM incident_ledger l WHERE l.stream = 'nexus:' || r.id::text);
INSERT INTO incident_ledger(stream, event_type, data, actor)
  SELECT 'tactical:' || r.id, 'recorded',
    jsonb_build_object('original', to_jsonb(r), 'imported', true),
    'Sello de incorporación histórica · sin certificación retroactiva'
  FROM tactical_demo_alerts r
  WHERE NOT EXISTS (SELECT 1 FROM incident_ledger l WHERE l.stream = 'tactical:' || r.id);

DROP TRIGGER IF EXISTS santi_original_seal ON incident_reports;
CREATE TRIGGER santi_original_seal AFTER INSERT ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION santi_seal_incident();
DROP TRIGGER IF EXISTS santi_original_seal ON tactical_demo_alerts;
CREATE TRIGGER santi_original_seal AFTER INSERT ON tactical_demo_alerts
  FOR EACH ROW EXECUTE FUNCTION santi_seal_incident();

DROP TRIGGER IF EXISTS santi_no_mutation ON incident_reports;
CREATE TRIGGER santi_no_mutation BEFORE UPDATE OR DELETE ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION santi_forbid_mutation();
DROP TRIGGER IF EXISTS santi_no_truncate ON incident_reports;
CREATE TRIGGER santi_no_truncate BEFORE TRUNCATE ON incident_reports
  FOR EACH STATEMENT EXECUTE FUNCTION santi_forbid_mutation();
DROP TRIGGER IF EXISTS santi_no_mutation ON tactical_demo_alerts;
CREATE TRIGGER santi_no_mutation BEFORE UPDATE OR DELETE ON tactical_demo_alerts
  FOR EACH ROW EXECUTE FUNCTION santi_forbid_mutation();
DROP TRIGGER IF EXISTS santi_no_truncate ON tactical_demo_alerts;
CREATE TRIGGER santi_no_truncate BEFORE TRUNCATE ON tactical_demo_alerts
  FOR EACH STATEMENT EXECUTE FUNCTION santi_forbid_mutation();
DROP TRIGGER IF EXISTS santi_no_mutation ON incident_ledger;
CREATE TRIGGER santi_no_mutation BEFORE UPDATE OR DELETE ON incident_ledger
  FOR EACH ROW EXECUTE FUNCTION santi_forbid_mutation();
DROP TRIGGER IF EXISTS santi_no_truncate ON incident_ledger;
CREATE TRIGGER santi_no_truncate BEFORE TRUNCATE ON incident_ledger
  FOR EACH STATEMENT EXECUTE FUNCTION santi_forbid_mutation();
