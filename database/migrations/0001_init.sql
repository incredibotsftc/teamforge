-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

SET search_path = public, extensions, pg_catalog;

--
-- Name: event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."event_type" AS ENUM (
    'meeting',
    'competition',
    'outreach',
    'workshop',
    'social',
    'review',
    'practice',
    'fundraising',
    'training',
    'scrimmage',
    'other'
);


--
-- Name: expense_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."expense_category" AS ENUM (
    'food',
    'events',
    'materials',
    'tools',
    'travel',
    'apparel',
    'marketing',
    'other'
);


--
-- Name: TYPE "expense_category"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE "public"."expense_category" IS 'Enum type for expense categories: food, events, materials, tools, travel, apparel, marketing, other';


--
-- Name: fundraising_source_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."fundraising_source_type" AS ENUM (
    'corporate_sponsor',
    'grant',
    'individual_donation',
    'fundraiser_event',
    'crowdfunding',
    'merchandise_sales',
    'parent_organization',
    'other'
);


--
-- Name: fundraising_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."fundraising_status" AS ENUM (
    'prospecting',
    'pending',
    'committed',
    'received',
    'declined',
    'cancelled'
);


--
-- Name: task_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."task_category" AS ENUM (
    'outreach',
    'mentoring',
    'fundraising',
    'robot_building',
    'programming',
    'documentation'
);


--
-- Name: task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."task_status" AS ENUM (
    'todo',
    'in_progress',
    'done'
);


--
-- Name: team_member_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."team_member_role" AS ENUM (
    'admin',
    'mentor',
    'student',
    'parent'
);


--
-- Name: generate_invite_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."generate_invite_code"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
      code TEXT;
      exists BOOLEAN;
  BEGIN
      LOOP
          code := upper(substr(encode(gen_random_bytes(9), 'base64'), 1, 12));
          code := translate(code, '0O1Il+/', '23456789');
          SELECT EXISTS(SELECT 1 FROM team_invites WHERE invite_code = code) INTO exists;
          IF NOT exists THEN
              RETURN code;
          END IF;
      END LOOP;
  END;
  $$;


--
-- Name: get_team_events_for_date_range("uuid", "date", "date"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_team_events_for_date_range"("p_team_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("id" "uuid", "title" "text", "event_type" "public"."event_type", "start_date" "date", "start_time" time without time zone, "end_time" time without time zone, "location" "text", "needs_signup" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.event_type,
        e.start_date,
        e.start_time,
        e.end_time,
        e.location,
        e.needs_signup
    FROM events e
    WHERE e.team_id = p_team_id
        AND e.start_date >= p_start_date
        AND e.start_date <= p_end_date
    ORDER BY e.start_date, e.start_time;
END;
$$;


--
-- Name: get_team_expenses("uuid", "date", "date"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_team_expenses"("team_id" "uuid", "start_date" "date" DEFAULT NULL::"date", "end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("total_amount" numeric, "category" "text", "expense_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(amount) as total_amount,
        category,
        COUNT(*) as expense_count
    FROM expenses e
    WHERE e.team_id = get_team_expenses.team_id
    AND (start_date IS NULL OR e.date >= start_date)
    AND (end_date IS NULL OR e.date <= end_date)
    GROUP BY category;
END;
$$;


--
-- Name: get_upcoming_team_events("uuid", integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_upcoming_team_events"("p_team_id" "uuid", "p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "title" "text", "event_type" "public"."event_type", "start_date" "date", "start_time" time without time zone, "end_time" time without time zone, "location" "text", "description" "text", "needs_signup" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.event_type,
        e.start_date,
        e.start_time,
        e.end_time,
        e.location,
        e.description,
        e.needs_signup
    FROM events e
    WHERE e.team_id = p_team_id
        AND e.start_date >= CURRENT_DATE
    ORDER BY e.start_date, e.start_time
    LIMIT p_limit;
END;
$$;


--
-- Name: has_teams(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."has_teams"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM teams LIMIT 1);
END;
$$;


--
-- Name: update_mentoring_teams_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_mentoring_teams_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_notebook_folder_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_notebook_folder_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_notebook_page_content_text(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_notebook_page_content_text"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Extract text content from JSONB for search
    NEW.content_text = COALESCE(NEW.title, '') || ' ' ||
                      COALESCE(regexp_replace(NEW.content::text, '<[^>]*>', '', 'g'), '');
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_team_invites_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_team_invites_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $$;


--
-- Name: update_team_notes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."update_team_notes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: event_attendees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."event_attendees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "team_member_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "response_date" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_attendees_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'attending'::"text", 'not_attending'::"text", 'maybe'::"text"])))
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "event_type" "public"."event_type" DEFAULT 'meeting'::"public"."event_type" NOT NULL,
    "start_date" "date" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "location" "text",
    "needs_signup" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_recurring" boolean DEFAULT false,
    "recurrence_type" "text",
    "recurrence_interval" integer DEFAULT 1,
    "recurrence_days_of_week" integer[],
    "recurrence_end_date" "date",
    "recurrence_count" integer,
    "parent_event_id" "uuid",
    CONSTRAINT "events_recurrence_type_check" CHECK (("recurrence_type" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "events_recurring_end_check" CHECK (
CASE
    WHEN ("is_recurring" = true) THEN (("recurrence_end_date" IS NOT NULL) OR ("recurrence_count" IS NOT NULL))
    ELSE true
END),
    CONSTRAINT "events_recurring_interval_check" CHECK (("recurrence_interval" > 0)),
    CONSTRAINT "events_recurring_type_check" CHECK (
CASE
    WHEN ("is_recurring" = true) THEN ("recurrence_type" IS NOT NULL)
    ELSE true
END),
    CONSTRAINT "events_time_check" CHECK (
CASE
    WHEN (("start_time" IS NOT NULL) AND ("end_time" IS NOT NULL)) THEN ("end_time" > "start_time")
    ELSE true
END),
    CONSTRAINT "events_title_check" CHECK (("length"("title") > 0))
);


--
-- Name: COLUMN "events"."is_recurring"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."events"."is_recurring" IS 'Whether this event repeats on a schedule';


--
-- Name: COLUMN "events"."recurrence_type"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."events"."recurrence_type" IS 'Type of recurrence: daily, weekly, monthly, yearly';


--
-- Name: COLUMN "events"."recurrence_interval"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."events"."recurrence_interval" IS 'Interval between occurrences (every X days/weeks/months/years)';


--
-- Name: COLUMN "events"."recurrence_days_of_week"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."events"."recurrence_days_of_week" IS 'For weekly recurrence: array of days [0=Sunday, 1=Monday, etc.]';


--
-- Name: COLUMN "events"."recurrence_end_date"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."events"."recurrence_end_date" IS 'Date when recurrence should stop';


--
-- Name: COLUMN "events"."recurrence_count"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."events"."recurrence_count" IS 'Maximum number of recurring instances';


--
-- Name: COLUMN "events"."parent_event_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."events"."parent_event_id" IS 'References the original recurring event (for instances)';


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "category" "public"."expense_category" NOT NULL,
    "date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "team_id" "uuid",
    "season_id" "uuid" NOT NULL,
    "notes" "text",
    CONSTRAINT "expenses_amount_check" CHECK (("amount" > (0)::numeric))
);


--
-- Name: COLUMN "expenses"."notes"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."expenses"."notes" IS 'Optional notes or additional details about the expense';


--
-- Name: ftc_teams_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."ftc_teams_cache" (
    "team_number" integer NOT NULL,
    "season" integer NOT NULL,
    "name_full" "text" NOT NULL,
    "name_short" "text",
    "school_name" "text",
    "city" "text",
    "state_prov" "text",
    "country" "text",
    "rookie_year" integer,
    "website" "text",
    "robot_name" "text",
    "district_code" "text",
    "home_cmp" "text",
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: TABLE "ftc_teams_cache"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."ftc_teams_cache" IS 'Cache table for FTC team data from the FTC Events API. Primary key (team_number, season) ensures no duplicates. Cleaned up duplicates in migration 0016.';


--
-- Name: fundraising; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."fundraising" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "source_type" "public"."fundraising_source_type" NOT NULL,
    "source_name" "text" NOT NULL,
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "amount_requested" numeric(10,2),
    "amount_committed" numeric(10,2),
    "amount_received" numeric(10,2) DEFAULT 0 NOT NULL,
    "date_contacted" "date",
    "date_committed" "date",
    "date_received" "date",
    "deadline" "date",
    "status" "public"."fundraising_status" NOT NULL,
    "description" "text",
    "notes" "text",
    "recognition_type" "text",
    "recurring" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "fundraising_amount_committed_check" CHECK ((("amount_committed" IS NULL) OR ("amount_committed" >= (0)::numeric))),
    CONSTRAINT "fundraising_amount_received_check" CHECK (("amount_received" >= (0)::numeric)),
    CONSTRAINT "fundraising_amount_requested_check" CHECK ((("amount_requested" IS NULL) OR ("amount_requested" >= (0)::numeric)))
);


--
-- Name: mentoring_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."mentoring_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_date" "date",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "season_id" "uuid" NOT NULL,
    "mentored_team_id" "uuid",
    "mentor_team_id" "uuid" NOT NULL,
    "attendees" "jsonb" DEFAULT '[]'::"jsonb"
);


--
-- Name: TABLE "mentoring_sessions"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."mentoring_sessions" IS 'Mentoring sessions with schedule information. Team names are retrieved via foreign key relationships to mentoring_teams table.';


--
-- Name: COLUMN "mentoring_sessions"."attendees"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."mentoring_sessions"."attendees" IS 'Array of team member IDs who attended this mentoring session';


--
-- Name: mentoring_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."mentoring_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_number" integer,
    "team_name" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "mentor_id" "uuid",
    "school" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "mentoring_since" integer,
    "season_id" "uuid" NOT NULL,
    "mentor_team_id" "uuid" NOT NULL
);


--
-- Name: notebook_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."notebook_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "parent_folder_id" "uuid",
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#6366f1'::"text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL
);


--
-- Name: notebook_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."notebook_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "folder_id" "uuid",
    "title" "text" DEFAULT 'Untitled'::"text" NOT NULL,
    "content" "jsonb",
    "content_path" "text",
    "content_size" bigint DEFAULT 0,
    "content_text" "text",
    "is_pinned" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "linked_entity_type" "text",
    "linked_entity_id" "text",
    CONSTRAINT "notebook_pages_linked_entity_type_check" CHECK (("linked_entity_type" = ANY (ARRAY['mentoring_session'::"text", 'event'::"text", 'task'::"text", 'scouting_team'::"text"])))
);


--
-- Name: COLUMN "notebook_pages"."linked_entity_id"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."notebook_pages"."linked_entity_id" IS 'ID of the linked entity (can be UUID for sessions/events/tasks or text identifier for teams/other entities)';


--
-- Name: seasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "start_year" integer NOT NULL,
    "end_year" integer NOT NULL,
    "is_current_season" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "seasons_name_not_empty" CHECK (("length"("name") > 0)),
    CONSTRAINT "seasons_valid_years" CHECK (("end_year" > "start_year"))
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "status" "public"."task_status" DEFAULT 'todo'::"public"."task_status" NOT NULL,
    "category" "public"."task_category" NOT NULL,
    "assignee_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "due_date" "date",
    "priority" "text",
    "assignee_ids" "uuid"[],
    "created_by" "uuid",
    "season_id" "uuid" NOT NULL
);


--
-- Name: team_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."team_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "storage_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" integer,
    "mime_type" "text",
    "caption" "text",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "session_id" "uuid"
);


--
-- Name: team_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."team_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "invite_code" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "default_role" "text" DEFAULT 'student'::"text" NOT NULL,
    "max_uses" integer,
    "current_uses" integer DEFAULT 0,
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_invites_default_role_check" CHECK (("default_role" = ANY (ARRAY['admin'::"text", 'mentor'::"text", 'student'::"text", 'guest'::"text"])))
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'student'::"text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "grade" integer,
    "subteam" "text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "discord_user_id" "text",
    "discord_username" "text",
    CONSTRAINT "team_members_grade_check" CHECK ((("grade" >= 6) AND ("grade" <= 12))),
    CONSTRAINT "team_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'mentor'::"text", 'student'::"text", 'guest'::"text"])))
);


--
-- Name: team_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."team_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "mentor_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_number" integer NOT NULL,
    "team_name" "text" NOT NULL,
    "school_name" "text",
    "state" "text",
    "country" "text" DEFAULT 'United States'::"text",
    "logo_url" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "teams_team_name_not_empty" CHECK (("length"("team_name") > 0)),
    CONSTRAINT "teams_team_number_positive" CHECK (("team_number" > 0))
);


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "theme" "text" DEFAULT 'system'::"text" NOT NULL,
    "accent_color" "text" DEFAULT '#3b82f6'::"text" NOT NULL,
    "accent_intensity" real DEFAULT 1.0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email_notifications" boolean DEFAULT true,
    "discord_notifications" boolean DEFAULT false,
    "push_notifications" boolean DEFAULT false,
    "event_reminders" boolean DEFAULT true,
    "notebook_mentions" boolean DEFAULT true,
    "weekly_digest" boolean DEFAULT true,
    "push_subscription" "jsonb",
    "display_name" "text",
    "preferred_timezone" "text" DEFAULT 'America/Los_Angeles'::"text",
    "compact_mode" boolean DEFAULT false
);


--
-- Name: event_attendees event_attendees_event_id_team_member_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."event_attendees"
    ADD CONSTRAINT "event_attendees_event_id_team_member_id_key" UNIQUE ("event_id", "team_member_id");


--
-- Name: event_attendees event_attendees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."event_attendees"
    ADD CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("id");


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");


--
-- Name: ftc_teams_cache ftc_teams_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ftc_teams_cache"
    ADD CONSTRAINT "ftc_teams_cache_pkey" PRIMARY KEY ("team_number", "season");


--
-- Name: fundraising fundraising_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."fundraising"
    ADD CONSTRAINT "fundraising_pkey" PRIMARY KEY ("id");


--
-- Name: mentoring_sessions mentoring_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mentoring_sessions"
    ADD CONSTRAINT "mentoring_sessions_pkey" PRIMARY KEY ("id");


--
-- Name: mentoring_teams mentoring_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mentoring_teams"
    ADD CONSTRAINT "mentoring_teams_pkey" PRIMARY KEY ("id");


--
-- Name: notebook_folders notebook_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notebook_folders"
    ADD CONSTRAINT "notebook_folders_pkey" PRIMARY KEY ("id");


--
-- Name: notebook_pages notebook_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notebook_pages"
    ADD CONSTRAINT "notebook_pages_pkey" PRIMARY KEY ("id");


--
-- Name: seasons seasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");


--
-- Name: seasons seasons_single_current; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_single_current" EXCLUDE USING "btree" ("is_current_season" WITH =) WHERE (("is_current_season" = true));


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");


--
-- Name: team_images team_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_images"
    ADD CONSTRAINT "team_images_pkey" PRIMARY KEY ("id");


--
-- Name: team_invites team_invites_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_invite_code_key" UNIQUE ("invite_code");


--
-- Name: team_invites team_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id");


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");


--
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");


--
-- Name: team_notes team_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_notes"
    ADD CONSTRAINT "team_notes_pkey" PRIMARY KEY ("id");


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");


--
-- Name: teams teams_team_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_team_number_key" UNIQUE ("team_number");


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");


--
-- Name: user_settings user_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_key" UNIQUE ("user_id");


--
-- Name: expenses_team_id_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "expenses_team_id_date_idx" ON "public"."expenses" USING "btree" ("team_id", "date");


--
-- Name: idx_events_parent_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_events_parent_event" ON "public"."events" USING "btree" ("parent_event_id") WHERE ("parent_event_id" IS NOT NULL);


--
-- Name: idx_events_recurrence_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_events_recurrence_end_date" ON "public"."events" USING "btree" ("recurrence_end_date") WHERE ("recurrence_end_date" IS NOT NULL);


--
-- Name: idx_events_recurring; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_events_recurring" ON "public"."events" USING "btree" ("is_recurring", "recurrence_type") WHERE ("is_recurring" = true);


--
-- Name: idx_expenses_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_expenses_season_id" ON "public"."expenses" USING "btree" ("season_id");


--
-- Name: idx_expenses_team_season; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_expenses_team_season" ON "public"."expenses" USING "btree" ("team_id", "season_id");


--
-- Name: idx_ftc_teams_cache_name_full_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ftc_teams_cache_name_full_trgm" ON "public"."ftc_teams_cache" USING "gin" ("name_full" "public"."gin_trgm_ops");


--
-- Name: idx_ftc_teams_cache_name_short_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ftc_teams_cache_name_short_trgm" ON "public"."ftc_teams_cache" USING "gin" ("name_short" "public"."gin_trgm_ops");


--
-- Name: idx_ftc_teams_cache_school_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ftc_teams_cache_school_name_trgm" ON "public"."ftc_teams_cache" USING "gin" ("school_name" "public"."gin_trgm_ops");


--
-- Name: idx_ftc_teams_cache_season; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ftc_teams_cache_season" ON "public"."ftc_teams_cache" USING "btree" ("season");


--
-- Name: idx_ftc_teams_cache_team_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_ftc_teams_cache_team_number" ON "public"."ftc_teams_cache" USING "btree" ("team_number");


--
-- Name: idx_mentoring_sessions_mentor_team_season; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_mentoring_sessions_mentor_team_season" ON "public"."mentoring_sessions" USING "btree" ("mentor_team_id", "season_id");


--
-- Name: idx_mentoring_sessions_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_mentoring_sessions_season_id" ON "public"."mentoring_sessions" USING "btree" ("season_id");


--
-- Name: idx_mentoring_teams_mentor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_mentoring_teams_mentor" ON "public"."mentoring_teams" USING "btree" ("mentor_id");


--
-- Name: idx_mentoring_teams_mentor_team_season; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_mentoring_teams_mentor_team_season" ON "public"."mentoring_teams" USING "btree" ("mentor_team_id", "season_id");


--
-- Name: idx_mentoring_teams_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_mentoring_teams_season_id" ON "public"."mentoring_teams" USING "btree" ("season_id");


--
-- Name: idx_notebook_folders_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_notebook_folders_parent" ON "public"."notebook_folders" USING "btree" ("parent_folder_id");


--
-- Name: idx_notebook_folders_team_season; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_notebook_folders_team_season" ON "public"."notebook_folders" USING "btree" ("team_id", "season_id");


--
-- Name: idx_notebook_pages_content_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_notebook_pages_content_path" ON "public"."notebook_pages" USING "btree" ("content_path") WHERE ("content_path" IS NOT NULL);


--
-- Name: idx_notebook_pages_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_notebook_pages_folder" ON "public"."notebook_pages" USING "btree" ("folder_id");


--
-- Name: idx_notebook_pages_linked_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_notebook_pages_linked_entity" ON "public"."notebook_pages" USING "btree" ("linked_entity_type", "linked_entity_id") WHERE (("linked_entity_type" IS NOT NULL) AND ("linked_entity_id" IS NOT NULL));


--
-- Name: idx_notebook_pages_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_notebook_pages_search" ON "public"."notebook_pages" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content_text"));


--
-- Name: idx_notebook_pages_team_linked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_notebook_pages_team_linked" ON "public"."notebook_pages" USING "btree" ("team_id", "linked_entity_type") WHERE ("linked_entity_type" IS NOT NULL);


--
-- Name: idx_notebook_pages_team_season; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_notebook_pages_team_season" ON "public"."notebook_pages" USING "btree" ("team_id", "season_id");


--
-- Name: idx_tasks_season_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tasks_season_id" ON "public"."tasks" USING "btree" ("season_id");


--
-- Name: idx_tasks_team_season; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tasks_team_season" ON "public"."tasks" USING "btree" ("team_id", "season_id");


--
-- Name: idx_team_images_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_team_images_session" ON "public"."team_images" USING "btree" ("session_id");


--
-- Name: idx_team_images_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_team_images_team" ON "public"."team_images" USING "btree" ("team_id");


--
-- Name: idx_team_images_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_team_images_uploaded_by" ON "public"."team_images" USING "btree" ("uploaded_by");


--
-- Name: idx_team_invites_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_team_invites_active" ON "public"."team_invites" USING "btree" ("is_active") WHERE ("is_active" = true);


--
-- Name: idx_team_invites_invite_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_team_invites_invite_code" ON "public"."team_invites" USING "btree" ("invite_code");


--
-- Name: idx_team_invites_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_team_invites_team_id" ON "public"."team_invites" USING "btree" ("team_id");


--
-- Name: idx_team_notes_mentor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_team_notes_mentor" ON "public"."team_notes" USING "btree" ("mentor_id");


--
-- Name: idx_team_notes_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_team_notes_team" ON "public"."team_notes" USING "btree" ("team_id");


--
-- Name: team_members_discord_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "team_members_discord_user_id_idx" ON "public"."team_members" USING "btree" ("discord_user_id");


--
-- Name: mentoring_teams mentoring_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "mentoring_teams_updated_at" BEFORE UPDATE ON "public"."mentoring_teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_mentoring_teams_updated_at"();


--
-- Name: team_notes team_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "team_notes_updated_at" BEFORE UPDATE ON "public"."team_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_team_notes_updated_at"();


--
-- Name: notebook_folders update_notebook_folder_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_notebook_folder_updated_at_trigger" BEFORE UPDATE ON "public"."notebook_folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_notebook_folder_updated_at"();


--
-- Name: team_invites update_team_invites_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "update_team_invites_updated_at" BEFORE UPDATE ON "public"."team_invites" FOR EACH ROW EXECUTE FUNCTION "public"."update_team_invites_updated_at"();


--
-- Name: event_attendees event_attendees_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."event_attendees"
    ADD CONSTRAINT "event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: event_attendees event_attendees_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."event_attendees"
    ADD CONSTRAINT "event_attendees_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE CASCADE;


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: events events_parent_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: events events_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: expenses expenses_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;


--
-- Name: expenses expenses_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");


--
-- Name: fundraising fundraising_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."fundraising"
    ADD CONSTRAINT "fundraising_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: fundraising fundraising_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."fundraising"
    ADD CONSTRAINT "fundraising_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;


--
-- Name: fundraising fundraising_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."fundraising"
    ADD CONSTRAINT "fundraising_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;


--
-- Name: fundraising fundraising_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."fundraising"
    ADD CONSTRAINT "fundraising_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");


--
-- Name: mentoring_sessions mentoring_sessions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mentoring_sessions"
    ADD CONSTRAINT "mentoring_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: mentoring_sessions mentoring_sessions_mentor_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mentoring_sessions"
    ADD CONSTRAINT "mentoring_sessions_mentor_team_id_fkey" FOREIGN KEY ("mentor_team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;


--
-- Name: mentoring_sessions mentoring_sessions_mentored_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mentoring_sessions"
    ADD CONSTRAINT "mentoring_sessions_mentored_team_id_fkey" FOREIGN KEY ("mentored_team_id") REFERENCES "public"."mentoring_teams"("id") ON DELETE CASCADE;


--
-- Name: mentoring_sessions mentoring_sessions_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mentoring_sessions"
    ADD CONSTRAINT "mentoring_sessions_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;


--
-- Name: mentoring_teams mentoring_teams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mentoring_teams"
    ADD CONSTRAINT "mentoring_teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: mentoring_teams mentoring_teams_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mentoring_teams"
    ADD CONSTRAINT "mentoring_teams_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: mentoring_teams mentoring_teams_mentor_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mentoring_teams"
    ADD CONSTRAINT "mentoring_teams_mentor_team_id_fkey" FOREIGN KEY ("mentor_team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;


--
-- Name: mentoring_teams mentoring_teams_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mentoring_teams"
    ADD CONSTRAINT "mentoring_teams_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;


--
-- Name: notebook_folders notebook_folders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notebook_folders"
    ADD CONSTRAINT "notebook_folders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: notebook_folders notebook_folders_parent_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notebook_folders"
    ADD CONSTRAINT "notebook_folders_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."notebook_folders"("id") ON DELETE CASCADE;


--
-- Name: notebook_folders notebook_folders_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notebook_folders"
    ADD CONSTRAINT "notebook_folders_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;


--
-- Name: notebook_folders notebook_folders_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notebook_folders"
    ADD CONSTRAINT "notebook_folders_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");


--
-- Name: notebook_pages notebook_pages_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notebook_pages"
    ADD CONSTRAINT "notebook_pages_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."notebook_folders"("id") ON DELETE SET NULL;


--
-- Name: notebook_pages notebook_pages_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notebook_pages"
    ADD CONSTRAINT "notebook_pages_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;


--
-- Name: notebook_pages notebook_pages_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."notebook_pages"
    ADD CONSTRAINT "notebook_pages_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;


--
-- Name: tasks tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."team_members"("id");


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: tasks tasks_season_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;


--
-- Name: team_images team_images_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_images"
    ADD CONSTRAINT "team_images_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."mentoring_sessions"("id") ON DELETE SET NULL;


--
-- Name: team_images team_images_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_images"
    ADD CONSTRAINT "team_images_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."mentoring_teams"("id") ON DELETE CASCADE;


--
-- Name: team_images team_images_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_images"
    ADD CONSTRAINT "team_images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");


--
-- Name: team_invites team_invites_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: team_invites team_invites_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: team_notes team_notes_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_notes"
    ADD CONSTRAINT "team_notes_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: team_notes team_notes_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."team_notes"
    ADD CONSTRAINT "team_notes_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."mentoring_teams"("id") ON DELETE CASCADE;


--
-- Name: teams teams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: user_settings user_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: ftc_teams_cache Anyone can read ftc_teams_cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read ftc_teams_cache" ON "public"."ftc_teams_cache" FOR SELECT USING (true);


--
-- Name: ftc_teams_cache Authenticated users can insert ftc_teams_cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert ftc_teams_cache" ON "public"."ftc_teams_cache" FOR INSERT TO "authenticated" WITH CHECK (true);


--
-- Name: ftc_teams_cache Authenticated users can update ftc_teams_cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update ftc_teams_cache" ON "public"."ftc_teams_cache" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);


--
-- Name: event_attendees Event Attendees: Team members can delete their own signups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Event Attendees: Team members can delete their own signups" ON "public"."event_attendees" FOR DELETE TO "authenticated" USING (("team_member_id" IN ( SELECT "tm"."id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = "auth"."uid"()) AND ("tm"."is_active" = true)))));


--
-- Name: event_attendees Event Attendees: Team members can sign up for team events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Event Attendees: Team members can sign up for team events" ON "public"."event_attendees" FOR INSERT TO "authenticated" WITH CHECK ((("team_member_id" IN ( SELECT "tm"."id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = "auth"."uid"()) AND ("tm"."is_active" = true)))) AND ("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."team_members" "tm" ON (("e"."team_id" = "tm"."team_id")))
  WHERE (("tm"."user_id" = "auth"."uid"()) AND ("tm"."is_active" = true))))));


--
-- Name: event_attendees Event Attendees: Team members can view attendees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Event Attendees: Team members can view attendees" ON "public"."event_attendees" FOR SELECT USING (("event_id" IN ( SELECT "e"."id"
   FROM ("public"."events" "e"
     JOIN "public"."team_members" "tm" ON (("e"."team_id" = "tm"."team_id")))
  WHERE ("tm"."user_id" = "auth"."uid"()))));


--
-- Name: event_attendees Event Attendees: Team members can view their own signups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Event Attendees: Team members can view their own signups" ON "public"."event_attendees" FOR SELECT TO "authenticated" USING (("team_member_id" IN ( SELECT "tm"."id"
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = "auth"."uid"()) AND ("tm"."is_active" = true)))));


--
-- Name: events Events: Team members can create events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Events: Team members can create events" ON "public"."events" FOR INSERT WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: events Events: Team members can delete team events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Events: Team members can delete team events" ON "public"."events" FOR DELETE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: events Events: Team members can update team events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Events: Team members can update team events" ON "public"."events" FOR UPDATE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: events Events: Team members can view team events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Events: Team members can view team events" ON "public"."events" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: seasons Seasons: Admins can update seasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Seasons: Admins can update seasons" ON "public"."seasons" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = 'admin'::"text") AND ("team_members"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = 'admin'::"text") AND ("team_members"."is_active" = true)))));


--
-- Name: seasons Seasons: FRE season creation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Seasons: FRE season creation" ON "public"."seasons" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: seasons Seasons: Users can view all seasons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Seasons: Users can view all seasons" ON "public"."seasons" FOR SELECT USING (true);


--
-- Name: team_invites Team Invites: Anonymous can validate invite codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team Invites: Anonymous can validate invite codes" ON "public"."team_invites" FOR SELECT TO "anon" USING ((("is_active" = true) AND (("expires_at" IS NULL) OR ("expires_at" > "now"())) AND (("max_uses" IS NULL) OR ("current_uses" < "max_uses"))));


--
-- Name: team_invites Team Invites: Team admins can create invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team Invites: Team admins can create invites" ON "public"."team_invites" FOR INSERT WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = 'admin'::"text")))));


--
-- Name: team_invites Team Invites: Team admins can delete invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team Invites: Team admins can delete invites" ON "public"."team_invites" FOR DELETE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = 'admin'::"text")))));


--
-- Name: team_invites Team Invites: Team admins can update invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team Invites: Team admins can update invites" ON "public"."team_invites" FOR UPDATE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = 'admin'::"text")))));


--
-- Name: team_invites Team Invites: Team members can view team invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team Invites: Team members can view team invites" ON "public"."team_invites" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: expenses Team members can add expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can add expenses" ON "public"."expenses" FOR INSERT WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: fundraising Team members can add fundraising; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can add fundraising" ON "public"."fundraising" FOR INSERT WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: notebook_folders Team members can create folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can create folders" ON "public"."notebook_folders" FOR INSERT WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: notebook_folders Team members can delete their folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can delete their folders" ON "public"."notebook_folders" FOR DELETE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: expenses Team members can delete their team's expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can delete their team's expenses" ON "public"."expenses" FOR DELETE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: fundraising Team members can delete their team's fundraising; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can delete their team's fundraising" ON "public"."fundraising" FOR DELETE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: mentoring_teams Team members can delete their team's mentored teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can delete their team's mentored teams" ON "public"."mentoring_teams" FOR DELETE USING (("mentor_team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: mentoring_sessions Team members can delete their team's mentoring sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can delete their team's mentoring sessions" ON "public"."mentoring_sessions" FOR DELETE USING (("mentor_team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: tasks Team members can delete their team's tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can delete their team's tasks" ON "public"."tasks" FOR DELETE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: expenses Team members can insert expenses for their team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can insert expenses for their team" ON "public"."expenses" FOR INSERT WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: mentoring_teams Team members can insert mentored teams for their team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can insert mentored teams for their team" ON "public"."mentoring_teams" FOR INSERT WITH CHECK (("mentor_team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: mentoring_sessions Team members can insert mentoring sessions for their team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can insert mentoring sessions for their team" ON "public"."mentoring_sessions" FOR INSERT WITH CHECK (("mentor_team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: tasks Team members can insert tasks for their team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can insert tasks for their team" ON "public"."tasks" FOR INSERT WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: notebook_folders Team members can update their folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can update their folders" ON "public"."notebook_folders" FOR UPDATE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: expenses Team members can update their team's expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can update their team's expenses" ON "public"."expenses" FOR UPDATE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: fundraising Team members can update their team's fundraising; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can update their team's fundraising" ON "public"."fundraising" FOR UPDATE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: mentoring_teams Team members can update their team's mentored teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can update their team's mentored teams" ON "public"."mentoring_teams" FOR UPDATE USING (("mentor_team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: mentoring_sessions Team members can update their team's mentoring sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can update their team's mentoring sessions" ON "public"."mentoring_sessions" FOR UPDATE USING (("mentor_team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: tasks Team members can update their team's tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can update their team's tasks" ON "public"."tasks" FOR UPDATE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: notebook_folders Team members can view their folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view their folders" ON "public"."notebook_folders" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: expenses Team members can view their team's expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view their team's expenses" ON "public"."expenses" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: expenses Team members can view their team's expenses for current season; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view their team's expenses for current season" ON "public"."expenses" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: fundraising Team members can view their team's fundraising; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view their team's fundraising" ON "public"."fundraising" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: mentoring_teams Team members can view their team's mentored teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view their team's mentored teams" ON "public"."mentoring_teams" FOR SELECT USING (("mentor_team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: mentoring_sessions Team members can view their team's mentoring sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view their team's mentoring sessions" ON "public"."mentoring_sessions" FOR SELECT USING (("mentor_team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: tasks Team members can view their team's tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view their team's tasks" ON "public"."tasks" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."is_active" = true)))));


--
-- Name: teams Teams: Team members can delete their team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teams: Team members can delete their team" ON "public"."teams" FOR DELETE USING (("id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = 'admin'::"text")))));


--
-- Name: teams Teams: Team members can update their team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teams: Team members can update their team" ON "public"."teams" FOR UPDATE USING (("id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: teams Teams: Users can create teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teams: Users can create teams" ON "public"."teams" FOR INSERT WITH CHECK (true);


--
-- Name: teams Teams: Users can view all teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teams: Users can view all teams" ON "public"."teams" FOR SELECT USING (true);


--
-- Name: notebook_pages Users can delete notebook pages for their teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete notebook pages for their teams" ON "public"."notebook_pages" FOR DELETE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: mentoring_teams Users can delete their own mentoring teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own mentoring teams" ON "public"."mentoring_teams" FOR DELETE USING (("auth"."uid"() = "mentor_id"));


--
-- Name: user_settings Users can delete their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own settings" ON "public"."user_settings" FOR DELETE USING (("user_id" = "auth"."uid"()));


--
-- Name: team_notes Users can delete their own team notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own team notes" ON "public"."team_notes" FOR DELETE USING (("mentor_id" = "auth"."uid"()));


--
-- Name: team_images Users can delete their uploaded images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their uploaded images" ON "public"."team_images" FOR DELETE USING (("uploaded_by" = "auth"."uid"()));


--
-- Name: team_images Users can insert images for their mentoring teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert images for their mentoring teams" ON "public"."team_images" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."mentoring_teams"
  WHERE (("mentoring_teams"."id" = "team_images"."team_id") AND ("mentoring_teams"."mentor_id" = "auth"."uid"())))));


--
-- Name: notebook_pages Users can insert notebook pages for their teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert notebook pages for their teams" ON "public"."notebook_pages" FOR INSERT WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: mentoring_teams Users can insert their own mentoring teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own mentoring teams" ON "public"."mentoring_teams" FOR INSERT WITH CHECK (("auth"."uid"() = "mentor_id"));


--
-- Name: user_settings Users can insert their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own settings" ON "public"."user_settings" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: team_notes Users can insert their own team notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own team notes" ON "public"."team_notes" FOR INSERT WITH CHECK (("mentor_id" = "auth"."uid"()));


--
-- Name: notebook_pages Users can update notebook pages for their teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update notebook pages for their teams" ON "public"."notebook_pages" FOR UPDATE USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: mentoring_teams Users can update their own mentoring teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own mentoring teams" ON "public"."mentoring_teams" FOR UPDATE USING (("auth"."uid"() = "mentor_id"));


--
-- Name: user_settings Users can update their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own settings" ON "public"."user_settings" FOR UPDATE USING (("user_id" = "auth"."uid"()));


--
-- Name: team_notes Users can update their own team notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own team notes" ON "public"."team_notes" FOR UPDATE USING (("mentor_id" = "auth"."uid"()));


--
-- Name: team_images Users can view images for their mentoring teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view images for their mentoring teams" ON "public"."team_images" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."mentoring_teams"
  WHERE (("mentoring_teams"."id" = "team_images"."team_id") AND ("mentoring_teams"."mentor_id" = "auth"."uid"())))));


--
-- Name: notebook_pages Users can view notebook pages for their teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view notebook pages for their teams" ON "public"."notebook_pages" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));


--
-- Name: mentoring_teams Users can view their own mentoring teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own mentoring teams" ON "public"."mentoring_teams" FOR SELECT USING (("auth"."uid"() = "mentor_id"));


--
-- Name: user_settings Users can view their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own settings" ON "public"."user_settings" FOR SELECT USING (("user_id" = "auth"."uid"()));


--
-- Name: team_notes Users can view their own team notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own team notes" ON "public"."team_notes" FOR SELECT USING (("mentor_id" = "auth"."uid"()));


--
-- Name: event_attendees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."event_attendees" ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;

--
-- Name: ftc_teams_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."ftc_teams_cache" ENABLE ROW LEVEL SECURITY;

--
-- Name: fundraising; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."fundraising" ENABLE ROW LEVEL SECURITY;

--
-- Name: mentoring_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."mentoring_sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: mentoring_teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."mentoring_teams" ENABLE ROW LEVEL SECURITY;

--
-- Name: notebook_folders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."notebook_folders" ENABLE ROW LEVEL SECURITY;

--
-- Name: notebook_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."notebook_pages" ENABLE ROW LEVEL SECURITY;

--
-- Name: seasons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;

--
-- Name: team_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."team_images" ENABLE ROW LEVEL SECURITY;

--
-- Name: team_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."team_invites" ENABLE ROW LEVEL SECURITY;

--
-- Name: team_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."team_notes" ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;

-- Recreate buckets (safe to run multiple times)
INSERT INTO "storage"."buckets"
  ("id", "name", "owner", "public", "avif_autodetection",
   "file_size_limit", "allowed_mime_types", "type")
VALUES
  ('team-logos', 'team-logos', NULL, TRUE, FALSE,
   2097152, ARRAY['image/jpeg','image/png','image/gif','image/webp']::text[], 'STANDARD'),

  ('notebook-images', 'notebook-images', NULL, TRUE, FALSE,
   NULL, NULL, 'STANDARD'),

  ('mentoring-team-images', 'mentoring-team-images', NULL, FALSE, FALSE,
   NULL, NULL, 'STANDARD'),

  ('notebook-content', 'notebook-content', NULL, FALSE, FALSE,
   52428800, ARRAY['application/json']::text[], 'STANDARD')
ON CONFLICT ("id") DO NOTHING;

-- Storage RLS policies for notebook-content bucket
-- Path structure: {teamId}/{seasonId}/{pageId}.json

-- Allow team members to upload notebook content to their team's folders
CREATE POLICY "Team members can upload notebook content" ON "storage"."objects"
FOR INSERT TO "authenticated"
WITH CHECK (
  "bucket_id" = 'notebook-content'
  AND ("storage"."foldername"("name"))[1] IN (
    SELECT "team_id"::text
    FROM "public"."team_members"
    WHERE "user_id" = "auth"."uid"()
  )
);

-- Allow team members to read notebook content from their team's folders
CREATE POLICY "Team members can read notebook content" ON "storage"."objects"
FOR SELECT TO "authenticated"
USING (
  "bucket_id" = 'notebook-content'
  AND ("storage"."foldername"("name"))[1] IN (
    SELECT "team_id"::text
    FROM "public"."team_members"
    WHERE "user_id" = "auth"."uid"()
  )
);

-- Allow team members to update notebook content in their team's folders
CREATE POLICY "Team members can update notebook content" ON "storage"."objects"
FOR UPDATE TO "authenticated"
USING (
  "bucket_id" = 'notebook-content'
  AND ("storage"."foldername"("name"))[1] IN (
    SELECT "team_id"::text
    FROM "public"."team_members"
    WHERE "user_id" = "auth"."uid"()
  )
)
WITH CHECK (
  "bucket_id" = 'notebook-content'
  AND ("storage"."foldername"("name"))[1] IN (
    SELECT "team_id"::text
    FROM "public"."team_members"
    WHERE "user_id" = "auth"."uid"()
  )
);

-- Allow team members to delete notebook content from their team's folders
CREATE POLICY "Team members can delete notebook content" ON "storage"."objects"
FOR DELETE TO "authenticated"
USING (
  "bucket_id" = 'notebook-content'
  AND ("storage"."foldername"("name"))[1] IN (
    SELECT "team_id"::text
    FROM "public"."team_members"
    WHERE "user_id" = "auth"."uid"()
  )
);

-- Storage RLS policies for team-logos bucket
-- The team-logos bucket is public, so anyone can read
-- Only authenticated team members can upload/update/delete their team's logo

-- Allow authenticated users to upload team logos
CREATE POLICY "Authenticated users can upload team logos" ON "storage"."objects"
FOR INSERT TO "authenticated"
WITH CHECK (
  "bucket_id" = 'team-logos'
  AND "auth"."uid"() IS NOT NULL
);

-- Allow everyone to read team logos (bucket is public)
CREATE POLICY "Anyone can read team logos" ON "storage"."objects"
FOR SELECT
USING ("bucket_id" = 'team-logos');

-- Allow authenticated users to update team logos
CREATE POLICY "Authenticated users can update team logos" ON "storage"."objects"
FOR UPDATE TO "authenticated"
USING ("bucket_id" = 'team-logos')
WITH CHECK ("bucket_id" = 'team-logos');

-- Allow authenticated users to delete team logos
CREATE POLICY "Authenticated users can delete team logos" ON "storage"."objects"
FOR DELETE TO "authenticated"
USING ("bucket_id" = 'team-logos');

-- Storage RLS policies for notebook-images bucket
-- Allow team members to upload images
CREATE POLICY "Team members can upload notebook images" ON "storage"."objects"
FOR INSERT TO "authenticated"
WITH CHECK (
  "bucket_id" = 'notebook-images'
  AND "auth"."uid"() IS NOT NULL
);

-- Allow anyone to read notebook images (bucket is public)
CREATE POLICY "Anyone can read notebook images" ON "storage"."objects"
FOR SELECT
USING ("bucket_id" = 'notebook-images');

-- Allow authenticated users to delete notebook images
CREATE POLICY "Authenticated users can delete notebook images" ON "storage"."objects"
FOR DELETE TO "authenticated"
USING ("bucket_id" = 'notebook-images');

-- Storage RLS policies for mentoring-team-images bucket
-- Allow team members to upload images for their mentoring teams
CREATE POLICY "Team members can upload mentoring team images" ON "storage"."objects"
FOR INSERT TO "authenticated"
WITH CHECK (
  "bucket_id" = 'mentoring-team-images'
  AND "auth"."uid"() IS NOT NULL
);

-- Allow team members to read mentoring team images
CREATE POLICY "Team members can read mentoring team images" ON "storage"."objects"
FOR SELECT TO "authenticated"
USING ("bucket_id" = 'mentoring-team-images');

-- Allow team members to delete mentoring team images
CREATE POLICY "Team members can delete mentoring team images" ON "storage"."objects"
FOR DELETE TO "authenticated"
USING ("bucket_id" = 'mentoring-team-images');

