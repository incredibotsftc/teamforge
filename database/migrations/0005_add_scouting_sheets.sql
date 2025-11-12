-- Migration: Add scouting templates and responses tables

-- Create table for persisted scouting sheet templates (authoritative templates shared across the app)
CREATE TABLE public.scouting_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  team_id uuid,
  season_id uuid,
  name text NOT NULL,
  content jsonb NOT NULL,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.scouting_templates
  ADD CONSTRAINT scouting_templates_pkey PRIMARY KEY (id);

-- Helpful index to find templates for a team/season quickly
CREATE INDEX idx_scouting_templates_team_season ON public.scouting_templates(team_id, season_id);

-- Create table for saved/finalized scouting responses (filled sheets)
CREATE TABLE public.scouting_responses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  template_id uuid,
  team_id uuid,
  season_id uuid,
  filler_team_number integer,
  filler_team_id uuid,
  questions jsonb,
  responses jsonb,
  metadata jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.scouting_responses
  ADD CONSTRAINT scouting_responses_pkey PRIMARY KEY (id);

-- Foreign key linking to template (nullable so ad-hoc responses are allowed)
ALTER TABLE ONLY public.scouting_responses
  ADD CONSTRAINT scouting_responses_template_fkey FOREIGN KEY (template_id) REFERENCES public.scouting_templates(id) ON DELETE SET NULL;

-- Indexes to query responses by team, template or filler
CREATE INDEX idx_scouting_responses_team ON public.scouting_responses(team_id);
CREATE INDEX idx_scouting_responses_template ON public.scouting_responses(template_id);
CREATE INDEX idx_scouting_responses_filler ON public.scouting_responses(filler_team_number);

-- Optional: If you want to ensure quick text search on the template name or content, consider a GIN index on content
-- CREATE INDEX idx_scouting_templates_content_gin ON public.scouting_templates USING gin (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(content::text,'')));

-- End of migration
