// score-quiz
// Polls for quizzes with status = 'PendingScore' and runs the full scoring pipeline.
// Called by a pg_cron job every 5 minutes.
// Replicates computeQuizResults, scoreAttempt, and updateSeasonStandings from App.jsx.
// Uses Resend for email notifications (EmailJS is browser-only).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SNIPER_POINTS = 8;
const MN_POINTS = [20, 15, 10, 5];

// ── Scoring helpers (mirrored from App.jsx) ────────────────────────────────

function normalizeAnswer(s: string): string {
  let t = (s || '').trim().toLowerCase();
  t = t.replace(/(\d)\.(\d)/g, '$1\u0000$2');
  t = t.replace(/[.,'"`\u2019\u2018\u201c\u201d\-\u2013\u2014:;!?]/g, '');
  t = t.replace(/\u0000/g, '.');
  return t.replace(/\s+/g, ' ').trim();
}

function scoreAttempt(quiz: any, answers: any): boolean[] {
  const questions = quiz.type === 'fillintheblank' ? quiz.sentences : quiz.questions;
  return questions.map((q: any, i: number) => {
    const qtype = quiz.type === 'combination' ? q.questionType : quiz.type;
    const ans = answers[i];
    if (qtype === 'MC') {
      const displayOpts = q.options
        .map((opt: string, oi: number) => ({ opt, correct: q.correctIndices.includes(oi) }))
        .filter((o: any) => o.opt.trim() !== '');
      const correctOpts = displayOpts.filter((o: any) => o.correct).map((o: any) => o.opt);
      const sel = ans || [];
      return sel.length === correctOpts.length && correctOpts.every((o: string) => sel.includes(o));
    } else if (qtype === 'OR' || qtype === 'openresponse') {
      return ans && q.acceptedAnswers.some((a: string) => normalizeAnswer(a) === normalizeAnswer(ans));
    } else if (quiz.type === 'datadash') {
      return true;
    }
    return false;
  });
}

function computeQuizResults(quiz: any, attempts: any[]) {
  // ── Mystery Noun ──
  if (quiz.type === 'mysterynoun') {
    const questions = quiz.questions;
    const userScoresFinal = attempts.map((a: any) => {
      let total = 0;
      const correctnessByQ: boolean[] = [];
      questions.forEach((q: any, i: number) => {
        const answerData = a.answers[i];
        if (!answerData) { correctnessByQ.push(false); return; }
        const ans = normalizeAnswer(answerData.answer || '');
        const correct = ans !== '' && q.acceptedAnswers.some((ac: string) => normalizeAnswer(ac) === ans);
        const pts = correct ? (MN_POINTS[Math.min((answerData.cluesUsed || 1) - 1, 3)] || 0) : 0;
        total += pts;
        correctnessByQ.push(correct);
      });
      return { user_id: a.user_id, display_name: a.display_name, score: Math.round(total * 10) / 10, questionsCorrect: correctnessByQ.filter(Boolean).length };
    });
    const pointValues = questions.map(() => MN_POINTS[0]);
    const correctCounts = questions.map((q: any, i: number) => attempts.filter((a: any) => {
      const ad = a.answers[i]; if (!ad) return false;
      return ad.answer && q.acceptedAnswers.some((ac: string) => normalizeAnswer(ac) === normalizeAnswer(ad.answer));
    }).length);
    const correctnessByUser: any = {};
    attempts.forEach((a: any) => {
      correctnessByUser[a.user_id] = questions.map((q: any, i: number) => {
        const ad = a.answers[i]; if (!ad) return false;
        return ad.answer && q.acceptedAnswers.some((ac: string) => normalizeAnswer(ac) === normalizeAnswer(ad.answer));
      });
    });
    return { pointValues, userScores: userScoresFinal, correctnessByUser, correctCounts, isMNQuiz: true };
  }

  // ── Data Dash ──
  if (quiz.type === 'datadash') {
    const questions = quiz.questions;
    const totalAttempts = attempts.length;
    attempts.forEach((a: any) => {
      a._diffs = questions.map((q: any, i: number) => {
        const raw = (a.answers[i] || '').toString().replace(/,/g, '').trim();
        const userVal = parseFloat(raw);
        return isNaN(userVal) ? Infinity : Math.abs(userVal - q.correctAnswer);
      });
    });
    const ddPointsByUser: any = {};
    attempts.forEach((a: any) => { ddPointsByUser[a.user_id] = new Array(questions.length).fill(0); });
    questions.forEach((_: any, qi: number) => {
      const ranked = attempts.map((a: any) => ({ user_id: a.user_id, diff: a._diffs[qi] }))
        .sort((a: any, b: any) => a.diff - b.diff);
      let rank = totalAttempts;
      let j = 0;
      while (j < ranked.length) {
        let k = j;
        while (k < ranked.length - 1 && ranked[k + 1].diff === ranked[k].diff) k++;
        if (ranked[j].diff === Infinity) {
          for (let m = j; m <= k; m++) ddPointsByUser[ranked[m].user_id][qi] = 0;
        } else {
          const avg = Math.round((ranked.slice(j, k + 1).reduce((s: number, _: any, ii: number) => s + (rank - ii), 0) / (k - j + 1)) * 10) / 10;
          for (let m = j; m <= k; m++) ddPointsByUser[ranked[m].user_id][qi] = avg;
        }
        rank -= (k - j + 1);
        j = k + 1;
      }
    });
    const userScoresFinal = attempts.map((a: any) => {
      let total = 0;
      const tokenMap = a.token_assignments || {};
      const doublesArr = a.doubles || [];
      questions.forEach((_: any, i: number) => {
        const basePts = ddPointsByUser[a.user_id][i];
        const token = tokenMap[i] || (doublesArr.includes(i) ? 'doubler' : null);
        total += token === 'doubler' ? Math.round(basePts * 2 * 10) / 10 : basePts;
      });
      return { user_id: a.user_id, display_name: a.display_name, score: Math.round(total * 10) / 10, questionsCorrect: 0 };
    });
    const pointValuesFlat = questions.map((_: any, qi: number) => ddPointsByUser[attempts[0]?.user_id]?.[qi] || 0);
    const correctCounts = questions.map(() => 0);
    const correctnessByUser: any = {};
    attempts.forEach((a: any) => { correctnessByUser[a.user_id] = questions.map(() => true); });
    return { pointValues: pointValuesFlat, userScores: userScoresFinal, correctnessByUser, correctCounts, ddPointsByUser, isDashQuiz: true };
  }

  // ── Open Response / standard ──
  const questions = quiz.type === 'fillintheblank' ? quiz.sentences : quiz.questions;
  const n = questions.length;
  const totalAttempts = attempts.length;
  const correctCounts = questions.map((_: any, i: number) => attempts.filter((a: any) => a.correctness[i]).length);
  const sorted = [...correctCounts.map((c: number, i: number) => ({ i, c }))].sort((a: any, b: any) => a.c - b.c || a.i - b.i);
  const pointValues = new Array(n).fill(0);
  let rank = n;
  let j = 0;
  while (j < sorted.length) {
    let k = j;
    while (k < sorted.length - 1 && sorted[k + 1].c === sorted[k].c) k++;
    const avgPoints = Math.round((sorted.slice(j, k + 1).reduce((s: number, _: any, ii: number) => s + (rank - ii), 0) / (k - j + 1)) * 10) / 10;
    for (let m = j; m <= k; m++) pointValues[sorted[m].i] = avgPoints;
    rank -= (k - j + 1);
    j = k + 1;
  }
  const correctnessByUser: any = {};
  const userScores = attempts.map((a: any) => {
    let total = 0;
    let questionsCorrect = 0;
    correctnessByUser[a.user_id] = a.correctness;
    const tokenMap = a.token_assignments || {};
    const doublesArr = a.doubles || [];
    a.correctness.forEach((correct: boolean, i: number) => {
      const pts = pointValues[i];
      const token = tokenMap[i] || (doublesArr.includes(i) ? 'doubler' : null);
      if (correct) questionsCorrect++;
      if (token === 'doubler') {
        total += correct ? pts * 2 : 0;
      } else if (token === 'insurance') {
        total += correct ? pts : Math.round((pts / 2) * 10) / 10;
      } else if (token === 'sniper') {
        total += correct ? SNIPER_POINTS : 0;
      } else if (token === 'parasite') {
        total += correct ? pts : (totalAttempts > 0 ? Math.round((correctCounts[i] * pts / totalAttempts) * 10) / 10 : 0);
      } else {
        total += correct ? pts : 0;
      }
    });
    return { user_id: a.user_id, display_name: a.display_name, score: Math.round(total * 10) / 10, questionsCorrect };
  });
  return { pointValues, userScores, correctnessByUser, correctCounts };
}

async function updateSeasonStandings(supabase: any, seasonName: string, freshQuizKey: string, freshUserScores: any[]) {
  if (!seasonName || seasonName.trim().toLowerCase() === 'offseason') return;
  const { data: seasonQuizRows } = await supabase.from('quizzes').select('quiz_key').eq('category', seasonName).eq('status', 'Scored');
  if (!seasonQuizRows || seasonQuizRows.length === 0) return;
  const otherKeys = seasonQuizRows.map((r: any) => r.quiz_key).filter((k: string) => k !== freshQuizKey);
  const otherResults = otherKeys.length > 0
    ? (await supabase.from('quiz_results').select('quiz_key, scores').in('quiz_key', otherKeys)).data || []
    : [];
  const results = [...otherResults, { quiz_key: freshQuizKey, scores: { userScores: freshUserScores } }];
  const seasonTotals: any = {};
  results.forEach(({ scores }: any) => {
    (scores?.userScores || []).forEach((u: any) => {
      if (!seasonTotals[u.user_id]) seasonTotals[u.user_id] = { display_name: u.display_name, seasonPoints: 0 };
      seasonTotals[u.user_id].seasonPoints = Math.round((seasonTotals[u.user_id].seasonPoints + (u.score || 0)) * 10) / 10;
    });
  });
  const standings = Object.entries(seasonTotals)
    .map(([user_id, data]: [string, any]) => ({ user_id, ...data }))
    .sort((a: any, b: any) => b.seasonPoints - a.seasonPoints);
  await supabase.from('season_standings').upsert({ season: seasonName, updated_at: new Date().toISOString(), standings }, { onConflict: 'season' });
}

// ── Email via Resend ───────────────────────────────────────────────────────

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

// ── Main handler ───────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Find all quizzes with status = 'PendingScore'
    const { data: pendingQuizzes, error: fetchError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('status', 'PendingScore');

    if (fetchError) throw fetchError;
    if (!pendingQuizzes || pendingQuizzes.length === 0) {
      return new Response(JSON.stringify({ message: 'No quizzes pending scoring' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const processed: string[] = [];

    for (const quizRow of pendingQuizzes) {
      const quiz = quizRow.data;
      const quizKey = quizRow.quiz_key;

      try {
        // Fetch submitted attempts
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_key', quizKey)
          .eq('status', 'submitted');

        // Fetch display names
        const userIds = (attempts || []).map((a: any) => a.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']);
        const profileMap: any = {};
        (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p.display_name || p.email || p.user_id; });

        let userScores: any[] = [];
        let scoresPayload: any = {};

        if (attempts && attempts.length > 0) {
          const attemptsWithCorrectness = attempts.map((a: any) => ({
            ...a,
            display_name: profileMap[a.user_id] || a.user_id,
            correctness: scoreAttempt(quiz, a.answers || {}),
          }));

          const { pointValues, userScores: us, correctnessByUser, correctCounts, ddPointsByUser, isDashQuiz } = computeQuizResults(quiz, attemptsWithCorrectness) as any;
          userScores = us;
          scoresPayload = { pointValues, userScores, correctnessByUser, correctCounts, ...(isDashQuiz ? { ddPointsByUser } : {}) };

          // Save quiz_results
          await supabase.from('quiz_results').upsert({
            quiz_key: quizKey,
            quiz_title: quiz.title,
            posted_at: new Date().toISOString(),
            scores: scoresPayload,
          }, { onConflict: 'quiz_key' });

          // Update season standings
          await updateSeasonStandings(supabase, quizRow.category, quizKey, userScores);

          // Send scored notifications
          if (!quiz.scoredNotificationSent) {
            const participantIds = attempts.map((a: any) => a.user_id);
            if (participantIds.length > 0) {
              const { data: notifyProfiles } = await supabase
                .from('profiles')
                .select('email, display_name')
                .eq('notify_scored', true)
                .in('user_id', participantIds);
              for (const sub of (notifyProfiles || [])) {
                await sendEmail(
                  sub.email,
                  `Double Up Trivia — Results Posted: ${quiz.title}`,
                  `Hi ${sub.display_name || 'there'},\n\nResults are in for "${quiz.title}"!\n\nLog in to Double Up Trivia to see how you did.`
                );
              }
            }
          }
        }

        // Flip status to Scored and set scoredNotificationSent flag
        await supabase.from('quizzes').update({
          status: 'Scored',
          data: { ...quiz, activeNotificationSent: quiz.activeNotificationSent || false, scoredNotificationSent: true },
        }).eq('quiz_key', quizKey);

        processed.push(quizKey);
        console.log(`Scored quiz: ${quizKey}`);

      } catch (quizErr) {
        console.error(`Error scoring quiz ${quizKey}:`, quizErr);
        // Don't rethrow — continue to next quiz
      }
    }

    return new Response(JSON.stringify({ success: true, processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('score-quiz error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
