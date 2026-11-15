CREATE SCHEMA IF NOT EXISTS "auth";
CREATE TYPE "public"."maintenance_type_enum" AS ENUM ('preventive', 'corrective');
CREATE TYPE "public"."maintenance_status_enum" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "auth"."user" (
  "id" text PRIMARY KEY, "name" text NOT NULL, "email" text NOT NULL UNIQUE,
  "email_verified" boolean DEFAULT false NOT NULL, "image" text,
  "role" text DEFAULT 'resident' NOT NULL CHECK (role IN ('admin','resident')),
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE "auth"."session" (
  "id" text PRIMARY KEY, "expires_at" timestamptz NOT NULL, "token" text NOT NULL UNIQUE,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL,
  "ip_address" text, "user_agent" text, "user_id" text NOT NULL REFERENCES "auth"."user"("id") ON DELETE CASCADE
);
CREATE INDEX "session_user_id_idx" ON "auth"."session" ("user_id");
CREATE TABLE "auth"."account" (
  "id" text PRIMARY KEY, "account_id" text NOT NULL, "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "auth"."user"("id") ON DELETE CASCADE,
  "access_token" text, "refresh_token" text, "id_token" text,
  "access_token_expires_at" timestamptz, "refresh_token_expires_at" timestamptz, "scope" text, "password" text,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "account_user_id_idx" ON "auth"."account" ("user_id");
CREATE TABLE "auth"."verification" (
  "id" text PRIMARY KEY, "identifier" text NOT NULL, "value" text NOT NULL, "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now(), "updated_at" timestamptz DEFAULT now()
);
CREATE INDEX "verification_identifier_idx" ON "auth"."verification" ("identifier");

CREATE TABLE "machine_types" ("type_code" text PRIMARY KEY, "name" text NOT NULL, "description" text, "created_at" timestamptz DEFAULT now());
CREATE TABLE "machinery" (
  "machinery_id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "external_code" text NOT NULL,
  "machinery_full_name" text NOT NULL, "machinery_name" text, "machinery_model" text, "machinery_serial_code" text,
  "observations" text, "is_rented" boolean DEFAULT false, "machine_type" text DEFAULT 'machine' REFERENCES "machine_types"("type_code"),
  "expected_consumption_rate" numeric(10,2), "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "unique_external_code" UNIQUE ("external_code"),
  CONSTRAINT "unique_machine_identity" UNIQUE ("machinery_name","machinery_model","machinery_serial_code")
);
CREATE TABLE "projects" (
  "project_id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "project_name" text NOT NULL,
  "created_at" timestamptz DEFAULT now(), CONSTRAINT "unique_project_name" UNIQUE ("project_name")
);
CREATE TABLE "machinery_logs" (
  "machinery_log_id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "machine_id" bigint NOT NULL REFERENCES "machinery"("machinery_id"), "project_id" bigint NOT NULL REFERENCES "projects"("project_id"),
  "date" date DEFAULT current_date NOT NULL, "operator_name" text NOT NULL, "start_time" time, "end_time" time,
  "fuel_liters" numeric(10,2) NOT NULL, "fuel_price" numeric(10,2), "effective_hours" numeric(10,2), "observations" text,
  "is_completed" boolean DEFAULT false NOT NULL, "is_corrected" boolean DEFAULT false NOT NULL, "hash_id" text NOT NULL UNIQUE,
  "status" text DEFAULT 'started' NOT NULL CHECK (status IN ('started','paused','completed')),
  "pause_events" jsonb DEFAULT '[]'::jsonb NOT NULL, "total_paused_minutes" integer DEFAULT 0 NOT NULL,
  "auto_closed" boolean DEFAULT false NOT NULL, "created_at" timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX "unique_active_shift_per_machine" ON "machinery_logs" ("machine_id") WHERE "is_completed" = false;
CREATE TABLE "maintenance_requests" (
  "maintenance_request_id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "machine_id" bigint NOT NULL REFERENCES "machinery"("machinery_id"), "project_id" bigint REFERENCES "projects"("project_id"),
  "maintenance_type" maintenance_type_enum NOT NULL, "type" maintenance_type_enum NOT NULL, "date" date DEFAULT current_date NOT NULL,
  "last_maintenance_date" date, "next_maintenance_date" date, "description" text NOT NULL, "spare_parts" jsonb DEFAULT '[]'::jsonb,
  "status" maintenance_status_enum DEFAULT 'pending' NOT NULL, "is_external" boolean DEFAULT false,
  "cost" numeric(12,2) DEFAULT 0, "worked_time" numeric(10,2) DEFAULT 0, "downtime" numeric(10,2) DEFAULT 0,
  "observations" text, "hash_id" text NOT NULL UNIQUE, "approval_token_hash" text,
  "approval_token_expires_at" timestamptz, "created_at" timestamptz DEFAULT now(), "updated_at" timestamptz DEFAULT now()
);
CREATE INDEX "idx_maintenance_requests_hash_id" ON "maintenance_requests" ("hash_id");
CREATE TABLE "machinery_depreciation" (
  "machinery_id" bigint PRIMARY KEY REFERENCES "machinery"("machinery_id") ON DELETE CASCADE,
  "optimal_fuel_consumption" numeric(10,2), "service_life" integer, "purchase_value" numeric(15,2),
  "rescue_value" numeric(5,4), "estimated_depreciation_rate" numeric(15,2),
  "created_at" timestamptz DEFAULT now(), "updated_at" timestamptz DEFAULT now()
);
CREATE TABLE "profiles" (
  "user_id" text PRIMARY KEY REFERENCES "auth"."user"("id") ON DELETE CASCADE,
  "avatar_file_id" uuid, "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE "files" (
  "file_id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "owner_user_id" text NOT NULL REFERENCES "auth"."user"("id") ON DELETE CASCADE,
  "maintenance_request_id" bigint REFERENCES "maintenance_requests"("maintenance_request_id") ON DELETE CASCADE,
  "purpose" text NOT NULL CHECK (purpose IN ('avatar','maintenance_attachment')),
  "original_filename" text NOT NULL, "mime_type" text NOT NULL, "size_bytes" integer NOT NULL CHECK (size_bytes > 0),
  "content" bytea NOT NULL, "created_at" timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_avatar_file_id_files_file_id_fk" FOREIGN KEY ("avatar_file_id") REFERENCES "files"("file_id") ON DELETE SET NULL;
CREATE INDEX "files_owner_idx" ON "files" ("owner_user_id");
CREATE INDEX "files_maintenance_idx" ON "files" ("maintenance_request_id");
CREATE UNIQUE INDEX "one_avatar_per_user" ON "files" ("owner_user_id") WHERE "purpose" = 'avatar';

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER maintenance_requests_updated_at BEFORE UPDATE ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER machinery_depreciation_updated_at BEFORE UPDATE ON machinery_depreciation FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER auth_user_updated_at BEFORE UPDATE ON auth."user" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO machine_types (type_code, name, description) VALUES
  ('machine','Maquinaria','Equipo pesado medido por consumo'),
  ('truck','Camión','Vehículo medido por turno')
ON CONFLICT (type_code) DO NOTHING;
