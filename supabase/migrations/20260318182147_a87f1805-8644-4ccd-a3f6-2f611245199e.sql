
-- Add new columns to goal_plans
ALTER TABLE public.goal_plans 
  ADD COLUMN IF NOT EXISTS planning_mode text NOT NULL DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS viability_status text,
  ADD COLUMN IF NOT EXISTS distribution_mode text;

-- Add parent_goal_id to goals
ALTER TABLE public.goals 
  ADD COLUMN IF NOT EXISTS parent_goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;
