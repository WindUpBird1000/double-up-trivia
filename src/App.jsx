// v2.1
import React, { useState, useEffect } from 'react';
import { Check, X, ChevronLeft, ChevronRight, Settings, BookOpen, LogOut, Plus, Trash2, Download, Edit2, Star, List } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jcsoyacjqjfznsprmxcj.supabase.co',
  'sb_publishable_zGvjNAiBtoaRersumsUjWA_OGLXkrJz'
);

const SNIPER_POINTS = 8;

const TOKEN_CONFIG = {
  doubler: {
    label: '×2',
    color: '#b45309',
    bg: '#fef9c3',
    border: '#f59e0b',
    textColor: '#92400e',
    description: 'Doubles the points you receive for a correct answer.',
    svgIcon: (size=32) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#fbbf24" stroke="#d97706" strokeWidth="2"/>
        <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#78350f" fontFamily="sans-serif">×2</text>
      </svg>
    ),
  },
  insurance: {
    label: 'INS',
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#3b82f6',
    textColor: '#1e40af',
    description: 'Wrong answer? You still earn half the question\'s point value.',
    svgIcon: (size=32) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 3 L28 8 L28 18 C28 24 22 29 16 31 C10 29 4 24 4 18 L4 8 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.5"/>
        <path d="M16 5 L26 9.5 L26 18 C26 23 21 27.5 16 29.5 C11 27.5 6 23 6 18 L6 9.5 Z" fill="#93c5fd"/>
        <text x="16" y="21" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e3a8a" fontFamily="sans-serif">INS</text>
      </svg>
    ),
  },
  sniper: {
    label: '🎯',
    color: '#b91c1c',
    bg: '#fef2f2',
    border: '#ef4444',
    textColor: '#991b1b',
    description: `Correct answer scores ${SNIPER_POINTS} points flat, regardless of question value.`,
    svgIcon: (size=32) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="13" fill="#fca5a5" stroke="#dc2626" strokeWidth="2"/>
        <circle cx="16" cy="16" r="9" fill="none" stroke="#dc2626" strokeWidth="1.5"/>
        <circle cx="16" cy="16" r="5" fill="none" stroke="#dc2626" strokeWidth="1.5"/>
        <circle cx="16" cy="16" r="2" fill="#dc2626"/>
        <line x1="16" y1="3" x2="16" y2="7" stroke="#dc2626" strokeWidth="1.5"/>
        <line x1="16" y1="25" x2="16" y2="29" stroke="#dc2626" strokeWidth="1.5"/>
        <line x1="3" y1="16" x2="7" y2="16" stroke="#dc2626" strokeWidth="1.5"/>
        <line x1="25" y1="16" x2="29" y2="16" stroke="#dc2626" strokeWidth="1.5"/>
      </svg>
    ),
  },
  parasite: {
    label: 'PAR',
    color: '#15803d',
    bg: '#f0fdf4',
    border: '#22c55e',
    textColor: '#166534',
    description: 'Your score equals the average score for this question across all participants.',
    svgIcon: (size=32) => (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="16" cy="18" rx="7" ry="9" fill="#4ade80" stroke="#16a34a" strokeWidth="1.5"/>
        <ellipse cx="16" cy="10" rx="4" ry="5" fill="#86efac" stroke="#16a34a" strokeWidth="1.2"/>
        <line x1="9" y1="16" x2="4" y2="12" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="9" y1="20" x2="4" y2="22" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="23" y1="16" x2="28" y2="12" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="23" y1="20" x2="28" y2="22" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="14" cy="9" r="1" fill="#166534"/>
        <circle cx="18" cy="9" r="1" fill="#166534"/>
      </svg>
    ),
  },
};

const parseSentence = (rawText) => {
  const match = rawText.match(/\[([^\]]+)\]/);
  if (!match) return { display: rawText, answer: '' };
  return { display: rawText.replace(/\[[^\]]+\]/, '______'), answer: match[1] };
};
const extractAnswerWords = (sentences) => sentences.map(s => parseSentence(s.text).answer).filter(Boolean);
const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const normalizeAnswer = (s) => (s || '').trim().toLowerCase();
const emptyMCQuestion  = () => ({ prompt: '', options: ['','','','','',''], correctIndices: [], randomizeOptions: false });
const emptyORQuestion  = () => ({ prompt: '', acceptedAnswers: [], primaryAnswerIndex: 0, showOthersCount: false });
const emptyDDQuestion  = () => ({ prompt: '', correctAnswer: null }); // Data Dash: single numeric answer
const emptyCombQuestion = (questionType) => ({
  questionType,
  ...(questionType === 'MC' ? emptyMCQuestion() : questionType === 'OR' ? emptyORQuestion() : { text: '', answer: '' })
});
const typeLabel = (t) => t === 'MC' ? 'Multiple Choice' : t === 'openresponse' ? 'Open Response' : t === 'datadash' ? 'Data Dash' : t === 'combination' ? 'Combination' : 'Fill-in-the-blank';

const renderInlineFormatting = (text) => {
  const parts = text.split(/(\{\{(?:b|i|u):[^}]+\}\})/);
  return parts.map((part, i) => {
    const match = part.match(/^\{\{(b|i|u):([^}]+)\}\}$/);
    if (match) {
      const [, tag, content] = match;
      if (tag === 'b') return <strong key={i}>{content}</strong>;
      if (tag === 'i') return <em key={i}>{content}</em>;
      if (tag === 'u') return <u key={i}>{content}</u>;
    }
    return <span key={i}>{part}</span>;
  });
};

const renderPrompt = (text) => {
  if (!text) return null;
  const parts = text.split(/(\{\{image:[^}]+\}\})/);
  return parts.map((part, i) => {
    const match = part.match(/^\{\{image:([^}]+)\}\}$/);
    if (match) {
      return (
        <div key={i} style={{margin:'1rem 0', textAlign:'center'}}>
          <img src={`/images/${match[1].trim()}`} alt="" style={{maxWidth:'100%', borderRadius:'0.5rem', display:'inline-block'}}/>
        </div>
      );
    }
    return <span key={i}>{renderInlineFormatting(part)}</span>;
  });
};

const ImageHelper = () => {
  const [imgFilename, setImgFilename] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    if (!imgFilename.trim()) return;
    const tag = `{{image:${imgFilename.trim()}}}`;
    navigator.clipboard.writeText(tag).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }).catch(() => alert(`Copy failed. Tag to paste: ${tag}`));
  };
  return (
    <div className="flex items-center gap-2 mt-2 mb-1">
      <span className="text-xs text-gray-400 whitespace-nowrap">Image:</span>
      <input type="text" value={imgFilename} onChange={e=>setImgFilename(e.target.value)} placeholder="filename.jpg" className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-400" style={{minWidth:0}}/>
      <button onClick={handleCopy} disabled={!imgFilename.trim()} className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${copied?'bg-green-500 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40'}`}>
        {copied ? '✓ Copied!' : 'Copy tag'}
      </button>
      <span className="text-xs text-gray-300 hidden sm:block">→ paste into prompt</span>
    </div>
  );
};
const shortTypeLabel = (t) => t === 'MC' ? 'MC' : t === 'OR' ? 'OR' : t === 'FITB' ? 'FitB' : t;
const promptPreview = (q) => { const text = q.prompt || q.text || ''; return text.length > 50 ? text.slice(0, 50) + '…' : text; };

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const ordinal = (n) => {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
};

const ScoreboardsListScreen = ({ currentUser, displayName, allQuizData, onSelectQuiz, onSelectSeason, onQuizzes, onLogout, isAdminView, onAdminDashboard, onHelp, onSettings }) => {
  const [allResults, setAllResults] = React.useState([]);
  const [myAttempts, setMyAttempts] = React.useState({});
  const [seasonNames, setSeasonNames] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [openYears, setOpenYears] = React.useState({});
  const [openMonths, setOpenMonths] = React.useState({});

  React.useEffect(() => {
    const fetchResults = supabase.from('quiz_results').select('*').order('posted_at', { ascending: false });
    const fetchAttempts = currentUser
      ? supabase.from('quiz_attempts').select('quiz_key, status').eq('user_id', currentUser.id)
      : Promise.resolve({ data: [] });
    Promise.all([fetchResults, fetchAttempts]).then(([{ data: results }, { data: attempts }]) => {
      const scoredResults = (results || []).filter(r => allQuizData[r.quiz_key]?.status === 'Scored');
      setAllResults(scoredResults);
      const map = {};
      (attempts || []).forEach(a => { map[a.quiz_key] = a; });
      setMyAttempts(map);
      // Derive seasons directly from allQuizData — any scored, non-Offseason category
      const seasons = Array.from(new Set(
        Object.values(allQuizData)
          .filter(q => q.status === 'Scored' && q.category && q.category.trim().toLowerCase() !== 'offseason')
          .map(q => q.category)
      )).sort((a, b) => a.localeCompare(b));
      setSeasonNames(seasons);
      setLoading(false);
    });
  }, []);

  const getUserPlacement = (result) => {
    if (!currentUser) return null;
    const { userScores } = result.scores;
    const me = userScores.find(u => u.user_id === currentUser.id);
    if (!me) return null;
    const ranked = [...userScores].sort((a, b) => b.score - a.score || b.questionsCorrect - a.questionsCorrect);
    let rank = 1;
    for (let i = 0; i < ranked.length; i++) {
      if (i > 0 && ranked[i].score === ranked[i-1].score && ranked[i].questionsCorrect === ranked[i-1].questionsCorrect) {
        // same rank as previous
      } else {
        rank = i + 1;
      }
      if (ranked[i].user_id === currentUser.id) return rank;
    }
    return null;
  };

  const QuizResultCard = ({ result, index = 0 }) => {
    const quiz = allQuizData[result.quiz_key];
    const totalUsers = result.scores?.userScores?.length || 0;
    const placement = getUserPlacement(result);
    const tookQuiz = myAttempts[result.quiz_key]?.status === 'submitted';
    return (
      <div onClick={() => onSelectQuiz(result.quiz_key)} className={`cursor-pointer hover:bg-blue-50 rounded-lg p-3 transition-colors border border-transparent hover:border-blue-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
        <p className="font-bold text-gray-800">{result.quiz_title || quiz?.title || result.quiz_key} <span className="text-xs font-normal text-gray-500">({quiz?.category || ''})</span> <span className="text-xs font-normal text-gray-500">— Taken by {totalUsers} user{totalUsers !== 1 ? 's' : ''}.</span></p>
        {!isAdminView && (tookQuiz
          ? <p className="text-xs text-blue-600 font-medium mt-0.5">{placement ? `You finished in ${ordinal(placement)} place.` : 'You took this quiz.'}</p>
          : <p className="text-xs text-gray-400 italic mt-0.5">You didn't take this quiz.</p>)}
      </div>
    );
  };

  if (loading) return <div className="max-w-2xl mx-auto p-6 min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading scoreboards...</p></div>;

  const recent = allResults.slice(0, 5);

  // Group by year then month
  const grouped = {};
  allResults.forEach(r => {
    const d = new Date(r.posted_at);
    const y = d.getFullYear();
    const m = d.getMonth();
    if (!grouped[y]) grouped[y] = {};
    if (!grouped[y][m]) grouped[y][m] = [];
    grouped[y][m].push(r);
  });
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);

  return (
    <>

    <div className="max-w-2xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
        <span className="text-sm text-gray-500">{displayName || ''}</span>
        <div className="flex gap-2">
          {isAdminView ? (
            <>
              <button onClick={onAdminDashboard} className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium text-sm"><Settings size={16}/> Admin Dashboard</button>
              {onLogout && <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"><LogOut size={16}/> Log Out</button>}
            </>
          ) : (
            <>
              <button onClick={()=>onHelp&&onHelp()} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium text-sm">?</button>
              <button onClick={onQuizzes} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Quizzes</button>
              {onSettings && <button onClick={onSettings} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium text-sm"><Settings size={16}/></button>}
              {onLogout && <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"><LogOut size={16}/> Log Out</button>}
            </>
          )}
        </div>
      </div>
      <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Scoreboards</h1>
      </div>

      {allResults.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">No scored quizzes yet.</div>
      ) : (
        <>
          {/* Recent */}
          <div className="bg-white rounded-xl shadow-md p-5 mb-6">
            <h2 className="text-lg font-bold text-gray-700 mb-3">Five Most Recently Scored Quizzes</h2>
            <div className="rounded-lg overflow-hidden">
              {recent.map((r, idx) => <QuizResultCard key={r.quiz_key} result={r} index={idx}/>)}
            </div>
          </div>

          {/* Season Scoreboards */}
          {seasonNames.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-5 mb-6">
              <h2 className="text-lg font-bold text-gray-700 mb-3">Season Scoreboards</h2>
              <div className="rounded-lg overflow-hidden">
                {seasonNames.map((name, idx) => (
                  <div
                    key={name}
                    onClick={() => onSelectSeason(name)}
                    className={`cursor-pointer hover:bg-purple-50 rounded-lg px-3 py-3 transition-colors border border-transparent hover:border-purple-200 flex items-center justify-between ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <span className="font-bold text-gray-800">{name}</span>
                    <span className="text-xs text-purple-600 font-medium">View Standings →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All quizzes by year/month */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h2 className="text-lg font-bold text-gray-700 mb-3">All Quizzes</h2>
            {years.map(y => (
              <div key={y} className="mb-2">
                <button onClick={()=>setOpenYears(p=>({...p,[y]:!p[y]}))} className="flex items-center gap-2 w-full text-left py-2 px-1 hover:bg-gray-50 rounded font-semibold text-gray-700">
                  <span className={`transition-transform text-gray-400 ${openYears[y]?'rotate-90':''}`} style={{display:'inline-block'}}>▶</span>
                  {y}
                </button>
                {openYears[y] && (
                  <div className="ml-4">
                    {Object.keys(grouped[y]).map(Number).sort((a,b)=>b-a).map(m => (
                      <div key={m} className="mb-1">
                        <button onClick={()=>setOpenMonths(p=>({...p,[`${y}-${m}`]:!p[`${y}-${m}`]}))} className="flex items-center gap-2 w-full text-left py-1.5 px-1 hover:bg-gray-50 rounded text-gray-600">
                          <span className={`transition-transform text-gray-400 text-xs ${openMonths[`${y}-${m}`]?'rotate-90':''}`} style={{display:'inline-block'}}>▶</span>
                          {MONTH_NAMES[m]}
                        </button>
                        {openMonths[`${y}-${m}`] && (
                          <div className="rounded-lg overflow-hidden ml-4">
                            {grouped[y][m].map((r, idx) => <QuizResultCard key={r.quiz_key} result={r} index={idx}/>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
    </>
  );
};

const ScoreboardScreen = ({ quiz, quizKey, currentUser, displayName, onBack, onQuizzes, onLogout, isAdminView, onAdminDashboard }) => {
  const [results, setResults] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [myAttempt, setMyAttempt] = React.useState(null);
  const [popupAnswers, setPopupAnswers] = React.useState(null);
  const [allAttempts, setAllAttempts] = React.useState({});
  const [selectedUserId, setSelectedUserId] = React.useState(null);

  React.useEffect(() => {
    const fetchResults = supabase.from('quiz_results').select('*').eq('quiz_key', quizKey).single();
    const fetchAttempt = currentUser
      ? supabase.from('quiz_attempts').select('*').eq('quiz_key', quizKey).eq('user_id', currentUser.id).single()
      : Promise.resolve({ data: null });
    const fetchAllAttempts = isAdminView
      ? supabase.from('quiz_attempts').select('*').eq('quiz_key', quizKey).eq('status', 'submitted')
      : Promise.resolve({ data: [] });    Promise.all([fetchResults, fetchAttempt, fetchAllAttempts]).then(([{ data: r }, { data: a }, { data: allA }]) => {
      setResults(r);
      setMyAttempt(a);
      const map = {};
      (allA || []).forEach(att => { map[att.user_id] = att; });
      setAllAttempts(map);
      setLoading(false);
    });
  }, [quizKey]);

  if (loading) return <div className="max-w-3xl mx-auto p-6 flex items-center justify-center min-h-screen"><p className="text-gray-500">Loading scoreboard...</p></div>;
  if (!results) return <div className="max-w-3xl mx-auto p-6"><p className="text-red-600">No scoring data found for this quiz.</p></div>;

  const { pointValues, userScores, correctCounts } = results.scores;
  const questions = quiz.type === 'fillintheblank' ? quiz.sentences : quiz.questions;
  const myAnswers = myAttempt?.answers || {};
  const myDoubles = myAttempt?.doubles || [];
  const totalUsers = userScores.length;

  // Build ranked leaderboard with tiebreaking
  const ranked = [...userScores]
    .map(u => ({ ...u, questionsCorrect: typeof u.questionsCorrect === 'number' ? u.questionsCorrect : 0 }))
    .sort((a, b) => b.score - a.score || b.questionsCorrect - a.questionsCorrect || a.display_name.localeCompare(b.display_name));
  const withRanks = [];
  let rank = 1;
  ranked.forEach((u, i) => {
    if (i > 0 && ranked[i].score === ranked[i-1].score && ranked[i].questionsCorrect === ranked[i-1].questionsCorrect) {
      withRanks.push({ ...u, rank: withRanks[i-1].rank });
    } else {
      withRanks.push({ ...u, rank });
      rank = i + 2;
    }
  });

  // Correctness check — accepts an answers map and doubles array
  const isCorrectForAnswers = (q, i, answers) => {
    const qtype = quiz.type === 'combination' ? q.questionType : quiz.type;
    const ans = answers[i];
    if (qtype === 'MC') {
      const displayOpts = q.options.map((opt, oi) => ({ opt, correct: q.correctIndices.includes(oi) })).filter(o => o.opt.trim() !== '');
      const correctOpts = displayOpts.filter(o => o.correct).map(o => o.opt);
      const sel = ans || [];
      return sel.length === correctOpts.length && correctOpts.every(o => sel.includes(o));
    } else if (qtype === 'OR' || qtype === 'openresponse') {
      return ans && q.acceptedAnswers.some(a => (a||'').trim().toLowerCase() === (ans||'').trim().toLowerCase());
    } else {
      const correct = q.text?.match(/\[([^\]]+)\]/)?.[1];
      return ans === correct;
    }
  };

  const isCorrect = (q, i) => isCorrectForAnswers(q, i, myAnswers);

  const getCorrectDisplay = (q) => {
    const qtype = quiz.type === 'combination' ? q.questionType : quiz.type;
    if (qtype === 'MC') {
      const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const opts = q.options.map((opt, oi) => ({ opt, correct: q.correctIndices.includes(oi) })).filter(o => o.opt.trim() !== '');
      return opts.filter(o => o.correct).map(o => { const idx = opts.findIndex(d => d.opt === o.opt); return `${labels[idx]}. ${o.opt}`; }).join(', ');
    } else if (qtype === 'OR' || qtype === 'openresponse') {
      return q.acceptedAnswers[q.primaryAnswerIndex ?? 0] || q.acceptedAnswers[0] || '';
    } else {
      return q.text?.match(/\[([^\]]+)\]/)?.[1] || '';
    }
  };

  const getAnswerDisplayForAnswers = (q, i, answers) => {
    const qtype = quiz.type === 'combination' ? q.questionType : quiz.type;
    const ans = answers[i];
    if (qtype === 'MC') {
      const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const opts = q.options.map((opt, oi) => ({ opt, correct: q.correctIndices.includes(oi) })).filter(o => o.opt.trim() !== '');
      return (ans || []).map(a => { const idx = opts.findIndex(o => o.opt === a); return `${idx >= 0 ? labels[idx]+'. ' : ''}${a}`; }).join(', ') || '—';
    }
    return ans || '—';
  };

  const getMyAnswerDisplay = (q, i) => getAnswerDisplayForAnswers(q, i, myAnswers);

  const getFullQuestion = (q, i, answers) => {
    const qtype = quiz.type === 'combination' ? q.questionType : quiz.type;
    if (qtype === 'fillintheblank') {
      const ans = answers[i];
      return (q.text || '').replace(/\[[^\]]+\]/, ans ? `[${ans}]` : '______');
    }
    return q.prompt || q.text || '';
  };

  // Raw question text for admin view — no formatting, just the literal string
  const getRawQuestionText = (q) => {
    const qtype = quiz.type === 'combination' ? q.questionType : quiz.type;
    if (qtype === 'fillintheblank') return q.text || '';
    return q.prompt || q.text || '';
  };

  // Admin drill-down: selected user's attempt data
  const selectedAttempt = selectedUserId ? allAttempts[selectedUserId] : null;
  const selectedAnswers = selectedAttempt?.answers || {};
  const selectedDoubles = selectedAttempt?.doubles || [];
  const selectedUserName = selectedUserId ? (withRanks.find(u => u.user_id === selectedUserId)?.display_name || selectedUserId) : null;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      {popupAnswers && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4" onClick={()=>setPopupAnswers(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-3">All Accepted Answers</h3>
            <ul className="space-y-1">
              {popupAnswers.map((a, i) => <li key={i} className={`text-sm ${i === 0 ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{a}</li>)}
            </ul>
            <button onClick={()=>setPopupAnswers(null)} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 w-full">Close</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
          {isAdminView
            ? <span className="text-sm text-gray-500"></span>
            : <span className="text-sm text-gray-500">{displayName || ''}</span>
          }
          <div className="flex gap-2">
            {isAdminView ? (
              <>
                <button onClick={onAdminDashboard} className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium text-sm"><Settings size={16}/> Admin Dashboard</button>
                {onLogout && <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"><LogOut size={16}/> Log Out</button>}
              </>
            ) : (
              <>
                <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">Scoreboards</button>
                <button onClick={onQuizzes} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Quizzes</button>
                {onLogout && <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"><LogOut size={16}/> Log Out</button>}
              </>
            )}
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">{quiz.title}</h1>
          <p className="text-gray-500 mt-1">
            {quiz.category} · Closed {results.posted_at ? new Date(results.posted_at).toLocaleDateString() : ''} · {totalUsers} participant{totalUsers !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="px-5 py-3 bg-gray-100 border-b">
          <h2 className="font-bold text-gray-700">Leaderboard</h2>
          {isAdminView && <p className="text-xs text-gray-500 mt-0.5">Click any row to view that player's answers.</p>}
        </div>
        <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
          <div className="col-span-1">#</div>
          <div className={quiz.type==='datadash' ? 'col-span-9' : 'col-span-7'}>Player</div>
          {quiz.type!=='datadash' && <div className="col-span-2 text-center">Correct</div>}
          <div className="col-span-2 text-right">Points</div>
        </div>
        {withRanks.map((u, i) => {
          const isMe = !isAdminView && u.user_id === currentUser?.id;
          const isFirst = u.rank === 1;
          const isSelected = isAdminView && u.user_id === selectedUserId;
          return (
            <div
              key={i}
              onClick={isAdminView ? () => setSelectedUserId(prev => prev === u.user_id ? null : u.user_id) : undefined}
              className={`grid grid-cols-12 px-4 py-3 border-b last:border-b-0 items-center
                ${isAdminView ? 'cursor-pointer hover:bg-blue-50' : ''}
                ${isSelected ? 'bg-blue-100' : isMe ? 'bg-green-50' : 'bg-white'}`}
            >
              <div className={`col-span-1 text-sm ${isFirst ? 'font-bold' : 'text-gray-500'}`}>{u.rank}</div>
              <div className={`${quiz.type==='datadash'?'col-span-9':'col-span-7'} text-sm ${isFirst ? 'font-bold' : ''} ${isMe ? 'text-green-800' : isSelected ? 'text-blue-800' : 'text-gray-800'}`}>
                {u.display_name}{isMe ? ' (you)' : ''}
              </div>
              {quiz.type!=='datadash' && <div className={`col-span-2 text-center text-sm ${isFirst ? 'font-bold' : 'text-gray-600'}`}>{u.questionsCorrect}</div>}
              <div className={`col-span-2 text-right text-sm ${isFirst ? 'font-bold' : 'text-gray-600'}`}>{u.score}</div>
            </div>
          );
        })}
      </div>

      {/* Admin: selected user's answer drill-down */}
      {isAdminView && selectedUserId && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="px-5 py-3 bg-gray-100 border-b flex justify-between items-center">
            <div>
              <h2 className="font-bold text-gray-700">{selectedUserName}'s Answers</h2>
              {Object.keys(selectedAttempt?.token_assignments || {}).length > 0 && <p className="text-xs text-gray-500 mt-0.5">Token icons show assignments.</p>}
            </div>
            <button onClick={()=>setSelectedUserId(null)} className="text-gray-400 hover:text-gray-600 text-xs font-medium">Close ✕</button>
          </div>
          {!selectedAttempt ? (
            <p className="px-5 py-4 text-sm text-gray-500 italic">No submitted attempt found for this user.</p>
          ) : (
            questions.map((q, i) => {
              const correct = isCorrectForAnswers(q, i, selectedAnswers);
              const tokenMap = selectedAttempt.token_assignments || {};
              const doublesArr = selectedAttempt.doubles || [];
              const token = tokenMap[i] || (doublesArr.includes(i) ? 'doubler' : null);
              const pts = pointValues[i] || 0;
              const totalAttempts = withRanks.length;
              let earnedPts = 0;
              let tokenLabel = null;
              if (token === 'doubler') {
                earnedPts = correct ? Math.round(pts * 2 * 10) / 10 : 0;
                if (correct) tokenLabel = 'doubler';
              } else if (token === 'insurance') {
                earnedPts = correct ? pts : Math.round(pts / 2 * 10) / 10;
                if (!correct) tokenLabel = 'insurance';
              } else if (token === 'sniper') {
                earnedPts = correct ? SNIPER_POINTS : 0;
                if (correct) tokenLabel = 'sniper';
              } else if (token === 'parasite') {
                earnedPts = totalAttempts > 0 ? Math.round((correctCounts[i] * pts / totalAttempts) * 10) / 10 : 0;
                tokenLabel = 'parasite';
              } else {
                earnedPts = correct ? pts : 0;
              }
              const rawText = getRawQuestionText(q);
              const answerDisplay = getAnswerDisplayForAnswers(q, i, selectedAnswers);
              const correctDisplay = getCorrectDisplay(q);
              return (
                <div key={i} className={`border-b last:border-b-0 ${correct ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="grid grid-cols-3 gap-4 p-4">
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1 font-mono flex items-center gap-1">
                        {i+1}. {token && TOKEN_CONFIG[token] && <span title={TOKEN_CONFIG[token].description}>{TOKEN_CONFIG[token].svgIcon(16)}</span>} {rawText}
                      </p>
                      <p className="text-xs text-gray-600"><span className="font-semibold">Correct Answer:</span> {correctDisplay}</p>
                      <p className={`text-xs mt-0.5 ${correct ? 'text-green-700' : 'text-red-600'}`}><span className="font-semibold">Their Answer:</span> {answerDisplay}</p>
                    </div>
                    <div className="col-span-1 text-right text-xs text-gray-600 space-y-1">
                      <p>Value: <span className="font-semibold">{pts} pts</span></p>
                      <p className={`font-semibold ${correct || token === 'insurance' ? 'text-green-700' : 'text-red-600'}`}>
                        {earnedPts} pts{tokenLabel ? ` (${tokenLabel})` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* User: per-question breakdown */}
      {!isAdminView && myAttempt && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-5 py-3 bg-gray-100 border-b">
            <h2 className="font-bold text-gray-700">Your Results</h2>
          </div>
          {questions.map((q, i) => {
            const correct = isCorrect(q, i);
            const myTokenMap = myAttempt.token_assignments || {};
            const myDoublesArr = myDoubles || [];
            const token = myTokenMap[i] || (myDoublesArr.includes(i) ? 'doubler' : null);
            const pts = pointValues[i] || 0;
            const totalUsers2 = totalUsers;
            let myPts = 0;
            let tokenLabel = null;
            if (token === 'doubler') {
              myPts = correct ? Math.round(pts * 2 * 10) / 10 : 0;
              if (correct) tokenLabel = 'doubler';
            } else if (token === 'insurance') {
              myPts = correct ? pts : Math.round(pts / 2 * 10) / 10;
              if (!correct) tokenLabel = 'insurance';
            } else if (token === 'sniper') {
              myPts = correct ? SNIPER_POINTS : 0;
              if (correct) tokenLabel = 'sniper';
            } else if (token === 'parasite') {
              myPts = totalUsers2 > 0 ? Math.round((correctCounts[i] * pts / totalUsers2) * 10) / 10 : 0;
              tokenLabel = 'parasite';
            } else {
              myPts = correct ? pts : 0;
            }
            // ── Data Dash: show difference and per-question score ──────────
            if (quiz.type === 'datadash') {
              const myRawAnswer = (myAnswers[i] || '').toString().replace(/,/g,'').trim();
              const myNumVal = parseFloat(myRawAnswer);
              const diff = isNaN(myNumVal) ? 'N/A' : Math.abs(myNumVal - q.correctAnswer);
              const ddPts = results.scores?.ddPointsByUser?.[currentUser?.id]?.[i] ?? pts;
              return (
                <div key={i} className="border-b last:border-b-0 bg-white">
                  <div className="grid grid-cols-3 gap-4 p-4">
                    <div className="col-span-2">
                      <p className="text-sm text-gray-800 mb-2 flex items-center gap-1 flex-wrap">
                        <span>{i+1}.</span>
                        {token && TOKEN_CONFIG[token] && <span title={TOKEN_CONFIG[token].description}>{TOKEN_CONFIG[token].svgIcon(20)}</span>}
                        <span>{q.prompt}</span>
                      </p>
                      <p className="text-xs text-gray-600"><span className="font-semibold">Correct Answer:</span> {q.correctAnswer?.toLocaleString()}</p>
                      <p className="text-xs text-gray-600 mt-0.5"><span className="font-semibold">Your Answer:</span> {myRawAnswer || '—'}</p>
                      <p className="text-xs text-gray-500 mt-0.5"><span className="font-semibold">Difference:</span> {typeof diff === 'number' ? diff.toLocaleString() : diff}</p>
                    </div>
                    <div className="col-span-1 text-right text-xs text-gray-600 space-y-1">
                      <p className="font-semibold text-gray-800">{ddPts} pts{tokenLabel ? ` (${tokenLabel})` : ''}</p>
                    </div>
                  </div>
                </div>
              );
            }
            const qtype = quiz.type === 'combination' ? q.questionType : quiz.type;
            const hasOtherAnswers = (qtype === 'OR' || qtype === 'openresponse') && q.showOthersCount && q.acceptedAnswers?.length > 1;
            return (
              <div key={i} className={`border-b last:border-b-0 ${correct ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="grid grid-cols-3 gap-4 p-4">
                  <div className="col-span-2">
                    <p className="text-sm text-gray-800 mb-2 flex items-center gap-1 flex-wrap">
                      <span>{i+1}.</span>
                      {token && TOKEN_CONFIG[token] && <span title={TOKEN_CONFIG[token].description}>{TOKEN_CONFIG[token].svgIcon(20)}</span>}
                      <span>{getFullQuestion(q, i, myAnswers)}</span>
                    </p>
                    <p className="text-xs text-gray-600"><span className="font-semibold">Correct Answer:</span> {getCorrectDisplay(q)}{hasOtherAnswers && <button onClick={()=>setPopupAnswers(q.acceptedAnswers)} className="ml-2 text-blue-500 underline text-xs">and {q.acceptedAnswers.length - 1} other{q.acceptedAnswers.length > 2 ? 's' : ''}</button>}</p>
                    <p className={`text-xs mt-1 ${correct ? 'text-green-700' : 'text-red-600'}`}><span className="font-semibold">Your Answer:</span> {getMyAnswerDisplay(q, i)}</p>
                  </div>
                  <div className="col-span-1 text-right text-xs text-gray-600 space-y-1">
                    <p><span className="font-semibold">{correctCounts?.[i] ?? '—'}/{totalUsers}</span> Correct</p>
                    <p>Question Value: <span className="font-semibold">{pts} pts</span></p>
                    <p className={`font-semibold ${correct || token === 'insurance' ? 'text-green-700' : 'text-red-600'}`}>
                      Your Score: {myPts} pts{tokenLabel ? ` (${tokenLabel})` : ''}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SeasonScoreboardScreen = ({ seasonName, currentUser, displayName, allQuizData, onBack, onQuizzes, onLogout, isAdminView, onAdminDashboard }) => {
  const [standings, setStandings] = React.useState(null);
  const [quizBreakdown, setQuizBreakdown] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedUserId, setSelectedUserId] = React.useState(null);
  const [allBreakdowns, setAllBreakdowns] = React.useState({}); // user_id -> breakdown array (admin)

  React.useEffect(() => {
    const fetchStandings = supabase
      .from('season_standings')
      .select('standings')
      .eq('season', seasonName)
      .single();

    const fetchSeasonQuizzes = supabase
      .from('quizzes')
      .select('quiz_key, title')
      .eq('category', seasonName)
      .eq('status', 'Scored');

    Promise.all([fetchStandings, fetchSeasonQuizzes]).then(async ([{ data: sData }, { data: quizRows }]) => {
      setStandings(sData?.standings || []);

      if (quizRows && quizRows.length > 0) {
        const keys = quizRows.map(r => r.quiz_key);
        const { data: results } = await supabase
          .from('quiz_results')
          .select('quiz_key, scores')
          .in('quiz_key', keys);

        // Helper: build breakdown for a given user_id
        const buildBreakdown = (userId) => {
          return (results || []).map(r => {
            const quizTitle = quizRows.find(q => q.quiz_key === r.quiz_key)?.title || r.quiz_key;
            const userScores = r.scores?.userScores || [];
            const n = userScores.length;
            if (n === 0) return null;
            const sorted = [...userScores].sort((a, b) => b.score - a.score);
            // Find user's score and position
            const userEntry = userScores.find(u => u.user_id === userId);
            if (!userEntry) return null;
            let position = 1;
            for (let k = 0; k < sorted.length; k++) {
              if (sorted[k].score > userEntry.score) position++;
            }
            return { quiz_key: r.quiz_key, quizTitle, position, totalParticipants: n, seasonPts: userEntry.score };
          }).filter(Boolean).sort((a, b) => a.quizTitle.localeCompare(b.quizTitle));
        };

        if (isAdminView) {
          // Pre-build breakdowns for all users in standings
          const allUsers = sData?.standings || [];
          const breakdowns = {};
          allUsers.forEach(u => { breakdowns[u.user_id] = buildBreakdown(u.user_id); });
          setAllBreakdowns(breakdowns);
        } else if (currentUser) {
          setQuizBreakdown(buildBreakdown(currentUser.id));
        }
      }

      setLoading(false);
    });
  }, [seasonName]);

  if (loading) return (
    <div className="max-w-3xl mx-auto p-6 flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Loading season scoreboard...</p>
    </div>
  );

  // Build ranked standings with ties
  const ranked = [];
  let rank = 1;
  (standings || []).forEach((u, i) => {
    if (i > 0 && standings[i].seasonPoints === standings[i - 1].seasonPoints) {
      ranked.push({ ...u, rank: ranked[i - 1].rank });
    } else {
      ranked.push({ ...u, rank });
    }
    rank = i + 2;
  });

  const selectedUserName = selectedUserId ? (ranked.find(u => u.user_id === selectedUserId)?.display_name || selectedUserId) : null;
  const selectedBreakdown = isAdminView && selectedUserId ? (allBreakdowns[selectedUserId] || []) : [];

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span className="text-sm text-gray-500">{displayName || ''}</span>
          <div className="flex gap-2">
            {isAdminView ? (
              <>
                <button onClick={onAdminDashboard} className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium text-sm"><Settings size={16}/> Admin Dashboard</button>
                {onLogout && <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"><LogOut size={16}/> Log Out</button>}
              </>
            ) : (
              <>
                <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">Scoreboards</button>
                <button onClick={onQuizzes} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Quizzes</button>
                {onLogout && <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"><LogOut size={16}/> Log Out</button>}
              </>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">{seasonName}</h1>
          <p className="text-gray-500 mt-1">Season Standings</p>
        </div>
      </div>

      {/* Leaderboard */}
      {ranked.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500 mb-6">No scored quizzes in this season yet.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="px-5 py-3 bg-gray-100 border-b">
            <h2 className="font-bold text-gray-700">Leaderboard</h2>
            {isAdminView && <p className="text-xs text-gray-500 mt-0.5">Click any row to view that player's quiz breakdown.</p>}
          </div>
          <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
            <div className="col-span-1">#</div>
            <div className="col-span-9">Player</div>
            <div className="col-span-2 text-right">Points</div>
          </div>
          {ranked.map((u, i) => {
            const isMe = !isAdminView && u.user_id === currentUser?.id;
            const isSelected = isAdminView && u.user_id === selectedUserId;
            const isFirst = u.rank === 1;
            return (
              <div
                key={i}
                onClick={isAdminView ? () => setSelectedUserId(prev => prev === u.user_id ? null : u.user_id) : undefined}
                className={`grid grid-cols-12 px-4 py-3 border-b last:border-b-0 items-center
                  ${isAdminView ? 'cursor-pointer hover:bg-blue-50' : ''}
                  ${isSelected ? 'bg-blue-100' : isMe ? 'bg-green-50' : 'bg-white'}`}
              >
                <div className={`col-span-1 text-sm ${isFirst ? 'font-bold' : 'text-gray-500'}`}>{u.rank}</div>
                <div className={`col-span-9 text-sm ${isFirst ? 'font-bold' : ''} ${isMe ? 'text-green-800' : isSelected ? 'text-blue-800' : 'text-gray-800'}`}>
                  {u.display_name}{isMe ? ' (you)' : ''}
                </div>
                <div className={`col-span-2 text-right text-sm ${isFirst ? 'font-bold' : 'text-gray-600'}`}>{u.seasonPoints}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin: selected user's quiz breakdown */}
      {isAdminView && selectedUserId && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="px-5 py-3 bg-gray-100 border-b flex justify-between items-center">
            <h2 className="font-bold text-gray-700">{selectedUserName}'s Season Breakdown</h2>
            <button onClick={() => setSelectedUserId(null)} className="text-gray-400 hover:text-gray-600 text-xs font-medium">Close ✕</button>
          </div>
          {selectedBreakdown.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-500 italic">No quiz data found for this user.</p>
          ) : (
            <>
              <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
                <div className="col-span-6">Quiz</div>
                <div className="col-span-4 text-center">Finish</div>
                <div className="col-span-2 text-right">Points</div>
              </div>
              {selectedBreakdown.map((item, i) => (
                <div key={item.quiz_key} className={`grid grid-cols-12 px-4 py-3 border-b last:border-b-0 items-center ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="col-span-6 text-sm text-gray-800 font-medium">{item.quizTitle}</div>
                  <div className="col-span-4 text-center text-sm text-gray-600">{ordinal(item.position)} of {item.totalParticipants}</div>
                  <div className="col-span-2 text-right text-sm font-semibold text-green-700">{item.seasonPts} pts</div>
                </div>
              ))}
              <div className="grid grid-cols-12 px-4 py-3 bg-gray-100 border-t items-center">
                <div className="col-span-10 text-sm font-semibold text-gray-700">Total Season Points</div>
                <div className="col-span-2 text-right text-sm font-bold text-green-700">
                  {Math.round(selectedBreakdown.reduce((s, item) => s + item.seasonPts, 0) * 10) / 10} pts
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* User: per-quiz breakdown */}
      {!isAdminView && currentUser && quizBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-5 py-3 bg-gray-100 border-b">
            <h2 className="font-bold text-gray-700">Your Results</h2>
          </div>
          <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase">
            <div className="col-span-6">Quiz</div>
            <div className="col-span-4 text-center">Your Finish</div>
            <div className="col-span-2 text-right">Points</div>
          </div>
          {quizBreakdown.map((item, i) => (
            <div key={item.quiz_key} className={`grid grid-cols-12 px-4 py-3 border-b last:border-b-0 items-center ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
              <div className="col-span-6 text-sm text-gray-800 font-medium">{item.quizTitle}</div>
              <div className="col-span-4 text-center text-sm text-gray-600">{ordinal(item.position)} of {item.totalParticipants}</div>
              <div className="col-span-2 text-right text-sm font-semibold text-green-700">{item.seasonPts} pts</div>
            </div>
          ))}
          <div className="grid grid-cols-12 px-4 py-3 bg-gray-100 border-t items-center">
            <div className="col-span-10 text-sm font-semibold text-gray-700">Total Season Points</div>
            <div className="col-span-2 text-right text-sm font-bold text-green-700">
              {Math.round(quizBreakdown.reduce((s, item) => s + item.seasonPts, 0) * 10) / 10} pts
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QuizApp = () => {
  const [mode, setMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(null); // 'setup' | 'scoreboards' | 'summary' | null
  const [notifyNewQuiz, setNotifyNewQuiz] = useState(false);
  const [notifyScored, setNotifyScored] = useState(false);
  const [savedNotifyNewQuiz, setSavedNotifyNewQuiz] = useState(false);
  const [savedNotifyScored, setSavedNotifyScored] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [knownQuizzes, setKnownQuizzes] = useState({ quizzes: [] });
  const [allQuizData, setAllQuizData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    // Restore session on page load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        await fetchUserData(session.user);
        setMode('setup');
      }
    });
    // Load quizzes from Supabase
    supabase.from('quizzes').select('*')
      .then(({ data, error }) => {
        if (error || !data) { setLoadError('Could not load quiz data.'); setIsLoading(false); return; }
        const keys = data.map(q => q.quiz_key);
        setKnownQuizzes({ quizzes: keys });
        const m = {};
        data.forEach(q => { m[q.quiz_key] = { ...q.data, status: q.status, title: q.title, category: q.category, type: q.type }; });
        setAllQuizData(m); setIsLoading(false);
      });
  }, []);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedQuizKey, setSelectedQuizKey] = useState('');
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [othersPopupQuestion, setOthersPopupQuestion] = useState(null);
  const [showNewQuizConfirm, setShowNewQuizConfirm] = useState(false);
  const [adminSection, setAdminSection] = useState('list');
  const [auditQuizKey, setAuditQuizKey] = useState('');
  const [auditSeason, setAuditSeason] = useState('');
  const [auditExpandedUser, setAuditExpandedUser] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [newQuizTypeSelector, setNewQuizTypeSelector] = useState('openresponse');
  const [editingKey, setEditingKey] = useState(null);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizKey, setNewQuizKey] = useState('');
  const [newQuizCategory, setNewQuizCategory] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newQuizStatus, setNewQuizStatus] = useState('Inactive');
  const [newQuizAuthorNote, setNewQuizAuthorNote] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSaving, setUserSaving] = useState({});
  const [userDeleting, setUserDeleting] = useState({});
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserSaving, setNewUserSaving] = useState(false);
  const [userMsg, setUserMsg] = useState('');
  const [newQuizType, setNewQuizType] = useState('fillintheblank');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportContent, setExportContent] = useState('');
  const [exportFilename, setExportFilename] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [viewScoringKey, setViewScoringKey] = useState(null);
  const [viewSeasonName, setViewSeasonName] = useState(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(null);
  const [adminSeasonFilter, setAdminSeasonFilter] = useState('All');
  const [adminStatusFilter, setAdminStatusFilter] = useState({ Active: true, Inactive: true, Scored: true });
  const [newSentenceInput, setNewSentenceInput] = useState('');
  const [newQuizSentences, setNewQuizSentences] = useState([]);
  const [extraWordInput, setExtraWordInput] = useState('');
  const [extraWords, setExtraWords] = useState([]);
  const [mcQuestions, setMcQuestions] = useState([emptyMCQuestion()]);
  const [mcCurrentIndex, setMcCurrentIndex] = useState(0);
  const [mcRandomizeQuestions, setMcRandomizeQuestions] = useState(false);
  const [orQuestions, setOrQuestions] = useState([emptyORQuestion()]);
  const [orCurrentIndex, setOrCurrentIndex] = useState(0);
  const [orRandomizeQuestions, setOrRandomizeQuestions] = useState(false);
  const [orAnswerInput, setOrAnswerInput] = useState('');
  const [ddQuestions, setDdQuestions] = useState([emptyDDQuestion()]);
  const [ddCurrentIndex, setDdCurrentIndex] = useState(0);
  const [ddAnswerInput, setDdAnswerInput] = useState('');
  const [combQuestions, setCombQuestions] = useState([]);
  const [combCurrentIndex, setCombCurrentIndex] = useState(null);
  const [combNewQType, setCombNewQType] = useState('MC');
  const [combOrAnswerInput, setCombOrAnswerInput] = useState('');
  const [showQuestionSummary, setShowQuestionSummary] = useState(false);
  const DEFAULT_TOKEN_SLOTS = ['doubler','doubler','doubler','none','none','none'];
  const [newQuizTokenSlots, setNewQuizTokenSlots] = useState([...DEFAULT_TOKEN_SLOTS]);
  const [newQuizClosingDate, setNewQuizClosingDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [combDraft, setCombDraft] = useState(null);
  const [userAttempts, setUserAttempts] = useState({});
  const [displayName, setDisplayName] = useState('');
  const [currentAttemptId, setCurrentAttemptId] = useState(null);

  const activeQuizKeys = knownQuizzes.quizzes.filter(key => (allQuizData[key]?.status || 'Active') === 'Active');
  const allCategories = Array.from(new Set(activeQuizKeys.map(key => allQuizData[key]?.category).filter(Boolean))).sort((a,b) => a.localeCompare(b));
  const allCategoriesAdmin = Array.from(new Set(Object.values(allQuizData).map(q => q.category).filter(Boolean))).sort((a,b) => a.localeCompare(b));
  const quizzesInCategory = selectedCategory ? activeQuizKeys.filter(key => allQuizData[key]?.category === selectedCategory).sort((a, b) => {
    const dateA = allQuizData[a]?.closingDate;
    const dateB = allQuizData[b]?.closingDate;
    if (!dateA && !dateB) return (allQuizData[a]?.title||'').localeCompare(allQuizData[b]?.title||'');
    if (!dateA) return 1;
    if (!dateB) return -1;
    const parse = d => { const [m,day,y] = d.split('/'); return new Date(y, m-1, day); };
    return parse(dateA) - parse(dateB);
  }) : [];

  const handleCategoryChange = (cat) => { setSelectedCategory(cat); setSelectedQuizKey(''); };

  const prepareActiveQuestions = (quiz) => {
    if (quiz.type === 'MC') {
      return [...quiz.questions].map(q => ({ ...q, displayOptions: q.options.map((opt,i) => ({ opt, correct: q.correctIndices.includes(i) })).filter(o => o.opt.trim() !== '') }));
    }
    if (quiz.type === 'openresponse') return [...quiz.questions];
    if (quiz.type === 'datadash') return [...quiz.questions];
    if (quiz.type === 'combination') return quiz.questions.map(q => {
      if (q.questionType === 'MC') {
        return { ...q, displayOptions: q.options.map((opt,i) => ({ opt, correct: q.correctIndices.includes(i) })).filter(o => o.opt.trim() !== '') };
      }
      return q;
    });
    return [...quiz.sentences];
  };

  const loadQuiz = async () => {
    if (!selectedQuizKey) return;
    const quiz = allQuizData[selectedQuizKey];
    if (!quiz) return;
    const existing = userAttempts[selectedQuizKey];
    if (existing?.status === 'submitted') return;
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    const preparedQs = prepareActiveQuestions(quiz);
    setActiveQuestions(preparedQs);
    if (existing) {
      const { data: freshAttempt } = await supabase.from('quiz_attempts').select('*').eq('id', existing.id).single();
      setStudentAnswers(freshAttempt?.answers || {});
      setDoubleSelections(freshAttempt?.doubles || []);
      setTokenAssignments(freshAttempt?.token_assignments || {});
      setCurrentAttemptId(existing.id);
    } else {
      setStudentAnswers({});
      setDoubleSelections([]);
      setTokenAssignments({});
      const { data } = await supabase.from('quiz_attempts').insert({ user_id: currentUser.id, quiz_key: selectedQuizKey, status: 'in_progress', answers: {} }).select().single();
      if (data) {
        setCurrentAttemptId(data.id);
        setUserAttempts(p => ({ ...p, [selectedQuizKey]: data }));
      }
    }
    setMode(quiz.authorNote?.trim() ? 'authornote' : 'assessment');
  };

  useEffect(() => { if (adminSection === 'users') loadUsers(); }, [adminSection]);

  const usedWords = Object.values(studentAnswers);
  const selectWord = (word) => {
    const cur = studentAnswers[currentQuestionIndex];
    if (cur === word) { const u = {...studentAnswers}; delete u[currentQuestionIndex]; setStudentAnswers(u); }
    else { const u = {...studentAnswers}; const prev = Object.keys(u).find(k => u[k] === word); if (prev !== undefined) delete u[prev]; u[currentQuestionIndex] = word; setStudentAnswers(u); }
  };
  const toggleMCAnswer = (qi, optText) => {
    const cur = studentAnswers[qi] || [];
    setStudentAnswers(p => ({ ...p, [qi]: cur.includes(optText) ? cur.filter(a => a !== optText) : [...cur, optText] }));
  };
  const goToQuestion = (delta) => { const t = activeQuestions.length; setCurrentQuestionIndex((currentQuestionIndex + t + delta) % t); };
  const [doubleSelections, setDoubleSelections] = useState([]);
  const [tokenAssignments, setTokenAssignments] = useState({}); // { questionIndex: tokenType }
  const [tapSelected, setTapSelected] = useState(null); // { tokenType, fromQuestion: number|null, instanceId: string }
  const DOUBLES_ALLOWED = (activeQuiz?.tokenSlots || ['doubler','doubler','doubler']).filter(t => t === 'doubler').length;
  const [disputedQuestions, setDisputedQuestions] = useState({});
  const [disputeReasons, setDisputeReasons] = useState({});
  const [submittedDisputes, setSubmittedDisputes] = useState([]);
  const [disputeSending, setDisputeSending] = useState(false);

  const toggleDouble = (i) => {
    setDoubleSelections(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : prev.length < DOUBLES_ALLOWED ? [...prev, i] : prev
    );
  };

  const isDashQuiz = activeQuiz?.type === 'datadash';

  const getAnswerDisplay = (q, i) => {
    const qtype = activeQuiz?.type === 'combination' ? q.questionType : activeQuiz?.type;
    const ans = studentAnswers[i];
    if (qtype === 'MC') {
      const sel = ans || [];
      if (!sel.length) return '—';
      const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return sel.map(optText => {
        const idx = (q.displayOptions || []).findIndex(o => o.opt === optText);
        return `${idx >= 0 ? labels[idx]+'. ' : ''}${optText}`;
      }).join(', ');
    }
    return ans || '—';
  };

  const getPromptPreview = (q) => {
    const raw = q.prompt || q.text || '';
    const cleaned = raw.replace(/\{\{[^}]+\}\}/g, '').replace(/\[[^\]]+\]/g, '____').trim();
    return cleaned.length > 90 ? cleaned.slice(0, 90) + '…' : cleaned;
  };

  const submitQuiz = () => { setMode('summary'); };

  const saveProgress = async () => {
    if (!currentAttemptId || !currentUser) return;
    const doubles = Object.entries(tokenAssignments).filter(([,t])=>t==='doubler').map(([i])=>Number(i));
    const { error } = await supabase.from('quiz_attempts').update({ answers: studentAnswers, doubles, token_assignments: tokenAssignments }).eq('id', currentAttemptId);
    if (error) console.log('saveProgress error:', error);
  };

  const handleFinalSubmission = async () => {
    if (currentAttemptId) {
      const now = new Date().toISOString();
      const doubles = Object.entries(tokenAssignments).filter(([,t])=>t==='doubler').map(([i])=>Number(i));
      await supabase.from('quiz_attempts').update({
        status: 'submitted', answers: studentAnswers, submitted_at: now, doubles, token_assignments: tokenAssignments
      }).eq('id', currentAttemptId);
      setUserAttempts(p => ({ ...p, [selectedQuizKey]: { ...p[selectedQuizKey], status: 'submitted' } }));
    }
    setMode('submitted');
  };

  const getScore = () => {
    if (!activeQuiz) return { correct: 0, total: 0 };
    let correct = 0;
    activeQuestions.forEach((q, i) => {
      const qtype = activeQuiz.type === 'combination' ? q.questionType : activeQuiz.type;
      if (qtype === 'MC') {
        const sel = studentAnswers[i] || [];
        const correctOpts = q.displayOptions.filter(o=>o.correct).map(o=>o.opt);
        if (sel.length === correctOpts.length && correctOpts.every(o => sel.includes(o))) correct++;
      } else if (qtype === 'OR' || qtype === 'openresponse') {
        const ans = normalizeAnswer(studentAnswers[i] || '');
        if (ans && q.acceptedAnswers.some(a => normalizeAnswer(a) === ans)) correct++;
      } else {
        if (studentAnswers[i] === parseSentence(q.text).answer) correct++;
      }
    });
    return { correct, total: activeQuestions.length };
  };

  const isQuestionCorrect = (q, i) => {
    if (activeQuiz?.type === 'datadash') return true; // no correct/incorrect for datadash
    const qtype = activeQuiz?.type === 'combination' ? q.questionType : activeQuiz?.type;
    if (qtype === 'MC') {
      const sel = studentAnswers[i] || [];
      const correctOpts = q.displayOptions.filter(o=>o.correct).map(o=>o.opt);
      return sel.length === correctOpts.length && correctOpts.every(o => sel.includes(o));
    } else if (qtype === 'OR' || qtype === 'openresponse') {
      const ans = normalizeAnswer(studentAnswers[i] || '');
      return ans !== '' && q.acceptedAnswers.some(a => normalizeAnswer(a) === ans);
    } else {
      return studentAnswers[i] === parseSentence(q.text).answer;
    }
  };

  const getCorrectAnswerDisplay = (q) => {
    if (activeQuiz?.type === 'datadash') return q.correctAnswer?.toLocaleString() ?? '—';
    const qtype = activeQuiz?.type === 'combination' ? q.questionType : activeQuiz?.type;
    if (qtype === 'MC') {
      const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return q.displayOptions.filter(o=>o.correct).map(o => {
        const idx = q.displayOptions.findIndex(d=>d.opt===o.opt);
        return `${labels[idx]}. ${o.opt}`;
      }).join(', ');
    } else if (qtype === 'OR' || qtype === 'openresponse') {
      return q.acceptedAnswers[q.primaryAnswerIndex ?? 0] || q.acceptedAnswers[0] || '';
    } else {
      return parseSentence(q.text).answer;
    }
  };

  const handleSendDisputes = async () => {
    setDisputeSending(true);
    const disputeList = Object.keys(disputedQuestions).filter(i => disputedQuestions[i]);
    const disputeText = disputeList.map(i => {
      const q = activeQuestions[parseInt(i)];
      const reason = disputeReasons[i] || '(no reason given)';
      return `Q${parseInt(i)+1}: ${getPromptPreview(q)}\nYour answer: ${getAnswerDisplay(q, parseInt(i))}\nCorrect answer: ${getCorrectAnswerDisplay(q)}\nReason: ${reason}`;
    }).join('\n\n');
    try {
      await window.emailjs.send('service_u91y3sw', 'template_dcdqon6', {
        display_name: displayName || currentUser?.email,
        quiz_title: activeQuiz?.title,
        disputes: disputeText,
      }, '0k_9ewelPuyyBY1HX');
      setSubmittedDisputes(prev => [...prev, ...disputeList.map(Number)]);
      setDisputedQuestions({});
      setDisputeReasons({});
    } catch(e) {
      alert('Could not send disputes. Please try again or email doubleuptrivia@gmail.com directly.');
    }
    setDisputeSending(false);
  };

  const handleDeleteQuiz = async (key) => {
    await supabase.from('quiz_attempts').delete().eq('quiz_key', key);
    await supabase.from('quiz_results').delete().eq('quiz_key', key);
    await supabase.from('quizzes').delete().eq('quiz_key', key);
    setAllQuizData(p => { const n = {...p}; delete n[key]; return n; });
    setKnownQuizzes(p => ({ quizzes: p.quizzes.filter(k => k !== key) }));
    setConfirmDeleteKey(null);
  };

  const fetchUserData = async (user) => {
    const { data: profile } = await supabase.from('profiles').select('display_name, email').eq('user_id', user.id).single();
    if (profile) {
      setDisplayName(profile.display_name || profile.email || user.email || '');
    } else {
      setDisplayName(user.email || '');
    }
    const { data: attempts } = await supabase.from('quiz_attempts').select('*').eq('user_id', user.id);
    if (attempts) {
      const map = {};
      attempts.forEach(a => { map[a.quiz_key] = a; });
      setUserAttempts(map);
    }
  };

  const handleLogin = async () => {
    setLoginError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) { setLoginError('Invalid email or password.'); return; }
    setCurrentUser(data.user);
    await fetchUserData(data.user);
    setMode('setup');
  };

  const saveNotificationSettings = async () => {
    if (!currentUser) return;
    setSettingsSaving(true);
    await supabase.from('profiles').update({
      notify_new_quiz: notifyNewQuiz,
      notify_scored: notifyScored,
    }).eq('user_id', currentUser.id);
    setSavedNotifyNewQuiz(notifyNewQuiz);
    setSavedNotifyScored(notifyScored);
    setSettingsSaving(false);
    setShowSettingsModal(false);
  };

    const handleLogout = async () => {
    await saveProgress();
    await supabase.auth.signOut();
    setCurrentUser(null);
    setDisplayName('');
    setUserAttempts({});
    setCurrentAttemptId(null);
    setLoginEmail('');
    setLoginPassword('');
    setMode('login');
  };

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) return;
    setForgotSending(true);
    try {
      await window.emailjs.send('service_u91y3sw', 'template_mrur50g', {
        user_email: forgotEmail.trim(),
        to_email: 'doubleuptrivia@gmail.com',
      }, '0k_9ewelPuyyBY1HX');
      setForgotSent(true);
    } catch(e) {
      alert('Could not send request. Please email doubleuptrivia@gmail.com directly.');
    }
    setForgotSending(false);
  };

  const adminLogin = () => {
    if (adminUsername === 'doubleuptrivia@gmail.com' && adminPassword === 'doubleup1000') { setIsAdminAuthenticated(true); setLoginError(''); }
    else setLoginError('Invalid username or password.');
  };
  const adminLogout = () => { setIsAdminAuthenticated(false); setAdminUsername(''); setAdminPassword(''); setMode('login'); };

  const loadUsers = async () => {
    setUsersLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('display_name');
    setUsers(data || []);
    setUsersLoading(false);
  };

  const saveUser = async (u) => {
    setUserSaving(p => ({ ...p, [u.user_id]: true }));
    await supabase.from('profiles').update({ display_name: u.display_name, email: u.email, password: u.password }).eq('user_id', u.user_id);
    setUserSaving(p => ({ ...p, [u.user_id]: false }));
    setUserMsg('Saved!'); setTimeout(() => setUserMsg(''), 2000);
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete ${u.display_name || u.email}? This will remove all their quiz attempts.`)) return;
    setUserDeleting(p => ({ ...p, [u.user_id]: true }));
    await supabase.from('quiz_attempts').delete().eq('user_id', u.user_id);
    await supabase.from('profiles').delete().eq('user_id', u.user_id);
    setUsers(p => p.filter(x => x.user_id !== u.user_id));
    setUserDeleting(p => ({ ...p, [u.user_id]: false }));
  };

  const addUser = async () => {
    if (!newUserEmail.trim() || !newUserPassword.trim() || !newUserDisplayName.trim()) { setUserMsg('All fields are required.'); setTimeout(() => setUserMsg(''), 3000); return; }
    setNewUserSaving(true);
    const { data, error } = await supabase.auth.signUp({ email: newUserEmail.trim(), password: newUserPassword.trim() });
    if (error || !data?.user) { setUserMsg('Error: ' + (error?.message || 'unknown')); setTimeout(() => setUserMsg(''), 4000); setNewUserSaving(false); return; }
    await supabase.from('profiles').insert({ user_id: data.user.id, email: newUserEmail.trim(), display_name: newUserDisplayName.trim(), password: newUserPassword.trim() });
    setNewUserEmail(''); setNewUserPassword(''); setNewUserDisplayName(''); setShowAddUser(false);
    setNewUserSaving(false);
    setUserMsg('User added!'); setTimeout(() => setUserMsg(''), 2000);
    loadUsers();
  };

  const resetQuizBuilder = () => {
    setEditingKey(null); setNewQuizTitle(''); setNewQuizKey(''); setNewQuizCategory('');
    setNewCategoryInput(''); setShowNewCategoryInput(false); setNewQuizStatus('Active'); setNewQuizAuthorNote('');
    setNewQuizType('fillintheblank'); setNewSentenceInput(''); setNewQuizSentences([]);
    setNewQuizTokenSlots([...DEFAULT_TOKEN_SLOTS]); setNewQuizClosingDate(''); setShowDatePicker(false); setDatePickerMonth({ year: new Date().getFullYear(), month: new Date().getMonth() });
    setDdQuestions([emptyDDQuestion()]); setDdCurrentIndex(0); setDdAnswerInput('');
    setExtraWords([]); setMcQuestions([emptyMCQuestion()]); setMcCurrentIndex(0); setMcRandomizeQuestions(false);
    setOrQuestions([emptyORQuestion()]); setOrCurrentIndex(0); setOrRandomizeQuestions(false); setOrAnswerInput('');
    setCombQuestions([]); setCombCurrentIndex(null); setCombNewQType('MC'); setCombDraft(null);
    setCombOrAnswerInput(''); setShowQuestionSummary(false);
  };

  const doStartCreateQuiz = () => { resetQuizBuilder(); setNewQuizType(newQuizTypeSelector); setAdminSection('create'); setShowNewQuizConfirm(false); };
  const startCreateQuiz = () => {
    const hasWork = adminSection === 'create' && (
      newQuizSentences.length > 0 || mcQuestions.some(q => q.prompt.trim()) ||
      orQuestions.some(q => q.prompt.trim()) || combQuestions.length > 0 ||
      newQuizTitle.trim() !== ''
    );
    if (hasWork) setShowNewQuizConfirm(true);
    else doStartCreateQuiz();
  };

  const startEditQuiz = (key) => {
    const quiz = allQuizData[key]; if (!quiz) return;
    setEditingKey(key); setNewQuizTitle(quiz.title); setNewQuizKey(key);
    setNewQuizCategory(quiz.category || ''); setNewQuizStatus(quiz.status || 'Active'); setNewQuizAuthorNote(quiz.authorNote || '');
    setNewQuizTokenSlots(quiz.tokenSlots || [...DEFAULT_TOKEN_SLOTS]);
    setNewQuizClosingDate(quiz.closingDate || ''); setShowDatePicker(false);
    if (quiz.closingDate) { const p = quiz.closingDate.split('/'); if (p.length === 3) setDatePickerMonth({ year: parseInt(p[2]), month: parseInt(p[0]) - 1 }); }
    setNewQuizType(quiz.type || 'fillintheblank');
    setShowNewCategoryInput(false); setNewCategoryInput('');
    if (quiz.type === 'MC') {
      setMcQuestions(quiz.questions.map(q=>({...q}))); setMcCurrentIndex(0); setMcRandomizeQuestions(quiz.randomizeQuestions||false);
      setNewQuizSentences([]); setExtraWords([]); setOrQuestions([emptyORQuestion()]); setOrCurrentIndex(0);
      setCombQuestions([]); setCombCurrentIndex(null); setCombDraft(null);
    } else if (quiz.type === 'openresponse') {
      setOrQuestions(quiz.questions.map(q=>({...q}))); setOrCurrentIndex(0); setOrRandomizeQuestions(quiz.randomizeQuestions||false);
      setNewQuizSentences([]); setExtraWords([]); setMcQuestions([emptyMCQuestion()]); setMcCurrentIndex(0);
      setCombQuestions([]); setCombCurrentIndex(null); setCombDraft(null);
    } else if (quiz.type === 'combination') {
      setCombQuestions(quiz.questions.map(q=>({...q}))); setCombCurrentIndex(null); setCombDraft(null);
      setNewQuizSentences([]); setExtraWords([]); setMcQuestions([emptyMCQuestion()]); setOrQuestions([emptyORQuestion()]);
      setDdQuestions([emptyDDQuestion()]); setDdCurrentIndex(0);
    } else if (quiz.type === 'datadash') {
      setDdQuestions(quiz.questions.map(q=>({...q}))); setDdCurrentIndex(0);
      setOrQuestions([emptyORQuestion()]); setMcQuestions([emptyMCQuestion()]); setNewQuizSentences([]); setExtraWords([]);
      setCombQuestions([]); setCombCurrentIndex(null); setCombDraft(null);
    } else {
      setNewQuizSentences(quiz.sentences.map(s=>s.text));
      setExtraWords((quiz.wordBank||[]).filter(w => !extractAnswerWords(quiz.sentences).includes(w)));
      setNewSentenceInput(''); setMcQuestions([emptyMCQuestion()]); setMcCurrentIndex(0);
      setOrQuestions([emptyORQuestion()]); setOrCurrentIndex(0);
      setCombQuestions([]); setCombCurrentIndex(null); setCombDraft(null);
    }
    setAdminSection('create');
  };

  const addSentence = () => {
    const t = newSentenceInput.trim(); if (!t) return;
    if (!t.includes('[') || !t.includes(']')) { alert('Please wrap the answer word in [square brackets].'); return; }
    setNewQuizSentences([...newQuizSentences, t]); setNewSentenceInput('');
  };
  const removeSentence = (i) => setNewQuizSentences(newQuizSentences.filter((_,idx) => idx !== i));
  const addExtraWord = () => { const w = extraWordInput.trim(); if (w && !extraWords.includes(w)) setExtraWords([...extraWords, w]); setExtraWordInput(''); };
  const removeExtraWord = (w) => setExtraWords(extraWords.filter(x => x !== w));

  const updateMCQuestion = (field, value) => setMcQuestions(p => p.map((q,i) => i===mcCurrentIndex ? {...q,[field]:value} : q));
  const updateMCOption = (oi, value) => setMcQuestions(p => p.map((q,i) => { if(i!==mcCurrentIndex) return q; const o=[...q.options]; o[oi]=value; return {...q,options:o}; }));
  const toggleMCCorrect = (oi) => setMcQuestions(p => p.map((q,i) => { if(i!==mcCurrentIndex) return q; const ci=q.correctIndices.includes(oi)?q.correctIndices.filter(x=>x!==oi):[...q.correctIndices,oi]; return {...q,correctIndices:ci}; }));
  const addMCQuestion = () => { setMcQuestions(p=>[...p,emptyMCQuestion()]); setMcCurrentIndex(mcQuestions.length); };
  const removeMCQuestion = (idx) => { if(mcQuestions.length===1){alert('A quiz must have at least one question.');return;} const u=mcQuestions.filter((_,i)=>i!==idx); setMcQuestions(u); setMcCurrentIndex(Math.min(mcCurrentIndex,u.length-1)); };

  const updateORQuestion = (field, value) => setOrQuestions(p => p.map((q,i) => i===orCurrentIndex ? {...q,[field]:value} : q));
  const addORAnswer = () => {
    const t = orAnswerInput.trim(); if (!t) return;
    const cur = orQuestions[orCurrentIndex];
    if (cur.acceptedAnswers.map(normalizeAnswer).includes(normalizeAnswer(t))) { alert('That answer is already included.'); return; }
    setOrQuestions(p => p.map((q,i) => i!==orCurrentIndex ? q : { ...q, acceptedAnswers:[...q.acceptedAnswers,t], primaryAnswerIndex: q.acceptedAnswers.length===0?0:q.primaryAnswerIndex }));
    setOrAnswerInput('');
  };
  const removeORAnswer = (ai) => setOrQuestions(p => p.map((q,i) => { if(i!==orCurrentIndex) return q; const na=q.acceptedAnswers.filter((_,j)=>j!==ai); const np=ai===q.primaryAnswerIndex?0:ai<q.primaryAnswerIndex?q.primaryAnswerIndex-1:q.primaryAnswerIndex; return {...q,acceptedAnswers:na,primaryAnswerIndex:na.length>0?np:0}; }));
  const setORPrimary = (ai) => setOrQuestions(p => p.map((q,i) => i===orCurrentIndex ? {...q,primaryAnswerIndex:ai} : q));
  const updateDDQuestion = (field, value) => setDdQuestions(p => p.map((q,i) => i===ddCurrentIndex ? {...q,[field]:value} : q));
  const addDDQuestion = () => { setDdQuestions(p=>[...p,emptyDDQuestion()]); setDdCurrentIndex(ddQuestions.length); };
  const removeDDQuestion = (idx) => { if(ddQuestions.length===1){alert('A quiz must have at least one question.');return;} const u=ddQuestions.filter((_,i)=>i!==idx); setDdQuestions(u); setDdCurrentIndex(Math.min(ddCurrentIndex,u.length-1)); };
  const parseNumber = (s) => { const cleaned=(s||'').replace(/,/g,'').trim(); const n=parseFloat(cleaned); return isNaN(n)?null:n; };

  const addORQuestion = () => { setOrQuestions(p=>[...p,emptyORQuestion()]); setOrCurrentIndex(orQuestions.length); };
  const removeORQuestion = (idx) => { if(orQuestions.length===1){alert('A quiz must have at least one question.');return;} const u=orQuestions.filter((_,i)=>i!==idx); setOrQuestions(u); setOrCurrentIndex(Math.min(orCurrentIndex,u.length-1)); };

  const startNewCombQuestion = () => { setCombDraft(emptyCombQuestion(combNewQType)); setCombCurrentIndex(null); setCombOrAnswerInput(''); };
  const updateCombDraft = (field, value) => setCombDraft(d => ({ ...d, [field]: value }));
  const updateCombDraftOption = (oi, value) => setCombDraft(d => { const o=[...d.options]; o[oi]=value; return {...d,options:o}; });
  const toggleCombDraftCorrect = (oi) => setCombDraft(d => { const ci=d.correctIndices.includes(oi)?d.correctIndices.filter(x=>x!==oi):[...d.correctIndices,oi]; return {...d,correctIndices:ci}; });
  const addCombDraftORAnswer = () => {
    const t = combOrAnswerInput.trim(); if (!t||!combDraft) return;
    if ((combDraft.acceptedAnswers||[]).map(normalizeAnswer).includes(normalizeAnswer(t))) { alert('Already included.'); return; }
    setCombDraft(d => ({ ...d, acceptedAnswers:[...(d.acceptedAnswers||[]),t], primaryAnswerIndex:(d.acceptedAnswers||[]).length===0?0:(d.primaryAnswerIndex||0) }));
    setCombOrAnswerInput('');
  };
  const removeCombDraftORAnswer = (ai) => setCombDraft(d => { const na=(d.acceptedAnswers||[]).filter((_,j)=>j!==ai); const np=ai===(d.primaryAnswerIndex||0)?0:ai<(d.primaryAnswerIndex||0)?(d.primaryAnswerIndex||0)-1:(d.primaryAnswerIndex||0); return {...d,acceptedAnswers:na,primaryAnswerIndex:na.length>0?np:0}; });
  const setCombDraftORPrimary = (ai) => setCombDraft(d => ({...d,primaryAnswerIndex:ai}));

  const submitCombQuestion = () => {
    if (!combDraft) return;
    const qt = combDraft.questionType;
    if (qt==='MC') {
      if (!combDraft.prompt?.trim()) { alert('Please enter a prompt.'); return; }
      if (combDraft.options.filter(o=>o.trim()).length<2) { alert('Please enter at least 2 options.'); return; }
      if (combDraft.correctIndices.length===0) { alert('Please mark at least one correct answer.'); return; }
    } else if (qt==='OR') {
      if (!combDraft.prompt?.trim()) { alert('Please enter a prompt.'); return; }
      if ((combDraft.acceptedAnswers||[]).length===0) { alert('Please add at least one accepted answer.'); return; }
    } else {
      if (!combDraft.text?.trim()) { alert('Please enter a sentence.'); return; }
      if (!combDraft.text.includes('[')||!combDraft.text.includes(']')) { alert('Please wrap the answer in [square brackets].'); return; }
    }
    if (combCurrentIndex===null) setCombQuestions(p=>[...p,combDraft]);
    else setCombQuestions(p=>p.map((q,i)=>i===combCurrentIndex?combDraft:q));
    setCombDraft(null); setCombCurrentIndex(null); setCombOrAnswerInput('');
  };
  const editCombQuestion = (idx) => { setCombDraft({...combQuestions[idx]}); setCombCurrentIndex(idx); setCombOrAnswerInput(''); };
  const deleteCombQuestion = (idx) => { setCombQuestions(p=>p.filter((_,i)=>i!==idx)); if(combCurrentIndex===idx){setCombDraft(null);setCombCurrentIndex(null);} };
  const cancelCombEdit = () => { setCombDraft(null); setCombCurrentIndex(null); setCombOrAnswerInput(''); };

  const getEffectiveCategory = () => showNewCategoryInput && newCategoryInput.trim() ? newCategoryInput.trim() : newQuizCategory;

  const validateQuizBuilder = () => {
    if (!newQuizTitle) { alert('Please enter a quiz title.'); return false; }
    if (!getEffectiveCategory()) { alert('Please select or enter a season.'); return false; }
    if (newQuizType==='fillintheblank') { if(newQuizSentences.length===0){alert('Please add at least one sentence.');return false;} }
    else if (newQuizType==='MC') {
      if (!mcQuestions[0]?.prompt.trim()) { alert('Please add at least one question.'); return false; }
      for(let i=0;i<mcQuestions.length;i++){if(mcQuestions[i].options.filter(o=>o.trim()).length<2){alert(`Q${i+1} needs 2+ options.`);return false;}if(mcQuestions[i].correctIndices.length===0){alert(`Q${i+1} needs a correct answer.`);return false;}}
    } else if (newQuizType==='openresponse') {
      if (!orQuestions[0]?.prompt.trim()) { alert('Please add at least one question.'); return false; }
      for(let i=0;i<orQuestions.length;i++){if(orQuestions[i].acceptedAnswers.length===0){alert(`Q${i+1} needs at least one accepted answer.`);return false;}}
    } else if (newQuizType==='combination') {
      if (combQuestions.length===0) { alert('Please add at least one question.'); return false; }
      if (combDraft) { alert('You are in the middle of editing a question. Click "Update Question" or "Cancel Edit" first.'); return false; }
    } else if (newQuizType==='datadash') {
      if (!ddQuestions[0]?.prompt.trim()) { alert('Please add at least one question.'); return false; }
      for(let i=0;i<ddQuestions.length;i++){ if(ddQuestions[i].correctAnswer===null){alert(`Q${i+1} needs a correct numeric answer.`);return false;} }
    }
    return true;
  };

  const buildQuizJSON = () => {
    const category = getEffectiveCategory();
    const base = { title: newQuizTitle, category, status: newQuizStatus, type: newQuizType, authorNote: newQuizAuthorNote.trim(), tokenSlots: newQuizTokenSlots, closingDate: newQuizClosingDate.trim() };
    if (newQuizType==='fillintheblank') {
      const aw = extractAnswerWords(newQuizSentences.map(t=>({text:t})));
      return { ...base, wordBank: Array.from(new Set([...aw,...extraWords])), sentences: newQuizSentences.map(t=>({text:t,answer:parseSentence(t).answer})) };
    } else if (newQuizType==='MC') {
      return { ...base, randomizeQuestions:mcRandomizeQuestions, questions:mcQuestions.map(q=>({ prompt:q.prompt, options:q.options.filter(o=>o.trim()!==''), correctIndices:q.correctIndices.filter(i=>q.options[i]&&q.options[i].trim()!=='').map(i=>q.options.filter((_,idx)=>idx<=i&&q.options[idx].trim()!=='').length-1), randomizeOptions:q.randomizeOptions||false })) };
    } else if (newQuizType==='openresponse') {
      return { ...base, randomizeQuestions:orRandomizeQuestions, questions:orQuestions.map(q=>({ prompt:q.prompt, acceptedAnswers:q.acceptedAnswers, primaryAnswerIndex:q.primaryAnswerIndex, showOthersCount:q.showOthersCount })) };
    } else if (newQuizType==='datadash') {
      return { ...base, questions:ddQuestions.map(q=>({ prompt:q.prompt, correctAnswer:q.correctAnswer })) };
    } else {
      return { ...base, questions:combQuestions.map(q => {
        const qt=q.questionType;
        if (qt==='MC') return { questionType:'MC', prompt:q.prompt, options:q.options.filter(o=>o.trim()!==''), correctIndices:q.correctIndices.filter(i=>q.options[i]&&q.options[i].trim()!=='').map(i=>q.options.filter((_,idx)=>idx<=i&&q.options[idx].trim()!=='').length-1), randomizeOptions:q.randomizeOptions||false };
        if (qt==='OR') return { questionType:'OR', prompt:q.prompt, acceptedAnswers:q.acceptedAnswers, primaryAnswerIndex:q.primaryAnswerIndex, showOthersCount:q.showOthersCount };
        return { questionType:'FITB', text:q.text, answer:parseSentence(q.text).answer };
      })};
    }
  };

  const exportQuiz = () => { if(!validateQuizBuilder()) return; setExportContent(JSON.stringify(buildQuizJSON(),null,2)); setExportFilename((newQuizTitle||'quiz').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,50)+'.json'); setShowExportModal(true); };
  const copyToClipboard = () => { navigator.clipboard.writeText(exportContent).then(()=>{setShowExportModal(false);alert('Copied to clipboard!');}).catch(()=>{alert('Could not copy automatically. Please select all and copy manually (Ctrl+A, Ctrl+C).');}); };
  const scoreAttempt = (quiz, answers) => {
    const questions = quiz.type === 'fillintheblank' ? quiz.sentences : quiz.questions;
    return questions.map((q, i) => {
      const qtype = quiz.type === 'combination' ? q.questionType : quiz.type;
      const ans = answers[i];
      if (qtype === 'MC') {
        const displayOpts = q.options.map((opt, oi) => ({ opt, correct: q.correctIndices.includes(oi) })).filter(o => o.opt.trim() !== '');
        const correctOpts = displayOpts.filter(o => o.correct).map(o => o.opt);
        const sel = ans || [];
        return sel.length === correctOpts.length && correctOpts.every(o => sel.includes(o));
      } else if (qtype === 'OR' || qtype === 'openresponse') {
        return ans && q.acceptedAnswers.some(a => normalizeAnswer(a) === normalizeAnswer(ans));
      } else if (qtype === 'FITB' || quiz.type === 'fillintheblank') {
        return ans === parseSentence(q.text).answer;
      } else if (quiz.type === 'datadash') {
        return true; // datadash has no correct/incorrect — all answers are 'valid'
      }
      return false;
    });
  };

  const computeQuizResults = (quiz, attempts) => {
    // ── Data Dash scoring ──────────────────────────────────────────────────
    if (quiz.type === 'datadash') {
      const questions = quiz.questions;
      const n = questions.length;
      const totalAttempts = attempts.length;
      // For each question, collect each user's |answer - correct| difference
      // Then rank by difference (smallest = best = most points)
      const userScores = attempts.map(a => {
        const tokenMap = a.token_assignments || {};
        const doublesArr = a.doubles || [];
        let total = 0;
        const diffs = questions.map((q, i) => {
          const raw = (a.answers[i] || '').toString().replace(/,/g,'').trim();
          const userVal = parseFloat(raw);
          return isNaN(userVal) ? Infinity : Math.abs(userVal - q.correctAnswer);
        });
        // Store diffs on the attempt for scoring
        a._diffs = diffs;
        return { user_id: a.user_id, display_name: a.display_name, diffs };
      });
      // Per question, rank by diff and assign points
      const pointValues = questions.map((_, qi) => {
        const ranked = attempts
          .map((a, ai) => ({ ai, diff: a._diffs[qi] }))
          .sort((a, b) => a.diff - b.diff);
        const pts = new Array(attempts.length).fill(0);
        let rank = totalAttempts;
        let j = 0;
        while (j < ranked.length) {
          let k = j;
          while (k < ranked.length - 1 && ranked[k+1].diff === ranked[k].diff) k++;
          const avg = Math.round(((ranked.slice(j,k+1).reduce((s,_,ii)=>s+(rank-ii),0))/(k-j+1))*10)/10;
          for (let m = j; m <= k; m++) pts[ranked[m].ai] = avg;
          rank -= (k - j + 1);
          j = k + 1;
        }
        return pts; // pts[attemptIndex] = points for this question
      });
      // Build per-user scores with token effects
      const userScoresFinal = attempts.map((a, ai) => {
        let total = 0;
        const tokenMap = a.token_assignments || {};
        const doublesArr = a.doubles || [];
        questions.forEach((q, i) => {
          const basePts = pointValues[i][ai];
          const token = tokenMap[i] || (doublesArr.includes(i) ? 'doubler' : null);
          if (token === 'doubler') {
            total += Math.round(basePts * 2 * 10) / 10;
          } else if (token === 'insurance') {
            total += basePts; // insurance has no wrong answer in DD
          } else if (token === 'sniper') {
            total += SNIPER_POINTS;
          } else if (token === 'parasite') {
            total += basePts; // parasite same as normal in DD (no correctCount)
          } else {
            total += basePts;
          }
        });
        return { user_id: a.user_id, display_name: a.display_name, score: Math.round(total * 10) / 10, questionsCorrect: 0 };
      });
      // pointValues for storage: per-question base value for the median user (just store the first user's values for reference)
      const pointValuesFlat = questions.map((_, qi) => pointValues[qi][0] || 0);
      const correctCounts = questions.map(() => 0); // not used for DD
      const correctnessByUser = {};
      attempts.forEach(a => { correctnessByUser[a.user_id] = questions.map(() => true); });
      // Store per-question per-user point values for auditor
      const ddPointsByUser = {};
      attempts.forEach((a, ai) => {
        ddPointsByUser[a.user_id] = questions.map((_, qi) => pointValues[qi][ai]);
      });
      return { pointValues: pointValuesFlat, userScores: userScoresFinal, correctnessByUser, correctCounts, ddPointsByUser, isDashQuiz: true };
    }
    // ── Standard scoring ───────────────────────────────────────────────────
    const questions = quiz.type === 'fillintheblank' ? quiz.sentences : quiz.questions;
    const n = questions.length;
    const correctCounts = questions.map((_, i) => attempts.filter(a => a.correctness[i]).length);
    const totalAttempts = attempts.length;
    const sorted = [...correctCounts.map((c, i) => ({ i, c }))].sort((a, b) => a.c - b.c || a.i - b.i);
    const pointValues = new Array(n).fill(0);
    let rank = n;
    let j = 0;
    while (j < sorted.length) {
      let k = j;
      while (k < sorted.length - 1 && sorted[k+1].c === sorted[k].c) k++;
      const avgPoints = Math.round(((sorted.slice(j, k+1).reduce((s, _, ii) => s + (rank - ii), 0)) / (k - j + 1)) * 10) / 10;
      for (let m = j; m <= k; m++) pointValues[sorted[m].i] = avgPoints;
      rank -= (k - j + 1);
      j = k + 1;
    }
    const correctnessByUser = {};
    const userScores = attempts.map(a => {
      let total = 0;
      let questionsCorrect = 0;
      correctnessByUser[a.user_id] = a.correctness;
      const tokenMap = a.token_assignments || {};
      // doubles fallback for old attempts without token_assignments
      const doublesArr = a.doubles || [];
      a.correctness.forEach((correct, i) => {
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
          // parasite: (correctCount * pts) / totalAttempts
          const parasiteScore = totalAttempts > 0 ? Math.round((correctCounts[i] * pts / totalAttempts) * 10) / 10 : 0;
          total += parasiteScore;
        } else {
          total += correct ? pts : 0;
        }
      });
      return { user_id: a.user_id, display_name: a.display_name, score: Math.round(total * 10) / 10, questionsCorrect };
    });
    return { pointValues, userScores, correctnessByUser, correctCounts };
  };

  // Compute and store season standings for a given season name.
  // Called after any quiz in that season is scored (skips "Offseason").
  const updateSeasonStandings = async (seasonName, freshQuizKey, freshUserScores) => {
    if (!seasonName || seasonName.trim().toLowerCase() === 'offseason') return;

    const { data: seasonQuizRows } = await supabase
      .from('quizzes')
      .select('quiz_key')
      .eq('category', seasonName)
      .eq('status', 'Scored');

    if (!seasonQuizRows || seasonQuizRows.length === 0) return;

    // Fetch DB results for every quiz in the season EXCEPT the one just saved —
    // use the freshly computed scores for that one to avoid read-after-write timing issues.
    const otherKeys = seasonQuizRows.map(r => r.quiz_key).filter(k => k !== freshQuizKey);
    const otherResults = otherKeys.length > 0
      ? (await supabase.from('quiz_results').select('quiz_key, scores').in('quiz_key', otherKeys)).data || []
      : [];

    const results = [
      ...otherResults,
      { quiz_key: freshQuizKey, scores: { userScores: freshUserScores } },
    ];

    if (!results || results.length === 0) return;

    // Season points = direct sum of each user's quiz scores across the season.
    const seasonTotals = {}; // user_id -> { display_name, seasonPoints }

    results.forEach(({ scores }) => {
      const userScores = scores?.userScores || [];
      userScores.forEach(u => {
        if (!seasonTotals[u.user_id]) {
          seasonTotals[u.user_id] = { display_name: u.display_name, seasonPoints: 0 };
        }
        seasonTotals[u.user_id].seasonPoints =
          Math.round((seasonTotals[u.user_id].seasonPoints + (u.score || 0)) * 10) / 10;
      });
    });

    // Build the standings array sorted by season points descending
    const standings = Object.entries(seasonTotals)
      .map(([user_id, data]) => ({ user_id, ...data }))
      .sort((a, b) => b.seasonPoints - a.seasonPoints);

    // Upsert into season_standings table
    await supabase.from('season_standings').upsert({
      season: seasonName,
      updated_at: new Date().toISOString(),
      standings,
    }, { onConflict: 'season' });
  };

  const runAudit = async (quizKey) => {
    if (!quizKey) return;
    setAuditLoading(true);
    setAuditData(null);

    // Fetch quiz definition, results, and attempts in parallel
    const [{ data: quizRow }, { data: resultRow }, { data: attempts }] = await Promise.all([
      supabase.from('quizzes').select('data, title, category').eq('quiz_key', quizKey).single(),
      supabase.from('quiz_results').select('scores').eq('quiz_key', quizKey).single(),
      supabase.from('quiz_attempts').select('user_id, answers, token_assignments, doubles, status').eq('quiz_key', quizKey).eq('status', 'submitted'),
    ]);

    if (!quizRow || !resultRow || !attempts) { setAuditLoading(false); return; }

    const quiz = quizRow.data;
    const season = quizRow.category;
    const questions = quiz.type === 'fillintheblank' ? quiz.sentences : quiz.questions;
    const scores = resultRow.scores;
    const { pointValues, userScores, correctnessByUser, correctCounts } = scores;
    const totalAttempts = attempts.length;
    const n = questions.length;
    const isDashQuiz = quiz.type === 'datadash';

    // Fetch display names
    const userIds = attempts.map(a => a.user_id);
    const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds);
    const nameMap = {};
    (profiles || []).forEach(p => { nameMap[p.user_id] = p.display_name; });

    let rankingRows = [];

    if (!isDashQuiz) {
      // ── Difficulty ranking explanation ────────────────────────────────────
      const sorted = [...correctCounts.map((c, i) => ({ i, c }))]
        .sort((a, b) => a.c - b.c || a.i - b.i);
      let rank = n;
      let j = 0;
      while (j < sorted.length) {
        let k = j;
        while (k < sorted.length - 1 && sorted[k + 1].c === sorted[k].c) k++;
        const tieCount = k - j + 1;
        const rawRanks = [];
        for (let m = 0; m < tieCount; m++) rawRanks.push(rank - m);
        const avg = Math.round((rawRanks.reduce((s, v) => s + v, 0) / tieCount) * 10) / 10;
        const isTie = tieCount > 1;
        for (let m = j; m <= k; m++) {
          const qi = sorted[m].i;
          rankingRows.push({
            qIndex: qi, correctCount: correctCounts[qi], totalAttempts,
            assignedPoints: pointValues[qi], isTie,
            tieWith: isTie ? sorted.slice(j, k + 1).map(x => x.i).filter(x => x !== qi) : [],
            tieFormula: isTie ? `(${rawRanks.join(' + ')}) ÷ ${tieCount} = ${avg}` : null,
          });
        }
        rank -= tieCount;
        j = k + 1;
      }
      rankingRows.sort((a, b) => a.correctCount - b.correctCount || b.assignedPoints - a.assignedPoints);
    }

    // ── Per-user per-question cell detail ────────────────────────────────────
    const userRows = attempts.map(attempt => {
      const displayName = nameMap[attempt.user_id] || attempt.user_id;
      const tokenMap = attempt.token_assignments || {};
      const doublesArr = attempt.doubles || [];

      let cells;
      if (isDashQuiz) {
        // Data Dash: base pts come from ddPointsByUser stored in scores
        const ddPts = scores.ddPointsByUser?.[attempt.user_id] || questions.map(() => 0);
        cells = questions.map((q, i) => {
          const rawAns = (attempt.answers[i] || '').toString().replace(/,/g, '').trim();
          const userVal = parseFloat(rawAns);
          const diff = isNaN(userVal) ? null : Math.abs(userVal - q.correctAnswer);
          const basePts = ddPts[i] || 0;
          const token = tokenMap[i] || (doublesArr.includes(i) ? 'doubler' : null);
          let earned = basePts;
          let formula = `${basePts} pts (rank-based)`;
          if (token === 'doubler') {
            earned = Math.round(basePts * 2 * 10) / 10;
            formula = `${basePts} × 2 = ${earned} (doubler)`;
          } else if (token === 'sniper') {
            earned = SNIPER_POINTS;
            formula = `Sniper flat = ${SNIPER_POINTS}`;
          }
          return { correct: true, token, earned, formula, diff };
        });
      } else {
        const correctness = correctnessByUser[attempt.user_id] || [];
        cells = questions.map((_, i) => {
          const correct = correctness[i] || false;
          const pts = pointValues[i];
          const token = tokenMap[i] || (doublesArr.includes(i) ? 'doubler' : null);
          let earned = 0;
          let formula = '';
          if (token === 'doubler') {
            earned = correct ? Math.round(pts * 2 * 10) / 10 : 0;
            formula = correct ? `${pts} × 2 = ${earned}` : `✗ + Doubler → 0`;
          } else if (token === 'insurance') {
            earned = correct ? pts : Math.round((pts / 2) * 10) / 10;
            formula = correct ? `${pts} (insurance, correct)` : `${pts} ÷ 2 = ${earned} (insurance)`;
          } else if (token === 'sniper') {
            earned = correct ? SNIPER_POINTS : 0;
            formula = correct ? `Sniper flat = ${SNIPER_POINTS}` : `✗ + Sniper → 0`;
          } else if (token === 'parasite') {
            earned = totalAttempts > 0 ? Math.round((correctCounts[i] * pts / totalAttempts) * 10) / 10 : 0;
            formula = `${correctCounts[i]} × ${pts} ÷ ${totalAttempts} = ${earned} (parasite)`;
          } else {
            earned = correct ? pts : 0;
            formula = correct ? `${pts}` : `✗ → 0`;
          }
          return { correct, token, earned, formula };
        });
      }

      const storedScore = (userScores.find(u => u.user_id === attempt.user_id) || {}).score;
      const recomputedTotal = Math.round(cells.reduce((s, c) => s + c.earned, 0) * 10) / 10;
      const matches = !isDashQuiz ? storedScore === recomputedTotal : true;
      return { user_id: attempt.user_id, displayName, cells, recomputedTotal, storedScore, matches };
    });
    userRows.sort((a, b) => b.recomputedTotal - a.recomputedTotal);

    setAuditData({ quizKey, quizTitle: quiz.title || quizKey, season, questions, rankingRows, userRows, n, totalAttempts, isDashQuiz });
    setAuditLoading(false);
  };

    const saveQuizLocally = async () => {
    if (!validateQuizBuilder()) return;
    const quizData = buildQuizJSON();

    // For new quizzes, auto-generate a unique slug from the title.
    // For edits, keep the existing key unchanged forever.
    let key = editingKey;
    if (!key) {
      const base = quizData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'quiz';
      const { data: existing } = await supabase
        .from('quizzes')
        .select('quiz_key')
        .like('quiz_key', `${base}%`);
      const usedKeys = new Set((existing || []).map(r => r.quiz_key));
      key = base;
      let suffix = 2;
      while (usedKeys.has(key)) { key = `${base}-${suffix}`; suffix++; }
    }

    // Save to Supabase
    const { error } = await supabase.from('quizzes').upsert({
      quiz_key: key,
      title: quizData.title,
      category: quizData.category,
      status: quizData.status,
      type: quizData.type,
      data: quizData,
    }, { onConflict: 'quiz_key' });

    if (error) { alert('Error saving quiz: ' + error.message); return; }

    // Update local state
    setAllQuizData(p => ({ ...p, [key]: quizData }));
    if (!knownQuizzes.quizzes.includes(key)) setKnownQuizzes(p => ({ quizzes: [...p.quizzes, key] }));

    if (newQuizStatus === 'Scored') {
      const { data: attempts } = await supabase.from('quiz_attempts').select('*').eq('quiz_key', key).eq('status', 'submitted');
      if (attempts && attempts.length > 0) {
        const userIds = attempts.map(a => a.user_id);
        const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, email').in('user_id', userIds);
        const profileMap = {};
        (profiles || []).forEach(p => { profileMap[p.user_id] = p.display_name || p.email || p.user_id; });
        const attemptsWithCorrectness = attempts.map(a => ({
          ...a,
          display_name: profileMap[a.user_id] || a.user_id,
          correctness: scoreAttempt(quizData, a.answers || {}),
        }));
        const { pointValues, userScores, correctnessByUser, correctCounts } = computeQuizResults(quizData, attemptsWithCorrectness);
        await supabase.from('quiz_results').upsert({
          quiz_key: key,
          quiz_title: quizData.title,
          posted_at: new Date().toISOString(),
          scores: { pointValues, userScores, correctnessByUser, correctCounts },
        }, { onConflict: 'quiz_key' });

        // Update season standings (no-op for Offseason quizzes)
        await updateSeasonStandings(quizData.category, key, userScores);
      }
    }

    const verb = editingKey ? 'updated' : 'saved';
    resetQuizBuilder();
    setAdminSection('list');
    alert(`Quiz "${quizData.title}" ${verb}!${newQuizStatus === 'Scored' ? ' Scores have been calculated.' : ''}`);
  };
  const Header = ({ title, rightSlot }) => (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold text-gray-800 tracking-tight">{title}</h1>
      {rightSlot}
    </div>
  );

  const ExitModal = () => showResetModal ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Exit Quiz?</h2>
        <p className="text-gray-600 mb-6">Your answers will be saved and you can continue this quiz later.</p>
        <div className="flex gap-3">
          <button onClick={async()=>{await saveProgress();setShowResetModal(false);setMode('setup');}} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">Yes, Exit</button>
          <button onClick={()=>setShowResetModal(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
        </div>
      </div>
    </div>
  ) : null;
  const ScoreBanner = ({ correct, total }) => {
    const pct = Math.round((correct/total)*100);
    return (
      <div className={`rounded-xl p-6 mb-6 text-center shadow-md ${pct===100?'bg-green-50 border-2 border-green-400':pct>=70?'bg-yellow-50 border-2 border-yellow-400':'bg-red-50 border-2 border-red-400'}`}>
        <div className={`text-5xl font-bold mb-1 ${pct===100?'text-green-600':pct>=70?'text-yellow-600':'text-red-600'}`}>{correct}/{total}</div>
        <div className="text-lg text-gray-600 font-medium">{pct}% Correct</div>
        {pct===100 && <div className="text-green-600 font-semibold mt-2">🎉 Perfect Score!</div>}
      </div>
    );
  };
  const NavBar = ({ current, total, label }) => (
    <div className="flex items-center justify-between mb-6">
      <button onClick={()=>goToQuestion(-1)} className="flex items-center gap-1 px-5 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"><ChevronLeft size={20}/> Back</button>
      <span className="text-gray-600 font-medium">{label} {current+1} of {total}</span>
      <button onClick={()=>goToQuestion(1)} className="flex items-center gap-1 px-5 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Next <ChevronRight size={20}/></button>
    </div>
  );
  const OthersPopup = () => {
    if (!othersPopupQuestion) return null;
    const answers = othersPopupQuestion.acceptedAnswers || [];
    // Build prose list: "A and B" for 2, "A, B, and C" for 3+
    const prose = answers.length === 1
      ? answers[0]
      : answers.length === 2
        ? `${answers[0]} and ${answers[1]}`
        : answers.slice(0,-1).join(', ') + `, and ${answers[answers.length-1]}`;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
          <div className="flex justify-between items-center p-5 border-b">
            <h2 className="text-lg font-bold text-gray-800">All Correct Answers</h2>
            <button onClick={()=>setOthersPopupQuestion(null)} className="text-gray-400 hover:text-gray-600"><X size={22}/></button>
          </div>
          <div className="p-5">
            <p className="text-sm text-gray-500 mb-3 italic">{othersPopupQuestion.prompt}</p>
            <p className="text-sm text-gray-700">
              The full set of correct answers is: <span className="font-semibold text-gray-800">{prose}</span>
            </p>
          </div>
          <div className="px-5 pb-5"><button onClick={()=>setOthersPopupQuestion(null)} className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Close</button></div>
        </div>
      </div>
    );
  };

  const renderResultRow = (q, i, quizType, qNum) => {
    const qtype = quizType==='combination' ? q.questionType : quizType;
    if (qtype==='MC') {
      const correctOpts=q.displayOptions.filter(o=>o.correct).map(o=>o.opt);
      const sel=studentAnswers[i]||[];
      const ok=sel.length===correctOpts.length&&correctOpts.every(o=>sel.includes(o));
      return (
        <div key={i} className={`p-5 border-b last:border-b-0 ${ok?'bg-white':'bg-red-50'}`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">{ok?<Check size={22} className="text-green-500"/>:<X size={22} className="text-red-500"/>}</div>
            <div className="flex-1">
              {qNum&&<span className="text-xs text-gray-400 mb-1 block">Q{qNum}</span>}
              <div className="font-semibold text-gray-800 mb-2">{renderPrompt(q.prompt)}</div>
              <div className="space-y-1">{q.displayOptions.map((optObj,j)=>{const chose=sel.includes(optObj.opt);const right=optObj.correct;return <div key={j} className={`flex items-center gap-2 text-sm ${right?'text-green-700 font-semibold':chose?'text-red-600':'text-gray-500'}`}><span>{chose?'●':'○'}</span><span>{optObj.opt}</span>{right&&<span className="text-xs text-green-600 ml-1">(correct)</span>}</div>;})}
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (qtype==='OR'||qtype==='openresponse') {
      const sa=studentAnswers[i]||''; const ok=sa.trim()!==''&&q.acceptedAnswers.some(a=>normalizeAnswer(a)===normalizeAnswer(sa));
      const primary=q.acceptedAnswers[q.primaryAnswerIndex??0]||q.acceptedAnswers[0]||'';
      const othersCount=q.acceptedAnswers.length-1; const showOthers=q.showOthersCount&&othersCount>0;
      return (
        <div key={i} className={`p-5 border-b last:border-b-0 ${ok?'bg-white':'bg-red-50'}`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">{ok?<Check size={22} className="text-green-500"/>:<X size={22} className="text-red-500"/>}</div>
            <div className="flex-1">
              {qNum&&<span className="text-xs text-gray-400 mb-1 block">Q{qNum}</span>}
              <div className="font-semibold text-gray-800 mb-1">{renderPrompt(q.prompt)}</div>
              <p className="text-gray-700 mb-1">Your answer: <span className={`font-semibold ${ok?'text-green-700':'text-red-600'}`}>{sa||(ok?'':'(no answer)')}</span></p>
              <div className="text-sm text-gray-500 mt-1">
                Correct answer: <span className="font-semibold text-green-700">{primary}</span>
                {showOthers && <button onClick={()=>setOthersPopupQuestion(q)} className="ml-1 font-semibold text-green-700 underline underline-offset-2 hover:text-green-900">+{othersCount}</button>}
              </div>
            </div>
          </div>
        </div>
      );
    }
    const {display,answer}=parseSentence(q.text||''); const sa=studentAnswers[i]||'(no answer)'; const ok=sa===answer; const parts=display.split('______');
    return (
      <div key={i} className={`p-5 border-b last:border-b-0 ${ok?'bg-white':'bg-red-50'}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{ok?<Check size={22} className="text-green-500"/>:<X size={22} className="text-red-500"/>}</div>
          <div className="flex-1">
            <p className="text-gray-700 mb-2 leading-snug text-lg">{parts[0]}<span className={`font-bold ${ok?'text-green-600':'text-red-500'}`}>{sa}</span>{parts[1]}</p>
            {!ok&&<p className="text-sm text-gray-500">Correct answer: <span className="font-semibold text-green-700">{answer}</span></p>}
          </div>
        </div>
      </div>
    );
  };

  const HELP_CONTENT = {
    submitted: {
      title: 'Disputes — Help',
      body: 'Disputes FAQ placeholder text. Check boxes next to any answers you believe were incorrectly marked, add a brief explanation, and tap Send Disputes.',
    },
    scoreboards: {
      title: 'Scoreboards — Help',
      body: 'Scoreboards FAQ placeholder text. Replace this with instructions for how to read the leaderboards, what season standings are, and how scoring works.',
    },
    setup: {
      title: 'Available Quizzes — Help',
      body: 'Available Quizzes FAQ placeholder text. Replace this with instructions for how to select and start a quiz, what the status labels mean, and anything else users should know.',
    },
    scoreboards: {
      title: 'Scoreboards — Help',
      body: 'Scoreboards FAQ placeholder text. Replace this with instructions for how to read the leaderboards, what season standings are, and how scoring works.',
    },
    summary: {
      title: 'Token Assignment — Help',
      body: 'Token Assignment FAQ placeholder text. Replace this with instructions for how to assign tokens, what each token does, and how to submit your final answers.',
    },
  };
    const HelpModal = () => {
    if (!showHelpModal) return null;
    const info = HELP_CONTENT[showHelpModal] || { title: 'Help', body: 'Placeholder help text.' };
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
          <div className="flex justify-between items-center p-5 border-b">
            <h2 className="text-lg font-bold text-gray-800">{info.title}</h2>
            <button onClick={()=>setShowHelpModal(null)} className="text-gray-400 hover:text-gray-600"><X size={22}/></button>
          </div>
          <div className="p-5">
            <p className="text-sm text-gray-700 leading-relaxed">{info.body}</p>
          </div>
          <div className="px-5 pb-5">
            <button onClick={()=>setShowHelpModal(null)} className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Close</button>
          </div>
        </div>
      </div>
    );
  };

    const ForgotModal = () => showForgotModal ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Request Login Info</h2>
        {forgotSent ? (
          <>
            <p className="text-green-700 text-sm mb-4">Your request has been sent! You'll receive your login info by email shortly.</p>
            <button onClick={()=>{setShowForgotModal(false);setForgotSent(false);setForgotEmail('');}} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Close</button>
          </>
        ) : (
          <>
            <p className="text-gray-600 text-sm mb-4">Enter your email address and the admin will send you your login info.</p>
            <input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} placeholder="Your email address" className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 text-sm"/>
            <div className="flex gap-3">
              <button onClick={handleForgotSubmit} disabled={!forgotEmail.trim()||forgotSending} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-40">{forgotSending?'Sending...':'Submit'}</button>
              <button onClick={()=>{setShowForgotModal(false);setForgotEmail('');}} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  if (mode==='login') return (
    <div className="max-w-md mx-auto p-6 bg-gray-50 min-h-screen flex flex-col justify-center">
      <ForgotModal/>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 tracking-tight mb-2">Double Up Trivia</h1>
        <p className="text-gray-500">Sign in to play</p>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
          <input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="you@example.com" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"/>
        </div>
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
          <input type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="••••••••" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"/>
        </div>
        {loginError && <p className="text-red-600 text-sm mb-3">{loginError}</p>}
        <button onClick={handleLogin} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg mt-4 mb-6">Log In</button>
        <div className="border-t pt-4 text-center">
          <p className="text-sm text-gray-500 mb-2">Forgot your username and/or password?</p>
          <button onClick={()=>{setShowForgotModal(true);setForgotSent(false);}} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium">Click Here</button>
        </div>
      </div>
      <div className="text-center mt-6">
        <button onClick={()=>setMode('admin')} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium mx-auto"><Settings size={18}/> Admin</button>
      </div>
    </div>
  );

  if (isLoading) return <div className="max-w-2xl mx-auto p-6 bg-gray-50 min-h-screen flex items-center justify-center"><div className="text-xl text-gray-500">Loading quizzes...</div></div>;
  if (mode==='setup') return (
    <><HelpModal/>
    <div className="max-w-2xl mx-auto bg-gray-50 min-h-screen" style={{padding:"1.5rem"}}>
      <div style={{position:"relative"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
          <span className="text-sm text-gray-500">{displayName || currentUser?.email || ''}</span>
          <div className="flex gap-2">
            <button onClick={()=>setShowHelpModal('setup')} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium text-sm">?</button>
            <button onClick={()=>setMode('scoreboards')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">Scoreboards</button>
            <button onClick={()=>setMode('settings')} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium text-sm"><Settings size={16}/></button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"><LogOut size={16}/> Log Out</button>
          </div>
        </div>
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Available Quizzes</h1>
        </div>
      </div>
      {loadError ? (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 text-center">
          <p className="text-red-700 font-medium">Could not load quiz data. Please check that your quiz files are in the correct location.</p>
        </div>
      ) : allCategories.length===0 ? (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-8 text-center">
          <p className="text-yellow-800 font-medium">There are currently no active quizzes for you to complete. Check back later!</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-md p-8 mb-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Step 1: Select a Season</h2>
            <select value={selectedCategory} onChange={e=>handleCategoryChange(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 text-base">
              <option value="">— Select a season —</option>
              {allCategories.map(cat=><option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className={`bg-white rounded-xl shadow-md p-8 mb-6 transition-opacity ${selectedCategory?'opacity-100':'opacity-40 pointer-events-none'}`}>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Step 2: Choose a Quiz</h2>
            <select value={selectedQuizKey} onChange={e=>setSelectedQuizKey(e.target.value)} disabled={!selectedCategory} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 text-base mb-6">
              <option value="">— Select a quiz —</option>
              {quizzesInCategory.map(key => {
                const attempt = userAttempts[key];
                const completed = attempt?.status === 'submitted';
                const inProgress = attempt?.status === 'in_progress';
                const label = `${allQuizData[key]?.title||key}${completed ? ' (Completed)' : inProgress ? ' (In Progress)' : ''}${allQuizData[key]?.closingDate ? ` - Closes on ${allQuizData[key].closingDate}` : ''}`;
                return <option key={key} value={key}>{label}</option>;
              })}
            </select>
            {selectedQuizKey && userAttempts[selectedQuizKey]?.status === 'submitted' ? (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 text-center">
                <p className="text-yellow-800 font-medium">You have already completed this quiz. Results and scores have not yet been posted — stay tuned!</p>
              </div>
            ) : (
              <button onClick={loadQuiz} disabled={!selectedQuizKey} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {selectedQuizKey && userAttempts[selectedQuizKey]?.status === 'in_progress' ? 'Resume Quiz' : 'Load Quiz'}
              </button>
            )}
          </div>
        </>
      )}
    </div></>
  );
  if (mode==='assessment' && activeQuiz?.type==='fillintheblank') {
    const sentence=activeQuestions[currentQuestionIndex]; const {display}=parseSentence(sentence.text);
    const currentAnswer=studentAnswers[currentQuestionIndex]; const total=activeQuestions.length;
    const answeredCount=Object.keys(studentAnswers).length;
    const sortedWB=[...activeQuiz.wordBank].sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'}));
    const parts=display.split('______');
    return (
      <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">{activeQuiz.title}</h1>
          <button onClick={()=>setShowResetModal(true)} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-medium text-sm">Exit Quiz</button>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Word Bank</h2>
          <div className="flex flex-wrap gap-2">
            {sortedWB.map(word=>{const isUsed=usedWords.includes(word);const isCur=currentAnswer===word;return <button key={word} onClick={()=>selectWord(word)} className={`px-4 py-2 rounded-lg font-semibold transition-all border-2 ${isCur?'bg-green-600 text-white border-green-600 ring-2 ring-green-300':isUsed?'bg-gray-200 text-gray-400 border-gray-200':'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'}`}>{word}</button>;})}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-8 mb-6">
          <p className="text-2xl text-gray-800 leading-relaxed font-medium">{parts[0]}{currentAnswer?<span className="text-blue-600 font-bold">{currentAnswer}</span>:<span className="inline-block border-b-2 border-gray-400 w-28 mx-1 align-bottom"/>}{parts[1]}</p>
        </div>
        <NavBar current={currentQuestionIndex} total={total} label="Sentence"/>
        <button onClick={submitQuiz} className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg flex items-center justify-center gap-2"><Check size={20}/> Answers Complete ({answeredCount}/{total} answered)</button>
        <ExitModal/>
      </div>
    );
  }

  if (mode==='assessment' && activeQuiz?.type==='MC') {
    const q=activeQuestions[currentQuestionIndex]; const total=activeQuestions.length;
    const answeredCount=Object.keys(studentAnswers).filter(k=>(studentAnswers[k]||[]).length>0).length;
    const sels=studentAnswers[currentQuestionIndex]||[]; const multi=q.displayOptions.filter(o=>o.correct).length>1;
    return (
      <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">{activeQuiz.title}</h1>
          <button onClick={()=>setShowResetModal(true)} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-medium text-sm">Exit Quiz</button>
        </div>
        <div className="bg-white rounded-xl shadow-md p-8 mb-6">
          <div className="text-xl text-gray-800 font-semibold mb-2">{renderPrompt(q.prompt)}</div>
          {multi&&<p className="text-sm text-blue-600 mb-4 font-medium">Select all that apply.</p>}
          <div className="space-y-3 mt-4">{q.displayOptions.map((optObj,i)=><button key={i} onClick={()=>toggleMCAnswer(currentQuestionIndex,optObj.opt)} className={`w-full text-left px-5 py-3 rounded-lg border-2 font-medium transition-all ${sels.includes(optObj.opt)?'bg-green-600 text-white border-green-600':'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>{optObj.opt}</button>)}</div>
        </div>
        <NavBar current={currentQuestionIndex} total={total} label="Question"/>
        <button onClick={submitQuiz} className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg flex items-center justify-center gap-2"><Check size={20}/> Answers Complete ({answeredCount}/{total} answered)</button>
        <ExitModal/>
      </div>
    );
  }

  if (mode==='assessment' && activeQuiz?.type==='datadash') {
    const q=activeQuestions[currentQuestionIndex]; const total=activeQuestions.length;
    const answeredCount=Object.keys(studentAnswers).filter(k=>{const v=(studentAnswers[k]||'').toString().replace(/,/g,'').trim();return v!==''&&!isNaN(parseFloat(v));}).length;
    const curVal = studentAnswers[currentQuestionIndex] || '';
    const curNumeric = curVal.toString().replace(/,/g,'').trim();
    const isValidNum = curNumeric === '' || !isNaN(parseFloat(curNumeric));
    return (
      <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">{activeQuiz.title}</h1>
          <button onClick={()=>setShowResetModal(true)} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-medium text-sm">Exit Quiz</button>
        </div>
        <div className="bg-white rounded-xl shadow-md p-8 mb-6">
          <div className="text-xl text-gray-800 font-semibold mb-6">{renderPrompt(q.prompt)}</div>
          <input
            type="text"
            value={curVal}
            onChange={e=>setStudentAnswers(p=>({...p,[currentQuestionIndex]:e.target.value}))}
            placeholder="Enter a number..."
            className={`w-full px-4 py-3 border-2 rounded-lg text-gray-800 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isValidNum ? 'border-red-400' : 'border-gray-300'}`}
          />
          {!isValidNum && <p className="text-red-600 text-sm mt-2">Please enter a valid number (commas are ok, e.g. 1,234.5)</p>}
        </div>
        <NavBar current={currentQuestionIndex} total={total} label="Question"/>
        <button
          onClick={()=>{
            // Validate all answers are numbers before submitting
            const invalid = Object.entries(studentAnswers).filter(([,v])=>{const c=(v||'').toString().replace(/,/g,'').trim();return c!==''&&isNaN(parseFloat(c));});
            if(invalid.length>0){alert('Some of your answers are not valid numbers. Please check and correct them before submitting.');return;}
            submitQuiz();
          }}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg flex items-center justify-center gap-2"
        ><Check size={20}/> Answers Complete ({answeredCount}/{total} answered)</button>
        <ExitModal/>
      </div>
    );
  }

  if (mode==='assessment' && activeQuiz?.type==='openresponse') {
    const q=activeQuestions[currentQuestionIndex]; const total=activeQuestions.length;
    const answeredCount=Object.keys(studentAnswers).filter(k=>(studentAnswers[k]||'').trim()!=='').length;
    return (
      <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">{activeQuiz.title}</h1>
          <button onClick={()=>setShowResetModal(true)} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-medium text-sm">Exit Quiz</button>
        </div>
        <div className="bg-white rounded-xl shadow-md p-8 mb-6">
          <div className="text-xl text-gray-800 font-semibold mb-6">{renderPrompt(q.prompt)}</div>
          <input type="text" value={studentAnswers[currentQuestionIndex]||''} onChange={e=>setStudentAnswers(p=>({...p,[currentQuestionIndex]:e.target.value}))} placeholder="Type your answer here..." className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-800 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
        </div>
        <NavBar current={currentQuestionIndex} total={total} label="Question"/>
        <button onClick={submitQuiz} className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg flex items-center justify-center gap-2"><Check size={20}/> Answers Complete ({answeredCount}/{total} answered)</button>
        <ExitModal/>
      </div>
    );
  }

  if (mode==='assessment' && activeQuiz?.type==='combination') {
    const q=activeQuestions[currentQuestionIndex]; const total=activeQuestions.length;
    const answeredCount=activeQuestions.filter((aq,i)=>{const qt=aq.questionType;if(qt==='MC')return(studentAnswers[i]||[]).length>0;if(qt==='OR')return(studentAnswers[i]||'').trim()!=='';return studentAnswers[i]!==undefined;}).length;
    const qWithDisplay=q.questionType==='MC'?{...q,displayOptions:q.options.map((opt,i)=>({opt,correct:q.correctIndices.includes(i)})).filter(o=>o.opt.trim()!=='')}:q;
    const fitbAnswers=activeQuestions.filter(aq=>aq.questionType==='FITB').map(aq=>parseSentence(aq.text).answer);
    const sortedWB=[...new Set(fitbAnswers)].sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'}));
    const usedFITB=activeQuestions.map((_,i)=>studentAnswers[i]).filter(Boolean);
    return (
      <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{activeQuiz.title}</h1>
          <button onClick={()=>setShowResetModal(true)} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-medium text-sm">Exit Quiz</button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${q.questionType==='MC'?'bg-purple-100 text-purple-700':q.questionType==='OR'?'bg-orange-100 text-orange-700':'bg-blue-100 text-blue-700'}`}>{shortTypeLabel(q.questionType)}</span>
        </div>
        {q.questionType==='FITB' && sortedWB.length>0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Word Bank</h2>
            <div className="flex flex-wrap gap-2">{sortedWB.map(word=>{const isUsed=usedFITB.includes(word);const isCur=studentAnswers[currentQuestionIndex]===word;return <button key={word} onClick={()=>selectWord(word)} className={`px-4 py-2 rounded-lg font-semibold transition-all border-2 ${isCur?'bg-green-600 text-white border-green-600 ring-2 ring-green-300':isUsed?'bg-gray-200 text-gray-400 border-gray-200':'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'}`}>{word}</button>;})}</div>
          </div>
        )}
        {q.questionType==='FITB' && (()=>{const{display}=parseSentence(q.text||'');const cur=studentAnswers[currentQuestionIndex];const parts=display.split('______');return(<div className="bg-white rounded-xl shadow-md p-8 mb-6"><p className="text-2xl text-gray-800 leading-relaxed font-medium">{parts[0]}{cur?<span className="text-blue-600 font-bold">{cur}</span>:<span className="inline-block border-b-2 border-gray-400 w-28 mx-1 align-bottom"/>}{parts[1]}</p></div>);})()}
        {q.questionType==='MC' && (()=>{const sels=studentAnswers[currentQuestionIndex]||[];const multi=qWithDisplay.displayOptions.filter(o=>o.correct).length>1;return(<div className="bg-white rounded-xl shadow-md p-8 mb-6"><div className="text-xl text-gray-800 font-semibold mb-2">{renderPrompt(q.prompt)}</div>{multi&&<p className="text-sm text-blue-600 mb-4 font-medium">Select all that apply.</p>}<div className="space-y-3 mt-4">{qWithDisplay.displayOptions.map((optObj,i)=><button key={i} onClick={()=>toggleMCAnswer(currentQuestionIndex,optObj.opt)} className={`w-full text-left px-5 py-3 rounded-lg border-2 font-medium transition-all ${sels.includes(optObj.opt)?'bg-green-600 text-white border-green-600':'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>{optObj.opt}</button>)}</div></div>);})()}
        {q.questionType==='OR' && (<div className="bg-white rounded-xl shadow-md p-8 mb-6"><div className="text-xl text-gray-800 font-semibold mb-6">{renderPrompt(q.prompt)}</div><input type="text" value={studentAnswers[currentQuestionIndex]||''} onChange={e=>setStudentAnswers(p=>({...p,[currentQuestionIndex]:e.target.value}))} placeholder="Type your answer here..." className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-800 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/></div>)}
        <NavBar current={currentQuestionIndex} total={total} label="Question"/>
        <button onClick={submitQuiz} className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg flex items-center justify-center gap-2"><Check size={20}/> Answers Complete ({answeredCount}/{total} answered)</button>
        <ExitModal/>
      </div>
    );
  }

  if (mode==='settings') {
    const hasChanges = notifyNewQuiz !== savedNotifyNewQuiz || notifyScored !== savedNotifyScored;
    return (
      <div className="max-w-2xl mx-auto bg-gray-50 min-h-screen" style={{padding:"1.5rem"}}>
        {/* Header row */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
          <span className="text-sm text-gray-500">{displayName || currentUser?.email || ''}</span>
          <div className="flex gap-2">
            <button onClick={()=>setMode('setup')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Quizzes</button>
            <button onClick={()=>setMode('scoreboards')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">Scoreboards</button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"><LogOut size={16}/> Log Out</button>
          </div>
        </div>
        {/* Title */}
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Profile Settings</h1>
        </div>
        {/* User info card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Account Info</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Display Name</label>
              <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 text-sm italic select-none">{displayName || '—'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Email</label>
              <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 text-sm italic select-none">{currentUser?.email || '—'}</div>
            </div>
          </div>
        </div>
        {/* Notifications card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Email Notifications</h2>
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={notifyNewQuiz} onChange={e=>setNotifyNewQuiz(e.target.checked)} className="w-5 h-5 mt-0.5 rounded accent-blue-600 flex-shrink-0"/>
              <div>
                <p className="text-sm font-medium text-gray-700">Email me when a new quiz is posted.</p>
                <p className="text-xs text-gray-400 mt-0.5">You'll receive a notification each time a quiz becomes available.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={notifyScored} onChange={e=>setNotifyScored(e.target.checked)} className="w-5 h-5 mt-0.5 rounded accent-blue-600 flex-shrink-0"/>
              <div>
                <p className="text-sm font-medium text-gray-700">Email me when a quiz I took is scored.</p>
                <p className="text-xs text-gray-400 mt-0.5">You'll be notified when results are posted for a quiz you completed.</p>
              </div>
            </label>
          </div>
        </div>
        <button
          onClick={saveNotificationSettings}
          disabled={!hasChanges || settingsSaving}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {settingsSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    );
  }

  if (mode==='scoreboards') return <ScoreboardsListScreen currentUser={currentUser} displayName={displayName} allQuizData={allQuizData} onSelectQuiz={(key)=>{setViewScoringKey(key);setMode('scoreboard');}} onSelectSeason={(name)=>{setViewSeasonName(name);setMode('season-scoreboard');}} onQuizzes={()=>setMode('setup')} onLogout={handleLogout} isAdminView={isAdminAuthenticated && !currentUser} onAdminDashboard={()=>setMode('admin')} onHelp={()=>setShowHelpModal('scoreboards')} onSettings={!isAdminAuthenticated ? ()=>setMode('settings') : undefined}/>;

  if (mode==='season-scoreboard' && viewSeasonName) return <SeasonScoreboardScreen seasonName={viewSeasonName} currentUser={currentUser} displayName={displayName} allQuizData={allQuizData} onBack={()=>setMode('scoreboards')} onQuizzes={()=>setMode('setup')} onLogout={handleLogout} isAdminView={isAdminAuthenticated && !currentUser} onAdminDashboard={()=>setMode('admin')}/>;


  if (mode==='scoreboard' && viewScoringKey) {
    const quiz = allQuizData[viewScoringKey];
    return <ScoreboardScreen quiz={quiz} quizKey={viewScoringKey} currentUser={currentUser} displayName={displayName} onBack={()=>setMode('scoreboards')} onQuizzes={()=>setMode('setup')} onLogout={handleLogout} isAdminView={isAdminAuthenticated && !currentUser} onAdminDashboard={()=>setMode('admin')}/>;
  }

  if (mode==='authornote') return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-end mb-4">
        <button onClick={()=>setShowResetModal(true)} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-medium text-sm">Exit Quiz</button>
      </div>
      <div className="bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Author's Note</h1>
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{activeQuiz?.authorNote}</p>
        <button onClick={()=>setMode('assessment')} className="w-full mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg">Continue to Quiz</button>
      </div>
      {showResetModal&&(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Exit Quiz?</h2>
            <p className="text-gray-600 mb-6">Your answers will be saved and you can continue this quiz later.</p>
            <div className="flex gap-3">
              <button onClick={async()=>{await saveProgress();setShowResetModal(false);setMode('setup');}} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">Yes, Exit</button>
              <button onClick={()=>setShowResetModal(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (mode==='summary') {
    // Build the pool of tokens from the quiz's tokenSlots config
    const tokenSlots = activeQuiz?.tokenSlots || ['doubler','doubler','doubler','none','none','none'];
    const allTokens = tokenSlots
      .filter(t => t !== 'none')
      .map((t, i) => ({ tokenType: t, instanceId: `slot-${i}` }));

    // Tokens already assigned to questions
    const assignedInstanceIds = new Set(
      Object.entries(tokenAssignments).map(([qi, tt]) => {
        // find the instanceId for this assignment by matching tokenType in order
        const idx = allTokens.findIndex(tok => tok.tokenType === tt &&
          !Object.entries(tokenAssignments)
            .filter(([qi2]) => qi2 < qi)
            .some(([, tt2]) => tt2 === tt && allTokens.findIndex(tok2 => tok2.tokenType === tt2) === allTokens.indexOf(tok)));
        return idx >= 0 ? allTokens[idx].instanceId : null;
      }).filter(Boolean)
    );

    // Simpler: track which instanceIds are in the bin vs assigned
    // Build a map: tokenType -> list of instanceIds available
    const assignedByType = {};
    Object.values(tokenAssignments).forEach(tt => { assignedByType[tt] = (assignedByType[tt]||0)+1; });
    const binTokens = allTokens.filter(tok => {
      const used = assignedByType[tok.tokenType] || 0;
      const totalOfType = allTokens.filter(t2 => t2.tokenType === tok.tokenType).length;
      // show this token in bin if there are still unassigned copies
      const assignedSoFar = allTokens
        .filter(t2 => t2.tokenType === tok.tokenType)
        .filter(t2 => t2.instanceId < tok.instanceId)
        .length;
      // count how many of this type are assigned
      return assignedSoFar >= (assignedByType[tok.tokenType] || 0)
        ? false
        : true;
    });
    // Simpler approach: just compute remaining counts
    const remainingByType = {};
    allTokens.forEach(tok => { remainingByType[tok.tokenType] = (remainingByType[tok.tokenType]||0)+1; });
    Object.values(tokenAssignments).forEach(tt => { if (remainingByType[tt]) remainingByType[tt]--; });
    const binTokensList = Object.entries(remainingByType).flatMap(([tt, count]) =>
      Array.from({length: count}, (_, i) => ({ tokenType: tt, instanceId: `bin-${tt}-${i}` }))
    );

    const totalTokens = allTokens.length;
    const assignedCount = Object.keys(tokenAssignments).length;
    const allAssigned = assignedCount === totalTokens;

    const handleTapToken = (tokenType, fromQuestion, instanceId) => {
      if (tapSelected) {
        if (tapSelected.instanceId === instanceId && tapSelected.fromQuestion === fromQuestion) {
          setTapSelected(null); return;
        }
        if (fromQuestion === null) { setTapSelected({ tokenType, fromQuestion, instanceId }); return; }
      }
      setTapSelected({ tokenType, fromQuestion: fromQuestion ?? null, instanceId });
    };
    const handleTapQuestion = (questionIndex) => {
      if (!tapSelected) return;
      const { tokenType, fromQuestion } = tapSelected;
      if (tokenAssignments[questionIndex] && fromQuestion !== questionIndex) {
        setTapSelected(null); return;
      }
      setTokenAssignments(prev => {
        const next = { ...prev };
        if (fromQuestion !== null) delete next[fromQuestion];
        next[questionIndex] = tokenType;
        return next;
      });
      setTapSelected(null);
    };
    const handleTapBin = () => {
      if (!tapSelected || tapSelected.fromQuestion === null) { setTapSelected(null); return; }
      setTokenAssignments(prev => { const next = {...prev}; delete next[tapSelected.fromQuestion]; return next; });
      setTapSelected(null);
    };

    const TokenChip = ({ tokenType, size=36, onClick, isSelected=false, style={} }) => {
      const cfg = TOKEN_CONFIG[tokenType];
      if (!cfg) return null;
      return (
        <div
          onClick={onClick}
          title={cfg.description}
          style={{
            width: size, height: size, borderRadius: '50%', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', cursor: onClick ? 'pointer' : 'default',
            border: `2px solid ${isSelected ? '#6366f1' : cfg.border}`,
            boxShadow: isSelected ? '0 0 0 3px #a5b4fc' : '0 1px 3px rgba(0,0,0,0.15)',
            background: cfg.bg, flexShrink: 0, ...style
          }}
        >
          {cfg.svgIcon(size - 6)}
        </div>
      );
    };

    return (
      <><HelpModal/>
      <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500">{displayName || currentUser?.email || ''}</span>
          <div className="flex gap-2">
            <button onClick={()=>setShowHelpModal('summary')} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium text-sm">?</button>
            <button onClick={()=>{setCurrentQuestionIndex(0);setMode('assessment');}} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-medium text-sm">← Back to Questions</button>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-4">{activeQuiz?.title}</h1>

        {/* Question table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-7">Question</div>
            <div className="col-span-2 text-center">Your Answer</div>
            <div className="col-span-2 text-center">Token</div>
          </div>
          {activeQuestions.map((q, i) => {
            const assigned = tokenAssignments[i];
            const cfg = assigned ? TOKEN_CONFIG[assigned] : null;
            const isBeingMoved = tapSelected?.fromQuestion === i;
            return (
              <div
                key={i}
                onClick={() => handleTapQuestion(i)}
                className={`grid grid-cols-12 gap-2 px-4 py-3 border-b last:border-b-0 items-center transition-colors
                  ${assigned && !isBeingMoved ? 'bg-yellow-50' : 'bg-white'}
                  ${tapSelected && !assigned ? 'cursor-pointer' : ''}`}
              >
                <div className="col-span-1 text-center text-sm font-medium text-gray-500">{i+1}</div>
                <div className="col-span-7 text-sm text-gray-700 pr-3">{getPromptPreview(q)}</div>
                <div className="col-span-2 text-sm text-blue-700 font-medium text-center">{getAnswerDisplay(q, i)}</div>
                <div className="col-span-2 flex justify-center items-center min-h-[40px]">
                  {assigned && cfg ? (
                    <TokenChip
                      tokenType={assigned}
                      size={36}
                      isSelected={isBeingMoved}
                      onClick={e => { e.stopPropagation(); handleTapToken(assigned, i, `q-${i}`); }}
                    />
                  ) : (
                    <div style={{ width:36, height:36, borderRadius:'50%', border: '2px dashed #d1d5db', background: 'transparent' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Spacer so content doesn't hide behind the fixed bin */}
        <div style={{height: '260px'}}/>

        {/* Token bin + Final Submission — fixed to bottom of viewport */}
        <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:40}}>
        <div style={{maxWidth:'48rem',margin:'0 auto'}}>
        <div className="bg-white border-t border-gray-200 shadow-lg px-5 pt-4 pb-4 text-center rounded-t-2xl" onClick={handleTapBin}>
          <p className="text-sm font-semibold text-gray-700 mb-1">Your tokens — tap to select, then tap a question to assign</p>
          <p className="text-xs text-gray-400 mb-3">Hover over a token to see what it does. Tap an assigned token to pick it back up.</p>
          {binTokensList.length > 0 ? (
            <div className="flex flex-wrap gap-3 items-center justify-center">
              {binTokensList.map((tok) => (
                <div key={tok.instanceId} className="flex flex-col items-center gap-1">
                  <TokenChip
                    tokenType={tok.tokenType}
                    size={40}
                    isSelected={tapSelected?.instanceId === tok.instanceId && tapSelected?.fromQuestion === null}
                    onClick={e => { e.stopPropagation(); handleTapToken(tok.tokenType, null, tok.instanceId); }}
                  />
                  <span className="text-xs text-gray-500 capitalize">{tok.tokenType}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">All tokens assigned ✓</p>
          )}
          <p className={`text-sm font-medium mt-2 ${allAssigned ? 'text-green-700' : 'text-gray-500'}`}>
            {allAssigned
              ? `✓ All ${totalTokens} token${totalTokens !== 1 ? 's' : ''} assigned.`
              : `${assignedCount} of ${totalTokens} token${totalTokens !== 1 ? 's' : ''} assigned.`}
          </p>
          <button
            onClick={e => { e.stopPropagation(); handleFinalSubmission(); }}
            disabled={!allAssigned}
            className="mt-3 w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Check size={20}/> Final Submission
          </button>
        </div>
        </div>
        </div>
      </div></>
    );
  }

  if (mode==='submitted') {
    const hasDisputes = Object.values(disputedQuestions).some(v=>v);
    return (
      <div className="max-w-5xl mx-auto p-6 bg-gray-50 min-h-screen">
        {/* Header row */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500">{displayName || currentUser?.email || ''}</span>
          <div className="flex gap-2">
            <button onClick={()=>setShowHelpModal('submitted')} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 font-medium text-sm">?</button>
            <button onClick={()=>setMode('scoreboards')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm">Scoreboards</button>
            <button onClick={()=>setMode('setup')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Quizzes</button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"><LogOut size={16}/> Log Out</button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Quiz Submitted!</h1>
          <p className="text-gray-600">Your answers for <span className="font-semibold">{activeQuiz?.title}</span> have been recorded. Results and scores will be posted once everyone has completed the quiz — stay tuned!</p>
          {Object.keys(tokenAssignments).length > 0 && <p className="text-sm text-gray-500 mt-2">Token icons show your assignments.</p>}
        </div>
        {activeQuiz?.type === 'datadash' ? (
          /* ── Data Dash submitted view ── */
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
            <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-gray-100 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Question</div>
              <div className="col-span-2 text-center">Correct Answer</div>
              <div className="col-span-2 text-center">Your Answer</div>
              <div className="col-span-2 text-center">Difference</div>
              <div className="col-span-1 text-center">Dispute</div>
            </div>
            {activeQuestions.map((q, i) => {
              const assignedToken = tokenAssignments[i];
              const myRaw = (studentAnswers[i] || '').toString().replace(/,/g,'').trim();
              const myVal = parseFloat(myRaw);
              const diff = isNaN(myVal) ? '—' : Math.abs(myVal - q.correctAnswer).toLocaleString();
              const alreadyDisputed = submittedDisputes.includes(i);
              const disputing = disputedQuestions[i] || false;
              return (
                <div key={i} className="border-b last:border-b-0 bg-white">
                  <div className="grid grid-cols-12 gap-2 px-5 py-3 items-center">
                    <div className="col-span-1 text-center text-sm font-medium text-gray-500 flex flex-col items-center gap-1">
                      {i+1}
                      {assignedToken && TOKEN_CONFIG[assignedToken] && (
                        <span title={TOKEN_CONFIG[assignedToken].description}>{TOKEN_CONFIG[assignedToken].svgIcon(20)}</span>
                      )}
                    </div>
                    <div className="col-span-4 text-sm text-gray-700">{getPromptPreview(q)}</div>
                    <div className="col-span-2 text-sm text-gray-600 text-center">{q.correctAnswer?.toLocaleString() ?? '—'}</div>
                    <div className="col-span-2 text-sm font-medium text-center text-gray-700">{myRaw || '—'}</div>
                    <div className="col-span-2 text-sm text-center text-gray-500">{diff}</div>
                    <div className="col-span-1 flex flex-col items-center justify-center">
                      {alreadyDisputed
                        ? <><input type="checkbox" checked readOnly className="w-5 h-5 mb-1 cursor-not-allowed opacity-40"/><span className="text-xs text-gray-400 italic">Disputed</span></>
                        : <input type="checkbox" checked={disputing} onChange={e=>setDisputedQuestions(p=>({...p,[i]:e.target.checked}))} className="w-5 h-5 accent-red-500 cursor-pointer"/>}
                    </div>
                  </div>
                  {disputing && !alreadyDisputed && (
                    <div className="px-5 pb-3">
                      <textarea value={disputeReasons[i]||''} onChange={e=>setDisputeReasons(p=>({...p,[i]:e.target.value}))} placeholder="Briefly explain your dispute, e.g. the correct answer should be 46, not 45." rows={2} className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-300 resize-none"/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Standard submitted view ── */
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
            <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-gray-100 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-6">Question</div>
              <div className="col-span-2 text-center leading-tight">Your Answer</div>
              <div className="col-span-2 text-center">Correct Answer</div>
              <div className="col-span-1 text-center">Dispute</div>
            </div>
            {activeQuestions.map((q, i) => {
              const correct = isQuestionCorrect(q, i);
              const assignedToken = tokenAssignments[i];
              const alreadyDisputed = submittedDisputes.includes(i);
              const disputing = disputedQuestions[i] || false;
              return (
                <div key={i} className={`border-b last:border-b-0 ${correct ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="grid grid-cols-12 gap-2 px-5 py-3 items-center">
                    <div className="col-span-1 text-center text-sm font-medium text-gray-500 flex flex-col items-center gap-1">
                      {i+1}
                      {assignedToken && TOKEN_CONFIG[assignedToken] && (
                        <span title={TOKEN_CONFIG[assignedToken].description}>
                          {TOKEN_CONFIG[assignedToken].svgIcon(20)}
                        </span>
                      )}
                    </div>
                    <div className="col-span-6 text-sm text-gray-700">{getPromptPreview(q)}</div>
                    <div className={`col-span-2 text-sm font-medium text-center ${correct ? 'text-green-700' : 'text-red-600'}`}>{getAnswerDisplay(q, i)}</div>
                    <div className="col-span-2 text-sm text-gray-600 text-center">{getCorrectAnswerDisplay(q)}</div>
                    <div className="col-span-1 flex flex-col items-center justify-center">
                      {alreadyDisputed
                        ? <><input type="checkbox" checked readOnly className="w-5 h-5 mb-1 cursor-not-allowed opacity-40"/><span className="text-xs text-gray-400 italic">Disputed</span></>
                        : correct ? null
                        : <input type="checkbox" checked={disputing} onChange={e=>setDisputedQuestions(p=>({...p,[i]:e.target.checked}))} className="w-5 h-5 accent-red-500 cursor-pointer"/>}
                    </div>
                  </div>
                  {disputing && !alreadyDisputed && (
                    <div className="px-5 pb-3">
                      <textarea value={disputeReasons[i]||''} onChange={e=>setDisputeReasons(p=>({...p,[i]:e.target.value}))} placeholder="Briefly explain why you disagree, i.e., spelling error, factual error, etc." rows={2} className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-300 resize-none"/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <button onClick={handleSendDisputes} disabled={!hasDisputes||disputeSending} className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed">{disputeSending?'Sending...':'Send Disputes'}</button>
      </div>
    );
  }

  if (mode==='results' && activeQuiz?.type==='fillintheblank') {
    const{correct,total}=getScore();
    return (
      <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
        <Header title="Quiz Results" rightSlot={<button onClick={()=>setMode('setup')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">New Quiz</button>}/>
        <ScoreBanner correct={correct} total={total}/>
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">{activeQuestions.map((_,i)=>renderResultRow(activeQuestions[i],i,'fillintheblank'))}</div>
        <button onClick={()=>{setActiveQuestions(shuffleArray(activeQuiz.sentences));setCurrentQuestionIndex(0);setStudentAnswers({});setMode('assessment');}} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg">Retry This Quiz</button>
      </div>
    );
  }

  if (mode==='results' && activeQuiz?.type==='MC') {
    const{correct,total}=getScore();
    return (
      <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
        <Header title="Quiz Results" rightSlot={<button onClick={()=>setMode('setup')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">New Quiz</button>}/>
        <ScoreBanner correct={correct} total={total}/>
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">{activeQuestions.map((_,i)=>renderResultRow(activeQuestions[i],i,'MC'))}</div>
        <button onClick={()=>{const qs=activeQuiz.randomizeQuestions?shuffleArray(activeQuiz.questions):[...activeQuiz.questions];setActiveQuestions(qs.map(q=>({...q,displayOptions:(q.randomizeOptions?shuffleArray:x=>x)(q.options.map((opt,i)=>({opt,correct:q.correctIndices.includes(i)})).filter(o=>o.opt.trim()!==''))})));setCurrentQuestionIndex(0);setStudentAnswers({});setMode('assessment');}} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg">Retry This Quiz</button>
      </div>
    );
  }

  if (mode==='results' && activeQuiz?.type==='openresponse') {
    const{correct,total}=getScore();
    return (
      <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
        <Header title="Quiz Results" rightSlot={<button onClick={()=>setMode('setup')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">New Quiz</button>}/>
        <ScoreBanner correct={correct} total={total}/>
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">{activeQuestions.map((_,i)=>renderResultRow(activeQuestions[i],i,'openresponse'))}</div>
        <OthersPopup/>
        <button onClick={()=>{const qs=activeQuiz.randomizeQuestions?shuffleArray(activeQuiz.questions):[...activeQuiz.questions];setActiveQuestions(qs);setCurrentQuestionIndex(0);setStudentAnswers({});setMode('assessment');}} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg">Retry This Quiz</button>
      </div>
    );
  }

  if (mode==='results' && activeQuiz?.type==='combination') {
    const{correct,total}=getScore();
    const questionsForDisplay=activeQuestions.map(q=>q.questionType==='MC'?{...q,displayOptions:q.options.map((opt,i)=>({opt,correct:q.correctIndices.includes(i)})).filter(o=>o.opt.trim()!=='')}:q);
    return (
      <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
        <Header title="Quiz Results" rightSlot={<button onClick={()=>setMode('setup')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">New Quiz</button>}/>
        <ScoreBanner correct={correct} total={total}/>
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          {questionsForDisplay.map((q,i)=>renderResultRow(q,i,'combination',i+1))}
        </div>
        <OthersPopup/>
        <button onClick={()=>{setActiveQuestions([...activeQuiz.questions]);setCurrentQuestionIndex(0);setStudentAnswers({});setMode('assessment');}} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg">Retry This Quiz</button>
      </div>
    );
  }
  if (mode==='admin' && !isAdminAuthenticated) return (
    <div className="max-w-md mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-md p-8 mt-12">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Login</h1>
        {loginError&&<div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{loginError}</div>}
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-600 mb-1">Username</label><input type="text" value={adminUsername} onChange={e=>setAdminUsername(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/></div>
          <div><label className="block text-sm font-medium text-gray-600 mb-1">Password</label><input type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&adminLogin()} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/></div>
          <button onClick={adminLogin} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Login</button>
          <button onClick={()=>setMode('login')} className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Back to Main Login Page</button>
        </div>
      </div>
    </div>
  );

  if (mode==='admin' && isAdminAuthenticated) {
    const autoWordBank=extractAnswerWords(newQuizSentences.map(t=>({text:t})));
    const fullWordBank=Array.from(new Set([...autoWordBank,...extraWords]));
    const mcQ=mcQuestions[mcCurrentIndex]||emptyMCQuestion();
    const orQ=orQuestions[orCurrentIndex]||emptyORQuestion();
    const effectiveCategory=getEffectiveCategory();

    // QuizDetailsPanel inlined at call site

    // CombDraftEditor inlined at call site


    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex gap-2">
            <button onClick={()=>setMode('scoreboards')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">Scoreboards</button>
            <button onClick={()=>setAdminSection('users')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Manage Users</button>
            <button onClick={adminLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"><LogOut size={18}/> Log Out</button>
          </div>
        </div>
        {adminSection!=='users'&&<div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
          <button onClick={()=>{setAdminSection('list');resetQuizBuilder();}} className={`px-5 py-2 rounded-lg font-medium ${adminSection==='list'?'bg-gray-800 text-white':'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'}`}>Existing Quizzes</button>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${adminSection==='create'&&!editingKey?'border-gray-800 bg-gray-50':'border-gray-300 bg-white'}`}>
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">New Quiz:</span>
            <select value={newQuizTypeSelector} onChange={e=>setNewQuizTypeSelector(e.target.value)} className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500">
              <option value="openresponse">Open Response</option>
              <option value="datadash">Data Dash</option>
            </select>
            <button onClick={startCreateQuiz} className="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm font-medium">Create</button>
          </div>
          <button onClick={()=>setAdminSection('audit')} className={`px-5 py-2 rounded-lg font-medium ${adminSection==='audit'?'bg-gray-800 text-white':'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'}`}>Score Auditor</button>
        </div>}

        {adminSection==='list'&&(
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium text-gray-600">Season:</label>
              <select value={adminSeasonFilter} onChange={e=>setAdminSeasonFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="All">All</option>
                <option value="Offseason">Offseason</option>
                {Array.from(new Set(Object.values(allQuizData).map(q=>q.category).filter(c=>c&&c.trim().toLowerCase()!=='offseason'))).sort((a,b)=>a.localeCompare(b)).map(cat=><option key={cat} value={cat}>{cat}</option>)}
              </select>
              <div className="flex items-center gap-4 ml-2">
                {['Active','Inactive','Scored'].map(status=>(
                  <label key={status} className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={adminStatusFilter[status]} onChange={()=>setAdminStatusFilter(p=>({...p,[status]:!p[status]}))} className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
                    <span className="text-sm text-gray-600">{status}</span>
                  </label>
                ))}
              </div>
            </div>
            {knownQuizzes.quizzes.filter(key=>{const q=allQuizData[key];if(!q)return false;const seasonOk=adminSeasonFilter==='All'||(q.category||'')=== adminSeasonFilter;const statusOk=adminStatusFilter[q.status||'Active'];return seasonOk&&statusOk;}).map(key=>{
              const quiz=allQuizData[key];if(!quiz)return null;
              const qType=quiz.type||'fillintheblank';
              const itemCount=qType==='fillintheblank'?quiz.sentences?.length:quiz.questions?.length;
              const itemLabel=qType==='fillintheblank'?'sentence':'question';
              return (
                <div key={key} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{quiz.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${(quiz.status||'Active')==='Active'?'bg-green-100 text-green-700':(quiz.status||'Active')==='Scored'?'bg-purple-100 text-purple-700':'bg-gray-200 text-gray-500'}`}>{quiz.status||'Active'}</span>
                        {quiz.category&&<span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">{quiz.category}</span>}
                        <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{typeLabel(qType)}</span>
                        {itemCount} {itemLabel}{itemCount!==1?'s':''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>startEditQuiz(key)} className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"><Edit2 size={16}/> Edit</button>
                      {(quiz.status||'Active')==='Scored' && <button onClick={()=>{setViewScoringKey(key);setMode('scoreboard');}} className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"><Star size={16}/> View Scoring</button>}
                      <button onClick={()=>setConfirmDeleteKey(key)} className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <details className="mt-4">
                    <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800 font-medium">View {qType==='fillintheblank'?'sentences':'questions'}</summary>
                    <ol className="mt-3 space-y-2 list-decimal list-inside">
                      {qType==='fillintheblank'
                        ?quiz.sentences?.map((s,i)=><li key={i} className="text-sm text-gray-700">{s.text}</li>)
                        :quiz.questions?.map((q,i)=><li key={i} className="text-sm text-gray-700">{qType==='combination'?<span><span className={`inline-block mr-2 px-1.5 py-0.5 rounded text-xs font-bold ${q.questionType==='MC'?'bg-purple-100 text-purple-700':q.questionType==='OR'?'bg-orange-100 text-orange-700':'bg-blue-100 text-blue-700'}`}>{shortTypeLabel(q.questionType)}</span>{q.prompt||q.text}</span>:q.prompt}</li>)
                      }
                    </ol>
                  </details>
                </div>
              );
            })}
          </div>
        )}

        {adminSection==='create'&&(
          <div className="space-y-6">
            {editingKey&&<div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-blue-700 font-medium text-sm">Editing: <span className="font-bold">{allQuizData[editingKey]?.title}</span><span className="ml-3 inline-block bg-blue-200 text-blue-800 px-2 py-0.5 rounded text-xs">{typeLabel(newQuizType)}</span></div>}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Quiz Details</h2>
              {/* Row 1: Title (full width) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">Quiz Title <span className="text-red-500">*</span></label>
                <input type="text" value={newQuizTitle} onChange={e=>setNewQuizTitle(e.target.value)} placeholder="e.g. General Knowledge MMIV" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
              </div>
              {/* Row 2: Season (wider) + Status + Closing Date */}
              <div className="flex gap-3 items-end mb-3">
                <div style={{flex:'1 1 0',minWidth:0}}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Season <span className="text-red-500">*</span></label>
                  <select value={showNewCategoryInput?'__new__':newQuizCategory} onChange={e=>{if(e.target.value==='__new__'){setShowNewCategoryInput(true);setNewQuizCategory('');}else{setShowNewCategoryInput(false);setNewQuizCategory(e.target.value);}}} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">— Season —</option>
                    {allCategoriesAdmin.map(cat=><option key={cat} value={cat}>{cat}</option>)}
                    <option value="__new__">+ New…</option>
                  </select>
                </div>
                <div style={{flexShrink:0}}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status <span className="text-red-500">*</span></label>
                  <select value={newQuizStatus} onChange={e=>setNewQuizStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Scored">Scored</option>
                  </select>
                </div>
                <div style={{flexShrink:0}}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Closing Date</label>
                  <div style={{position:'relative'}}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!showDatePicker && !newQuizClosingDate) {
                          const d = new Date();
                          setDatePickerMonth({ year: d.getFullYear(), month: d.getMonth() });
                        }
                        setShowDatePicker(p => !p);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-36 text-left bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {newQuizClosingDate || <span className="text-gray-400">Pick a date…</span>}
                    </button>
                    {newQuizClosingDate && (
                      <button type="button" onClick={() => { setNewQuizClosingDate(''); setShowDatePicker(false); }} className="ml-1 text-gray-400 hover:text-gray-600 text-xs align-middle">✕</button>
                    )}
                    {showDatePicker && (() => {
                      const { year, month } = datePickerMonth;
                      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const selectedParts = newQuizClosingDate ? newQuizClosingDate.split('/') : [];
                      const selY = selectedParts.length === 3 ? parseInt(selectedParts[2]) : null;
                      const selM = selectedParts.length === 3 ? parseInt(selectedParts[0]) - 1 : null;
                      const selD = selectedParts.length === 3 ? parseInt(selectedParts[1]) : null;
                      const cells = [];
                      for (let i = 0; i < firstDay; i++) cells.push(null);
                      for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                      while (cells.length % 7 !== 0) cells.push(null);
                      return (
                        <div style={{position:'absolute',top:'100%',left:0,zIndex:50,marginTop:4,background:'white',border:'1px solid #d1d5db',borderRadius:8,boxShadow:'0 4px 16px rgba(0,0,0,0.12)',padding:10,width:240}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                            <button type="button" onClick={()=>setDatePickerMonth(p=>{ const d=new Date(p.year,p.month-1,1); return {year:d.getFullYear(),month:d.getMonth()}; })} className="px-2 py-0.5 rounded hover:bg-gray-100 text-gray-600 font-bold">‹</button>
                            <span className="text-sm font-semibold text-gray-700">{monthNames[month]} {year}</span>
                            <button type="button" onClick={()=>setDatePickerMonth(p=>{ const d=new Date(p.year,p.month+1,1); return {year:d.getFullYear(),month:d.getMonth()}; })} className="px-2 py-0.5 rounded hover:bg-gray-100 text-gray-600 font-bold">›</button>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
                            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><div key={d} style={{textAlign:'center',fontSize:11,fontWeight:600,color:'#9ca3af',paddingBottom:2}}>{d}</div>)}
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
                            {cells.map((d, i) => {
                              const isSelected = d && selY === year && selM === month && selD === d;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  disabled={!d}
                                  onClick={() => { if (d) { setNewQuizClosingDate(`${month+1}/${d}/${year}`); setShowDatePicker(false); } }}
                                  style={{
                                    textAlign:'center', fontSize:12, padding:'3px 0', borderRadius:4,
                                    background: isSelected ? '#2563eb' : 'transparent',
                                    color: isSelected ? 'white' : d ? '#374151' : 'transparent',
                                    fontWeight: isSelected ? 700 : 400,
                                    cursor: d ? 'pointer' : 'default',
                                    border: 'none',
                                  }}
                                  className={d && !isSelected ? 'hover:bg-blue-50' : ''}
                                >{d || ''}</button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
              {showNewCategoryInput&&<div className="mb-3"><input type="text" value={newCategoryInput} onChange={e=>setNewCategoryInput(e.target.value)} placeholder="New season name" autoFocus className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500"/></div>}
              {effectiveCategory&&<p className="text-xs text-gray-400">Category: <span className="font-semibold text-gray-600">{effectiveCategory}</span></p>}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">Author's Note <span className="text-xs text-gray-400">(optional — shown to users before they begin the quiz)</span></label>
                <textarea value={newQuizAuthorNote} onChange={e=>setNewQuizAuthorNote(e.target.value)} placeholder="Special instructions, context, or notes for quiz-takers..." rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none text-sm"/>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-600 mb-2">Token Slots <span className="text-xs text-gray-400">(6 slots — assign token types players receive)</span></label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {newQuizTokenSlots.map((slot, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-400 font-medium">{i + 1}</span>
                      <select
                        value={slot}
                        onChange={e => { const updated = [...newQuizTokenSlots]; updated[i] = e.target.value; setNewQuizTokenSlots(updated); }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                      >
                        <option value="none">None</option>
                        <option value="doubler">Doubler</option>
                        <option value="insurance">Insurance</option>
                        <option value="parasite">Parasite</option>
                        <option value="sniper">Sniper</option>
                      </select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {Object.entries(
                    newQuizTokenSlots.filter(t => t !== 'none').reduce((acc, t) => { acc[t] = (acc[t]||0)+1; return acc; }, {})
                  ).map(([t, count]) => `${count} ${t}${count !== 1 ? 's' : ''}`).join(', ') || 'No tokens assigned'}
                </p>
              </div>
            </div>

            {newQuizType==='combination'&&(
              <>
                {combQuestions.length>0&&(
                  <div>
                    <button onClick={()=>setShowQuestionSummary(s=>!s)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 w-full justify-between shadow-sm">
                      <span className="flex items-center gap-2"><List size={16}/> {showQuestionSummary?'Close':'Open'} Question Summaries ({combQuestions.length} question{combQuestions.length!==1?'s':''})</span>
                      <span className="text-gray-400">{showQuestionSummary?'▲':'▼'}</span>
                    </button>
                    {showQuestionSummary&&(
                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mt-1 overflow-hidden">
                        {combQuestions.map((q,i)=>(
                          <div key={i} className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 ${combCurrentIndex===i?'bg-blue-50':''}`}>
                            <span className="text-sm text-gray-400 font-medium w-5">{i+1}.</span>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${q.questionType==='MC'?'bg-purple-100 text-purple-700':q.questionType==='OR'?'bg-orange-100 text-orange-700':'bg-blue-100 text-blue-700'}`}>{shortTypeLabel(q.questionType)}</span>
                            <span className="flex-1 text-sm text-gray-700 truncate">{promptPreview(q)}</span>
                            <button onClick={()=>editCombQuestion(i)} className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 flex-shrink-0"><Edit2 size={12}/> Edit</button>
                            <button onClick={()=>deleteCombQuestion(i)} className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={14}/></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!combDraft&&(
                  <div className="bg-white rounded-xl shadow-md p-5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">Question Type:</span>
                      <select value={combNewQType} onChange={e=>setCombNewQType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                        <option value="MC">Multiple Choice</option>
                        <option value="OR">Open Response</option>
                      </select>
                      <button onClick={startNewCombQuestion} className="flex items-center gap-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium text-sm"><Plus size={16}/> Create New Question</button>
                    </div>
                    {combQuestions.length===0&&<p className="text-sm text-gray-400 mt-3">No questions yet. Use the selector above to add your first question.</p>}
                  </div>
                )}
                {combDraft && (() => {
                  const qt=combDraft.questionType; const isEditing=combCurrentIndex!==null;
                  return (
                    <div className="bg-white rounded-xl shadow-md p-6 border-2 border-blue-300">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-md font-semibold text-gray-700">
                          {isEditing?`Editing Question ${combCurrentIndex+1}`:'New Question'}{' '}
                          <span className={`ml-2 inline-block px-2 py-0.5 rounded text-xs font-bold ${qt==='MC'?'bg-purple-100 text-purple-700':'bg-orange-100 text-orange-700'}`}>{shortTypeLabel(qt)}</span>
                        </h3>

                      </div>
                      {qt==='MC'&&(
                        <>
                          <div className="mb-4"><label className="block text-sm font-medium text-gray-600 mb-1">Prompt <span className="text-red-500">*</span></label><textarea value={combDraft.prompt||''} onChange={e=>updateCombDraft('prompt',e.target.value)} rows={2} placeholder="Enter the question..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"/><ImageHelper/></div>
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-gray-600">Options</label>
                            </div>
                            <div className="space-y-2">
                              <div className="grid grid-cols-12 gap-2 mb-1"><div className="col-span-10 text-xs font-semibold text-gray-400 uppercase pl-1">Option text</div><div className="col-span-2 text-xs font-semibold text-gray-400 uppercase text-center">Correct</div></div>
                              {(combDraft.options||[]).map((opt,i)=>(
                                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                  <input type="text" value={opt} onChange={e=>updateCombDraftOption(i,e.target.value)} placeholder={`Option ${i+1}`} className="col-span-10 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"/>
                                  <div className="col-span-2 flex justify-center"><input type="checkbox" checked={(combDraft.correctIndices||[]).includes(i)} onChange={()=>toggleCombDraftCorrect(i)} className="w-5 h-5 rounded border-gray-300 text-green-600"/></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      {qt==='OR'&&(
                        <>
                          <div className="mb-4"><label className="block text-sm font-medium text-gray-600 mb-1">Prompt <span className="text-red-500">*</span></label><textarea value={combDraft.prompt||''} onChange={e=>updateCombDraft('prompt',e.target.value)} rows={2} placeholder="Enter the question..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"/><ImageHelper/></div>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-600 mb-1">Correct Answer</label>
                            <div className="flex gap-2">
                              <input type="text" value={combOrAnswerInput} onChange={e=>setCombOrAnswerInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCombDraftORAnswer()} placeholder="Type an accepted answer..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                              <button onClick={addCombDraftORAnswer} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"><Plus size={18}/> Include</button>
                            </div>
                          </div>
                          {(combDraft.acceptedAnswers||[]).length>0&&(
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-600 mb-2">Correct Answers Included <span className="ml-2 text-xs text-gray-400 font-normal">(click to set primary)</span></label>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                                {(combDraft.acceptedAnswers||[]).map((ans,i)=>{const isPrimary=i===(combDraft.primaryAnswerIndex||0);return(
                                  <div key={i} onClick={()=>setCombDraftORPrimary(i)} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border-2 transition-all ${isPrimary?'bg-yellow-50 border-yellow-400':'bg-white border-gray-200 hover:border-blue-300'}`}>
                                    <Star size={14} className={isPrimary?'text-yellow-500 fill-yellow-500':'text-gray-300'}/>
                                    <span className={`flex-1 text-sm ${isPrimary?'font-semibold text-gray-800':'text-gray-700'}`}>{ans}</span>
                                    {isPrimary&&<span className="text-xs text-yellow-600 font-medium">Primary</span>}
                                    <button onClick={e=>{e.stopPropagation();removeCombDraftORAnswer(i);}} className="text-red-400 hover:text-red-600 ml-1"><X size={14}/></button>
                                  </div>
                                );})}
                              </div>
                              {(combDraft.acceptedAnswers||[]).length>1&&(
                                <div className="flex items-center gap-2 mt-2">
                                  <input type="checkbox" checked={combDraft.showOthersCount||false} onChange={e=>updateCombDraft('showOthersCount',e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
                                  <span className="text-sm text-gray-700">Show +X in quiz results</span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex gap-3"><button onClick={submitCombQuestion} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">{isEditing?'Update Question':'Submit Question'}</button>{isEditing&&<button onClick={cancelCombEdit} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Cancel Edit</button>}</div>
                    </div>
                  );
                })()}
              </>
            )}

            {newQuizType==='fillintheblank'&&(
              <>
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">Sentences</h2>
                  <p className="text-sm text-gray-500 mb-4">Wrap the answer word in <code className="bg-gray-100 px-1 rounded">[square brackets]</code>.</p>
                  <div className="flex gap-2 mb-4">
                    <textarea value={newSentenceInput} onChange={e=>setNewSentenceInput(e.target.value)} placeholder="Type a sentence with [answer] in brackets..." rows={2} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"/>
                    <button onClick={addSentence} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium self-start"><Plus size={18}/> Add</button>
                  </div>
                  {newQuizSentences.length>0&&<ol className="space-y-2">{newQuizSentences.map((sent,i)=><li key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3"><span className="text-gray-400 text-sm font-medium w-6 flex-shrink-0">{i+1}.</span><span className="flex-1 text-sm text-gray-700">{sent}</span><button onClick={()=>removeSentence(i)} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={16}/></button></li>)}</ol>}
                </div>
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">Word Bank</h2>
                  <p className="text-sm text-gray-500 mb-4">Answer words are added automatically. Add extra distractor words below.</p>
                  {autoWordBank.length>0&&<div className="mb-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">From sentences (automatic)</p><div className="flex flex-wrap gap-2">{autoWordBank.map(w=><span key={w} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{w}</span>)}</div></div>}
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={extraWordInput} onChange={e=>setExtraWordInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addExtraWord()} placeholder="Add an extra distractor word..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                    <button onClick={addExtraWord} className="flex items-center gap-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"><Plus size={18}/> Add</button>
                  </div>
                  {extraWords.length>0&&<div className="mb-3"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Extra words</p><div className="flex flex-wrap gap-2">{extraWords.map(w=><span key={w} className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">{w}<button onClick={()=>removeExtraWord(w)} className="text-gray-400 hover:text-red-500"><X size={13}/></button></span>)}</div></div>}
                  {fullWordBank.length>0&&<div className="mt-4 p-3 bg-blue-50 rounded-lg"><p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">Full word bank preview</p><div className="flex flex-wrap gap-2">{fullWordBank.map(w=><span key={w} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm font-medium">{w}</span>)}</div></div>}
                </div>
              </>
            )}

            {newQuizType==='MC'&&(
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Question {mcCurrentIndex+1} of {mcQuestions.length}</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>setMcCurrentIndex(i=>Math.max(0,i-1))} disabled={mcCurrentIndex===0} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40"><ChevronLeft size={18}/></button>
                    <button onClick={()=>setMcCurrentIndex(i=>Math.min(mcQuestions.length-1,i+1))} disabled={mcCurrentIndex===mcQuestions.length-1} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40"><ChevronRight size={18}/></button>
                    <button onClick={()=>removeMCQuestion(mcCurrentIndex)} className="p-1 rounded bg-red-100 text-red-500 hover:bg-red-200 ml-1"><Trash2 size={16}/></button>
                  </div>
                </div>
                <div className="mb-5"><label className="block text-sm font-medium text-gray-600 mb-1">Prompt <span className="text-red-500">*</span></label><textarea value={mcQ.prompt} onChange={e=>updateMCQuestion('prompt',e.target.value)} placeholder="Enter the question..." rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"/><ImageHelper key={`mc-${mcCurrentIndex}`}/></div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-600">Options</label>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 mb-1"><div className="col-span-10 text-xs font-semibold text-gray-400 uppercase pl-1">Option text</div><div className="col-span-2 text-xs font-semibold text-gray-400 uppercase text-center">Correct</div></div>
                    {mcQ.options.map((opt,i)=><div key={i} className="grid grid-cols-12 gap-2 items-center"><input type="text" value={opt} onChange={e=>updateMCOption(i,e.target.value)} placeholder={`Option ${i+1}`} className="col-span-10 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"/><div className="col-span-2 flex justify-center"><input type="checkbox" checked={mcQ.correctIndices.includes(i)} onChange={()=>toggleMCCorrect(i)} className="w-5 h-5 rounded border-gray-300 text-green-600"/></div></div>)}
                  </div>
                </div>
              </div>
            )}

            {newQuizType==='openresponse'&&(
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Question {orCurrentIndex+1} of {orQuestions.length}</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>setOrCurrentIndex(i=>Math.max(0,i-1))} disabled={orCurrentIndex===0} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40"><ChevronLeft size={18}/></button>
                    <button onClick={()=>setOrCurrentIndex(i=>Math.min(orQuestions.length-1,i+1))} disabled={orCurrentIndex===orQuestions.length-1} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40"><ChevronRight size={18}/></button>
                    <button onClick={()=>removeORQuestion(orCurrentIndex)} className="p-1 rounded bg-red-100 text-red-500 hover:bg-red-200 ml-1"><Trash2 size={16}/></button>
                  </div>
                </div>
                <div className="mb-5"><label className="block text-sm font-medium text-gray-600 mb-1">Prompt <span className="text-red-500">*</span></label><textarea value={orQ.prompt} onChange={e=>updateORQuestion('prompt',e.target.value)} placeholder="Enter the question..." rows={8} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"/><ImageHelper key={`or-${orCurrentIndex}`}/></div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Correct Answer</label>
                  <div className="flex gap-2"><input type="text" value={orAnswerInput} onChange={e=>setOrAnswerInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addORAnswer()} placeholder="Type an accepted answer..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/><button onClick={addORAnswer} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"><Plus size={18}/> Include</button></div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Correct Answers Included <span className="ml-2 text-xs text-gray-400 font-normal">(click to set as primary)</span></label>
                  {orQ.acceptedAnswers.length===0?<div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-400 text-center">No answers added yet.</div>:(
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                      {orQ.acceptedAnswers.map((ans,i)=>{const isPrimary=i===orQ.primaryAnswerIndex;return(
                        <div key={i} onClick={()=>setORPrimary(i)} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border-2 transition-all ${isPrimary?'bg-yellow-50 border-yellow-400':'bg-white border-gray-200 hover:border-blue-300'}`}>
                          <Star size={15} className={isPrimary?'text-yellow-500 fill-yellow-500':'text-gray-300'}/>
                          <span className={`flex-1 text-sm ${isPrimary?'font-semibold text-gray-800':'text-gray-700'}`}>{ans}</span>
                          {isPrimary&&<span className="text-xs text-yellow-600 font-medium">Primary</span>}
                          <button onClick={e=>{e.stopPropagation();removeORAnswer(i);}} className="text-red-400 hover:text-red-600 ml-1"><X size={14}/></button>
                        </div>
                      );})}
                    </div>
                  )}
                </div>
                {orQ.acceptedAnswers.length>1&&(
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={orQ.showOthersCount||false} onChange={e=>updateORQuestion('showOthersCount',e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
                    <label className="text-sm text-gray-700">Show +X in quiz results{orQ.showOthersCount&&orQ.acceptedAnswers.length>1&&<span className="ml-2 text-xs text-gray-400"></span>}</label>
                  </div>
                )}
              </div>
            )}

            {newQuizType==='datadash'&&(
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Question {ddCurrentIndex+1} of {ddQuestions.length}</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>setDdCurrentIndex(i=>Math.max(0,i-1))} disabled={ddCurrentIndex===0} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40"><ChevronLeft size={18}/></button>
                    <button onClick={()=>setDdCurrentIndex(i=>Math.min(ddQuestions.length-1,i+1))} disabled={ddCurrentIndex===ddQuestions.length-1} className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-40"><ChevronRight size={18}/></button>
                    <button onClick={()=>removeDDQuestion(ddCurrentIndex)} className="p-1 rounded bg-red-100 text-red-500 hover:bg-red-200 ml-1"><Trash2 size={16}/></button>
                  </div>
                </div>
                {(()=>{const ddQ=ddQuestions[ddCurrentIndex]||emptyDDQuestion();return(<>
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Prompt <span className="text-red-500">*</span></label>
                    <textarea value={ddQ.prompt} onChange={e=>updateDDQuestion('prompt',e.target.value)} placeholder="Enter the question..." rows={8} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"/>
                    <ImageHelper key={`dd-${ddCurrentIndex}`}/>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Correct Answer (number) <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ddAnswerInput}
                        onChange={e=>setDdAnswerInput(e.target.value)}
                        onKeyDown={e=>{if(e.key==='Enter'){const n=parseNumber(ddAnswerInput);if(n===null){alert('Please enter a valid number.');return;}updateDDQuestion('correctAnswer',n);setDdAnswerInput('');}}}
                        placeholder="e.g. 1,497.05"
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${ddAnswerInput&&parseNumber(ddAnswerInput)===null?'border-red-400':'border-gray-300'}`}
                      />
                      <button onClick={()=>{const n=parseNumber(ddAnswerInput);if(n===null){alert('Please enter a valid number (commas ok, e.g. 1,234.5).');return;}updateDDQuestion('correctAnswer',n);setDdAnswerInput('');}} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"><Check size={18}/> Set</button>
                    </div>
                    {ddQ.correctAnswer!==null&&<p className="mt-2 text-sm text-green-700 font-medium">✓ Correct answer: <span className="font-bold">{ddQ.correctAnswer.toLocaleString()}</span></p>}
                    {ddAnswerInput&&parseNumber(ddAnswerInput)===null&&<p className="text-red-500 text-xs mt-1">Not a valid number</p>}
                  </div>
                </>);})()}
              </div>
            )}

            <div className="flex gap-3">
              {newQuizType==='MC'&&<button onClick={addMCQuestion} className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-semibold"><Plus size={18}/> Add Next Question</button>}
              {newQuizType==='openresponse'&&<button onClick={addORQuestion} className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-semibold"><Plus size={18}/> Add Next Question</button>}
              {newQuizType==='datadash'&&<button onClick={addDDQuestion} className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-semibold"><Plus size={18}/> Add Next Question</button>}
              <button onClick={()=>setShowPreview(true)} className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"><BookOpen size={20}/> Preview Question</button>
              <button onClick={saveQuizLocally} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">{editingKey?'Save Changes':'Save Quiz'}</button>
              <button onClick={()=>{resetQuizBuilder();setAdminSection('list');}} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
            </div>
          </div>
        )}

        {adminSection==='users'&&(
          <div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={()=>setAdminSection('list')} className="text-sm text-blue-600 hover:underline">← Back to Quizzes</button>
              <h2 className="text-xl font-bold text-gray-800">Manage Users</h2>
              <button onClick={()=>setShowAddUser(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><Plus size={16}/> Add User</button>
            </div>
            {userMsg && <div className="mb-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">{userMsg}</div>}
            <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              <strong>Note:</strong> Editing a user's password here updates the stored record only. To change their actual login password, you must also update it in the <strong>Supabase Auth dashboard</strong> (Authentication → Users → select user → set new password).
            </div>
            {showAddUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
                <h3 className="font-bold text-gray-800 mb-3">New User</h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label><input type="text" value={newUserDisplayName} onChange={e=>setNewUserDisplayName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"/></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Email</label><input type="email" value={newUserEmail} onChange={e=>setNewUserEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"/></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Password</label><input type="text" value={newUserPassword} onChange={e=>setNewUserPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"/></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addUser} disabled={newUserSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-40">{newUserSaving ? 'Adding...' : 'Add User'}</button>
                  <button onClick={()=>{setShowAddUser(false);setNewUserEmail('');setNewUserPassword('');setNewUserDisplayName('');}} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium">Cancel</button>
                </div>
              </div>
            )}
            {usersLoading ? <p className="text-gray-500 text-sm">Loading users...</p> : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="grid grid-cols-12 px-4 py-2 bg-gray-100 border-b text-xs font-semibold text-gray-500 uppercase">
                  <div className="col-span-3">Display Name</div>
                  <div className="col-span-4">Email</div>
                  <div className="col-span-3">Password</div>
                  <div className="col-span-2">Actions</div>
                </div>
                {users.map((u, idx) => (
                  <div key={u.user_id} className={`grid grid-cols-12 gap-2 px-4 py-3 border-b last:border-0 items-center ${idx%2===0?'bg-white':'bg-gray-50'}`}>
                    <div className="col-span-3"><input type="text" value={u.display_name||''} onChange={e=>setUsers(p=>p.map((x,i)=>i===idx?{...x,display_name:e.target.value}:x))} className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-400"/></div>
                    <div className="col-span-4"><input type="text" value={u.email||''} onChange={e=>setUsers(p=>p.map((x,i)=>i===idx?{...x,email:e.target.value}:x))} className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-400"/></div>
                    <div className="col-span-3"><input type="text" value={u.password||''} onChange={e=>setUsers(p=>p.map((x,i)=>i===idx?{...x,password:e.target.value}:x))} className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-400"/></div>
                    <div className="col-span-2 flex gap-2">
                      <button onClick={()=>saveUser(u)} disabled={userSaving[u.user_id]} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium disabled:opacity-40">{userSaving[u.user_id]?'...':'Save'}</button>
                      <button onClick={()=>deleteUser(u)} disabled={userDeleting[u.user_id]} className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs disabled:opacity-40"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
                {users.length === 0 && <p className="px-4 py-6 text-gray-400 text-sm text-center">No users yet.</p>}
              </div>
            )}
          </div>
        )}
        {showNewQuizConfirm&&(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">Start a New Quiz?</h2>
              <p className="text-gray-600 mb-6 text-sm">You have unsaved work on the current quiz. Starting a new one will discard it. Are you sure?</p>
              <div className="flex gap-3">
                <button onClick={doStartCreateQuiz} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">Yes, discard it</button>
                <button onClick={()=>setShowNewQuizConfirm(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">No, keep working</button>
              </div>
            </div>
          </div>
        )}

        {adminSection==='audit'&&(
          <div className="space-y-6">
            {/* Quiz selector — two dropdowns: season then quiz */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Score Auditor</h2>
              <p className="text-sm text-gray-500 mb-4">Select a season and quiz to see a full breakdown of every calculation — difficulty ranking, token effects, per-user scores, and season points.</p>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Step 1: season */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Season</label>
                  <select value={auditSeason} onChange={e=>{setAuditSeason(e.target.value);setAuditQuizKey('');setAuditData(null);setAuditExpandedUser(null);}} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white min-w-40">
                    <option value="">— Select —</option>
                    <option value="Offseason">Offseason</option>
                    {Array.from(new Set(Object.values(allQuizData).map(q=>q.category).filter(c=>c&&c.trim().toLowerCase()!=='offseason'))).sort((a,b)=>a.localeCompare(b)).map(s=>(
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                {/* Step 2: quiz within that season */}
                {auditSeason && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Quiz</label>
                    <select value={auditQuizKey} onChange={e=>{setAuditQuizKey(e.target.value);setAuditData(null);setAuditExpandedUser(null);}} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white min-w-64">
                      <option value="">— Select a quiz —</option>
                      {Object.entries(allQuizData).filter(([,q])=>q.status==='Scored'&&q.category===auditSeason).sort((a,b)=>(a[1].title||a[0]).localeCompare(b[1].title||b[0])).map(([key,q])=>(
                        <option key={key} value={key}>{q.title||key}</option>
                      ))}
                    </select>
                  </div>
                )}
                {auditQuizKey && (
                  <div className="mt-4 self-end">
                    <button onClick={()=>runAudit(auditQuizKey)} disabled={auditLoading} className="px-5 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-medium text-sm disabled:opacity-40">
                      {auditLoading ? 'Loading…' : 'Run Audit'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {auditData && (() => {
              const { quizTitle, season, questions, rankingRows, userRows, n, totalAttempts } = auditData;
              const tokenLabel = (token) => token ? ({ doubler:'×2 Doubler', insurance:'INS Insurance', sniper:'🎯 Sniper', parasite:'PAR Parasite' }[token] || token) : '—';
              const tokenBg = (token) => token ? ({ doubler:'#fef9c3', insurance:'#eff6ff', sniper:'#fef2f2', parasite:'#f0fdf4' }[token] || '#f9fafb') : 'transparent';

              return (
                <>
                  {/* ── Section 1: Difficulty Ranking (skipped for Data Dash) ── */}
                  {!auditData.isDashQuiz && <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="px-5 py-3 bg-gray-100 border-b">
                      <h2 className="font-bold text-gray-700">1. Difficulty Ranking & Point Values</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Sorted hardest → easiest (fewest correct = hardest = most points). Ties are averaged.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                            <th className="px-4 py-2 text-left font-semibold">Q#</th>
                            <th className="px-4 py-2 text-left font-semibold">Correct / Total</th>
                            <th className="px-4 py-2 text-left font-semibold">% Correct</th>
                            <th className="px-4 py-2 text-left font-semibold">Point Value</th>
                            <th className="px-4 py-2 text-left font-semibold">How Calculated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankingRows.map((row, idx) => (
                            <tr key={row.qIndex} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-2 font-medium text-gray-700">Q{row.qIndex + 1}</td>
                              <td className="px-4 py-2 text-gray-600">{row.correctCount} / {row.totalAttempts}</td>
                              <td className="px-4 py-2 text-gray-600">{row.totalAttempts > 0 ? Math.round(row.correctCount / row.totalAttempts * 1000) / 10 : 0}%</td>
                              <td className="px-4 py-2 font-bold text-gray-800">{row.assignedPoints} pts</td>
                              <td className="px-4 py-2 text-gray-500 text-xs">
                                {row.isTie
                                  ? <span className="text-amber-700">Tied with Q{row.tieWith.map(i=>i+1).join(', Q')} → {row.tieFormula}</span>
                                  : <span>Rank {row.assignedPoints} of {n}</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>}

                  {/* ── Section 2: Per-user accordion ── */}
                  <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="px-5 py-3 bg-gray-100 border-b">
                      <h2 className="font-bold text-gray-700">{auditData.isDashQuiz ? '1' : '2'}. Per-User Score Breakdown</h2>
                      <p className="text-xs text-gray-500 mt-0.5">{auditData.isDashQuiz ? 'Click a player to expand their per-question breakdown.' : 'Click a player to expand their full question-by-question breakdown. ✅ = recomputed total matches stored score; ❌ = mismatch.'}</p>
                    </div>
                    {/* Collapsed header row */}
                    <div className="divide-y divide-gray-100">
                      {userRows.map((row, ri) => {
                        const isOpen = auditExpandedUser === row.user_id;
                        const ptsByQIndex = {};
                        rankingRows.forEach(r => { ptsByQIndex[r.qIndex] = r.assignedPoints; });
                        return (
                          <div key={row.user_id}>
                            {/* Clickable summary row */}
                            <div
                              onClick={() => setAuditExpandedUser(isOpen ? null : row.user_id)}
                              className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 select-none"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-800 w-40">{row.displayName}</span>
                                {/* Mini strip: ✓/✗ for standard, Q labels for datadash */}
                                <div className="flex gap-0.5">
                                  {auditData.isDashQuiz
                                    ? row.cells.map((cell, i) => (
                                        <span key={i} title={`Q${i+1}: diff ${cell.diff}`} className="text-xs font-bold px-1 rounded text-gray-500 bg-gray-100">Q{i+1}</span>
                                      ))
                                    : row.cells.map((cell, i) => (
                                        <span key={i} title={`Q${i+1}`} className={`text-xs font-bold px-1 rounded ${cell.correct ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>{cell.correct ? '✓' : '✗'}</span>
                                      ))
                                  }
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-gray-800 text-sm">{row.recomputedTotal} pts</span>
                                {!auditData.isDashQuiz && <span className={`text-xs ${row.matches ? 'text-green-600' : 'text-red-600 font-bold'}`}>{row.matches ? '✅' : `❌ stored: ${row.storedScore}`}</span>}
                                <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                              </div>
                            </div>
                            {/* Expanded detail */}
                            {isOpen && (
                              <div className="bg-gray-50 border-t border-gray-100 px-5 py-3">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                      <th className="py-2 px-3 text-center font-semibold">Q#</th>
                                      {auditData.isDashQuiz
                                        ? <th className="py-2 px-3 text-center font-semibold">Difference</th>
                                        : <th className="py-2 px-3 text-center font-semibold">Result</th>}
                                      <th className="py-2 px-3 text-center font-semibold">Token</th>
                                      <th className="py-2 px-3 text-center font-semibold">Base Pts</th>
                                      <th className="py-2 px-3 text-center font-semibold">Earned</th>
                                      <th className="py-2 px-3 text-center font-semibold">Formula</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {row.cells.map((cell, i) => (
                                      <tr key={i}>
                                        <td className="py-2 px-3 text-center text-gray-500 font-medium">Q{i+1}</td>
                                        {auditData.isDashQuiz
                                          ? <td className="py-2 px-3 text-center text-gray-500">{cell.diff !== null && cell.diff !== undefined ? cell.diff.toLocaleString() : '—'}</td>
                                          : <td className={`py-2 px-3 text-center font-bold text-base ${cell.correct ? 'text-green-600' : 'text-red-500'}`}>{cell.correct ? '✓' : '✗'}</td>}
                                        <td className="py-2 px-3 text-center text-xs text-gray-600">{cell.token ? tokenLabel(cell.token) : <span className="text-gray-300">—</span>}</td>
                                        <td className="py-2 px-3 text-center text-gray-500">{ptsByQIndex[i]} pts</td>
                                        <td className="py-2 px-3 text-center font-semibold text-gray-800">{cell.earned} pts</td>
                                        <td className="py-2 px-3 text-center text-xs text-gray-500">{cell.formula}</td>
                                      </tr>
                                    ))}
                                    <tr className="border-t-2 border-gray-300 bg-gray-100">
                                      <td colSpan={auditData.isDashQuiz ? 3 : 4} className="py-2 px-3 text-sm font-semibold text-gray-700 text-right">Total</td>
                                      <td className="py-2 px-3 text-center font-bold text-gray-900">{row.recomputedTotal} pts</td>
                                      <td className="py-2 px-3 text-center">
                                        {!auditData.isDashQuiz && <span className={`text-xs font-semibold ${row.matches ? 'text-green-600' : 'text-red-600'}`}>
                                          {row.matches ? '✅ matches stored score' : `❌ stored score was ${row.storedScore} pts`}
                                        </span>}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>


                </>
              );
            })()}
          </div>
        )}

                {showPreview&&(()=>{
          const previewQ = newQuizType==='MC' ? mcQ : newQuizType==='openresponse' ? orQ : newQuizType==='datadash' ? ddQuestions[ddCurrentIndex] : null;
          const previewType = newQuizType;
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-screen overflow-y-auto">
                <div className="flex justify-between items-center p-5 border-b">
                  <h2 className="text-lg font-bold text-gray-800">Question Preview</h2>
                  <button onClick={()=>setShowPreview(false)} className="text-gray-400 hover:text-gray-600"><X size={22}/></button>
                </div>
                <div className="p-6">
                  <div className="bg-white rounded-xl border-2 border-gray-100 p-6 mb-4">
                    {previewType==='MC'&&previewQ&&(
                      <>
                        <div className="text-lg font-semibold text-gray-800 mb-4">{renderPrompt(previewQ.prompt||'')}</div>
                        <div className="space-y-2">
                          {previewQ.options.filter(o=>o.trim()).map((opt,i)=>(
                            <div key={i} className={`px-4 py-3 rounded-lg border-2 font-medium text-gray-700 border-gray-200 bg-gray-50`}>
                              {'ABCDEFGHIJ'[i]}. {opt}
                              {previewQ.correctIndices.includes(i)&&<span className="ml-2 text-xs text-green-600 font-bold">(correct)</span>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {previewType==='openresponse'&&previewQ&&(
                      <>
                        <div className="text-lg font-semibold text-gray-800 mb-4">{renderPrompt(previewQ.prompt||'')}</div>
                        <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-400 bg-gray-50">Student types answer here...</div>
                        {previewQ.acceptedAnswers?.filter(a=>a.trim()).length>0&&(
                          <p className="mt-3 text-sm text-green-700"><span className="font-semibold">Accepted answers:</span> {previewQ.acceptedAnswers.filter(a=>a.trim()).join(', ')}</p>
                        )}
                      </>
                    )}
                    {previewType==='datadash'&&previewQ&&(
                      <>
                        <div className="text-lg font-semibold text-gray-800 mb-4">{renderPrompt(previewQ.prompt||'')}</div>
                        <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-400 bg-gray-50">Student enters a number here...</div>
                        {previewQ.correctAnswer!==null&&<p className="mt-3 text-sm text-green-700"><span className="font-semibold">Correct answer:</span> {previewQ.correctAnswer?.toLocaleString()}</p>}
                      </>
                    )}
                    {previewType==='fillintheblank'&&(
                      <div className="text-lg font-semibold text-gray-800">{renderPrompt(newQuizSentences[newQuizSentences.length-1]||'(No sentences yet)')}</div>
                    )}
                    {previewType==='combination'&&combDraft&&(
                      <>
                        <div className="text-lg font-semibold text-gray-800 mb-4">{renderPrompt(combDraft.prompt||'')}</div>
                        {combDraft.questionType==='MC'&&(
                          <div className="space-y-2">
                            {(combDraft.options||[]).filter(o=>o.trim()).map((opt,i)=>(
                              <div key={i} className="px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 font-medium text-gray-700">
                                {'ABCDEFGHIJ'[i]}. {opt}
                                {(combDraft.correctIndices||[]).includes(i)&&<span className="ml-2 text-xs text-green-600 font-bold">(correct)</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {combDraft.questionType==='OR'&&(
                          <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-400 bg-gray-50">Student types answer here...</div>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 text-center">This is a visual preview only — not interactive.</p>
                </div>
                <div className="px-5 pb-5">
                  <button onClick={()=>setShowPreview(false)} className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Close</button>
                </div>
              </div>
            </div>
          );
        })()}
        {showExportModal&&(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col">
              <div className="flex justify-between items-center p-5 border-b"><h2 className="text-lg font-bold text-gray-800">Export Data</h2><button onClick={()=>setShowExportModal(false)} className="text-gray-400 hover:text-gray-600"><X size={22}/></button></div>
              <div className="p-5">
                <p className="text-sm text-gray-600 mb-3">This JSON is formatted and ready to save as <strong>{exportFilename}</strong>. Click "Copy to Clipboard", then paste into Notepad and save as {exportFilename}. Upload to StackBlitz's <strong>public/quizzes</strong> folder to update the app.</p>
                <textarea readOnly value={exportContent} className="w-full h-40 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 font-mono resize-y"/>
              </div>
              <div className="px-5 pb-5 flex gap-3">
                <button onClick={copyToClipboard} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-center">Copy to Clipboard</button>
                <button onClick={()=>setShowExportModal(false)} className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Close</button>
              </div>
            </div>
          </div>
        )}
        {confirmDeleteKey&&(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">Delete Quiz?</h2>
              <p className="text-gray-600 mb-1">Are you sure you want to delete <strong>{allQuizData[confirmDeleteKey]?.title}</strong>?</p>
              <p className="text-red-600 text-sm mb-5">This will permanently delete the quiz, all user attempts, and all scoring data.</p>
              <div className="flex gap-3">
                <button onClick={()=>handleDeleteQuiz(confirmDeleteKey)} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">Yes, Delete</button>
                <button onClick={()=>setConfirmDeleteKey(null)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default QuizApp;
