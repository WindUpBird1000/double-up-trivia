// activate-quiz
// Called by pg_cron at go_live_at time.
// Flips quiz status from Inactive -> Active and sends new-quiz notifications.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(to: string, subject: string, text: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) { console.warn('RESEND_API_KEY not set — skipping email'); return; }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Double Up Trivia <noreply@doubleuptrivia.com>', // update with your verified Resend domain
      to,
      subject,
      text,
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { quiz_key } = await req.json();
    if (!quiz_key) {
      return new Response(JSON.stringify({ error: 'quiz_key is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch the quiz
    const { data: quizRow, error: fetchError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('quiz_key', quiz_key)
      .eq('status', 'Inactive') // only activate if still Inactive
      .single();

    if (fetchError || !quizRow) {
      return new Response(JSON.stringify({ message: `Quiz ${quiz_key} not found or not Inactive — skipping` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const quiz = quizRow.data;

    // Flip to Active
    await supabase.from('quizzes')
      .update({ status: 'Active' })
      .eq('quiz_key', quiz_key);

    // Send new-quiz notifications (only once)
    if (!quiz.activeNotificationSent) {
      const { data: subscribers } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('notify_new_quiz', true);

      for (const sub of (subscribers || [])) {
        await sendEmail(
          sub.email,
          `Double Up Trivia — New Quiz Posted: ${quiz.title}`,
          `Hi ${sub.display_name || 'there'},\n\nA new quiz is available: "${quiz.title}"!\n\nLog in to Double Up Trivia to play.\n\nGood luck!`
        );
      }

      // Persist the flag
      await supabase.from('quizzes').update({
        data: { ...quiz, activeNotificationSent: true },
      }).eq('quiz_key', quiz_key);
    }

    console.log(`Activated quiz: ${quiz_key}`);
    return new Response(JSON.stringify({ success: true, quiz_key }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('activate-quiz error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
