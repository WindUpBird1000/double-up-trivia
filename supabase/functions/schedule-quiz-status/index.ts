// schedule-quiz-status
// Called from App.jsx when saving a quiz with go_live_at / score_on_at set.
// Creates pg_cron jobs that directly UPDATE the quizzes table at the scheduled times.
// The scoring job just flips status to a sentinel that score-quiz.ts picks up.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert a UTC ISO string to pg_cron "minute hour day month *" format
function toCron(isoUtc: string): string {
  const d = new Date(isoUtc);
  return `${d.getUTCMinutes()} ${d.getUTCHours()} ${d.getUTCDate()} ${d.getUTCMonth() + 1} *`;
}

// Escape single quotes in a string for embedding in SQL
function sqlStr(s: string): string {
  return s.replace(/'/g, "''");
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { quiz_key, go_live_at, score_on_at, cancel } = await req.json();

    if (!quiz_key) {
      return new Response(JSON.stringify({ error: 'quiz_key is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const safeKey = quiz_key.replace(/[^a-z0-9]/gi, '_').substring(0, 40);
    const activateJob = `activate_${safeKey}`;
    const scoreJob    = `score_${safeKey}`;

    // Always remove existing jobs for this quiz (handles rescheduling and cancellation)
    await supabase.rpc('cron_unschedule_if_exists', { job_name: activateJob });
    await supabase.rpc('cron_unschedule_if_exists', { job_name: scoreJob });

    if (cancel) {
      return new Response(JSON.stringify({ success: true, message: 'Jobs cancelled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const scheduled: string[] = [];

    if (go_live_at) {
      const schedule = toCron(go_live_at);
      const sql = `UPDATE quizzes SET status = 'Active' WHERE quiz_key = '${sqlStr(quiz_key)}' AND status = 'Inactive'`;
      const { error } = await supabase.rpc('cron_schedule', {
        job_name: activateJob,
        schedule,
        command: sql,
      });
      if (error) throw new Error(`Activation scheduling failed: ${error.message}`);
      scheduled.push(`activate @ ${schedule} UTC`);
    }

    if (score_on_at) {
      const schedule = toCron(score_on_at);
      // Set status to 'PendingScore' — the score-quiz Edge Function polls for this and runs scoring
      const sql = `UPDATE quizzes SET status = 'PendingScore' WHERE quiz_key = '${sqlStr(quiz_key)}' AND status = 'Active'`;
      const { error } = await supabase.rpc('cron_schedule', {
        job_name: scoreJob,
        schedule,
        command: sql,
      });
      if (error) throw new Error(`Scoring scheduling failed: ${error.message}`);
      scheduled.push(`score @ ${schedule} UTC`);
    }

    return new Response(JSON.stringify({ success: true, scheduled }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('schedule-quiz-status error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
