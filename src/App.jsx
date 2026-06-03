import React, { useState, useEffect } from 'react';
import { Check, X, ChevronLeft, ChevronRight, Settings, BookOpen, LogOut, Plus, Trash2, Download, Edit2, Star, List } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jcsoyacjqjfznsprmxcj.supabase.co',
  'sb_publishable_zGvjNAiBtoaRersumsUjWA_OGLXkrJz'
);

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
const emptyCombQuestion = (questionType) => ({
  questionType,
  ...(questionType === 'MC' ? emptyMCQuestion() : questionType === 'OR' ? emptyORQuestion() : { text: '', answer: '' })
});
const typeLabel = (t) => t === 'MC' ? 'Multiple Choice' : t === 'openresponse' ? 'Open Response' : t === 'combination' ? 'Combination' : 'Fill-in-the-blank';

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

const QuizApp = () => {
  const [mode, setMode] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [knownQuizzes, setKnownQuizzes] = useState({ quizzes: [] });
  const [allQuizData, setAllQuizData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetch('/quizzes/knownquizzes.json').then(r => r.json())
      .then(config => {
        const keys = config.quizzes || [];
        setKnownQuizzes({ quizzes: keys });
        return Promise.all(keys.map(key => fetch(`/quizzes/${key}.json`).then(r => r.json()).then(data => ({ key, data })).catch(() => null)));
      })
      .then(results => {
        const m = {}; results.filter(Boolean).forEach(({ key, data }) => { m[key] = data; });
        setAllQuizData(m); setIsLoading(false);
      })
      .catch(() => { setLoadError('Could not load quiz data.'); setIsLoading(false); });
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
  const [newQuizTypeSelector, setNewQuizTypeSelector] = useState('fillintheblank');
  const [editingKey, setEditingKey] = useState(null);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizKey, setNewQuizKey] = useState('');
  const [newQuizCategory, setNewQuizCategory] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newQuizStatus, setNewQuizStatus] = useState('Active');
  const [newQuizType, setNewQuizType] = useState('fillintheblank');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportContent, setExportContent] = useState('');
  const [exportFilename, setExportFilename] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('All');
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
  const [combQuestions, setCombQuestions] = useState([]);
  const [combCurrentIndex, setCombCurrentIndex] = useState(null);
  const [combNewQType, setCombNewQType] = useState('MC');
  const [combOrAnswerInput, setCombOrAnswerInput] = useState('');
  const [showQuestionSummary, setShowQuestionSummary] = useState(false);
  const [combDraft, setCombDraft] = useState(null);
  const [userAttempts, setUserAttempts] = useState({});
  const [displayName, setDisplayName] = useState('');
  const [currentAttemptId, setCurrentAttemptId] = useState(null);

  const activeQuizKeys = knownQuizzes.quizzes.filter(key => (allQuizData[key]?.status || 'Active') === 'Active');
  const allCategories = Array.from(new Set(activeQuizKeys.map(key => allQuizData[key]?.category).filter(Boolean))).sort((a,b) => a.localeCompare(b));
  const allCategoriesAdmin = Array.from(new Set(Object.values(allQuizData).map(q => q.category).filter(Boolean))).sort((a,b) => a.localeCompare(b));
  const quizzesInCategory = selectedCategory ? activeQuizKeys.filter(key => allQuizData[key]?.category === selectedCategory).sort((a,b) => (allQuizData[a]?.title||'').localeCompare(allQuizData[b]?.title||'')) : [];

  const handleCategoryChange = (cat) => { setSelectedCategory(cat); setSelectedQuizKey(''); };

  const prepareActiveQuestions = (quiz) => {
    if (quiz.type === 'MC') {
      const qs = quiz.randomizeQuestions ? shuffleArray(quiz.questions) : [...quiz.questions];
      return qs.map(q => ({ ...q, displayOptions: (q.randomizeOptions ? shuffleArray : x=>x)(q.options.map((opt,i) => ({ opt, correct: q.correctIndices.includes(i) })).filter(o => o.opt.trim() !== '')) }));
    }
    if (quiz.type === 'openresponse') return quiz.randomizeQuestions ? shuffleArray(quiz.questions) : [...quiz.questions];
    if (quiz.type === 'combination') return quiz.questions.map(q => {
      if (q.questionType === 'MC') {
        return { ...q, displayOptions: (q.randomizeOptions ? shuffleArray : x=>x)(
          q.options.map((opt,i) => ({ opt, correct: q.correctIndices.includes(i) })).filter(o => o.opt.trim() !== '')
        )};
      }
      return q;
    });
    return shuffleArray(quiz.sentences);
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
      setCurrentAttemptId(existing.id);
    } else {
      setStudentAnswers({});
      const { data } = await supabase.from('quiz_attempts').insert({ user_id: currentUser.id, quiz_key: selectedQuizKey, status: 'in_progress', answers: {} }).select().single();
      if (data) {
        setCurrentAttemptId(data.id);
        setUserAttempts(p => ({ ...p, [selectedQuizKey]: data }));
      }
    }
    setMode('assessment');
  };

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
  const DOUBLES_ALLOWED = 3;

  const toggleDouble = (i) => {
    setDoubleSelections(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : prev.length < DOUBLES_ALLOWED ? [...prev, i] : prev
    );
  };

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
    return cleaned.length > 60 ? cleaned.slice(0, 60) + '…' : cleaned;
  };

  const submitQuiz = () => { setDoubleSelections([]); setMode('summary'); };

  const saveProgress = async () => {
    if (!currentAttemptId || !currentUser) return;
    await supabase.from('quiz_attempts').update({ answers: studentAnswers, doubles: doubleSelections }).eq('id', currentAttemptId);
  };

  const handleFinalSubmission = async () => {
    if (currentAttemptId) {
      const now = new Date().toISOString();
      await supabase.from('quiz_attempts').update({
        status: 'submitted', answers: studentAnswers, submitted_at: now
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

  const fetchUserData = async (user) => {
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();
    if (profile) setDisplayName(profile.display_name || '');
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
    if (adminUsername === 'twerner' && adminPassword === 'password') { setIsAdminAuthenticated(true); setLoginError(''); }
    else setLoginError('Invalid username or password.');
  };
  const adminLogout = () => { setIsAdminAuthenticated(false); setAdminUsername(''); setAdminPassword(''); setMode('login'); };

  const resetQuizBuilder = () => {
    setEditingKey(null); setNewQuizTitle(''); setNewQuizKey(''); setNewQuizCategory('');
    setNewCategoryInput(''); setShowNewCategoryInput(false); setNewQuizStatus('Active');
    setNewQuizType('fillintheblank'); setNewSentenceInput(''); setNewQuizSentences([]);
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
    setNewQuizCategory(quiz.category || ''); setNewQuizStatus(quiz.status || 'Active');
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
    if (!newQuizKey) { alert('Please enter a quiz filename key.'); return false; }
    if (!getEffectiveCategory()) { alert('Please select or enter a category.'); return false; }
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
    }
    return true;
  };

  const buildQuizJSON = () => {
    const category = getEffectiveCategory();
    const base = { title: newQuizTitle, category, status: newQuizStatus, type: newQuizType };
    if (newQuizType==='fillintheblank') {
      const aw = extractAnswerWords(newQuizSentences.map(t=>({text:t})));
      return { ...base, wordBank: Array.from(new Set([...aw,...extraWords])), sentences: newQuizSentences.map(t=>({text:t,answer:parseSentence(t).answer})) };
    } else if (newQuizType==='MC') {
      return { ...base, randomizeQuestions:mcRandomizeQuestions, questions:mcQuestions.map(q=>({ prompt:q.prompt, options:q.options.filter(o=>o.trim()!==''), correctIndices:q.correctIndices.filter(i=>q.options[i]&&q.options[i].trim()!=='').map(i=>q.options.filter((_,idx)=>idx<=i&&q.options[idx].trim()!=='').length-1), randomizeOptions:q.randomizeOptions||false })) };
    } else if (newQuizType==='openresponse') {
      return { ...base, randomizeQuestions:orRandomizeQuestions, questions:orQuestions.map(q=>({ prompt:q.prompt, acceptedAnswers:q.acceptedAnswers, primaryAnswerIndex:q.primaryAnswerIndex, showOthersCount:q.showOthersCount })) };
    } else {
      return { ...base, questions:combQuestions.map(q => {
        const qt=q.questionType;
        if (qt==='MC') return { questionType:'MC', prompt:q.prompt, options:q.options.filter(o=>o.trim()!==''), correctIndices:q.correctIndices.filter(i=>q.options[i]&&q.options[i].trim()!=='').map(i=>q.options.filter((_,idx)=>idx<=i&&q.options[idx].trim()!=='').length-1), randomizeOptions:q.randomizeOptions||false };
        if (qt==='OR') return { questionType:'OR', prompt:q.prompt, acceptedAnswers:q.acceptedAnswers, primaryAnswerIndex:q.primaryAnswerIndex, showOthersCount:q.showOthersCount };
        return { questionType:'FITB', text:q.text, answer:parseSentence(q.text).answer };
      })};
    }
  };

  const exportQuiz = () => { if(!validateQuizBuilder()) return; setExportContent(JSON.stringify(buildQuizJSON(),null,2)); setExportFilename(newQuizKey+'.json'); setShowExportModal(true); };
  const copyToClipboard = () => { navigator.clipboard.writeText(exportContent).then(()=>{setShowExportModal(false);alert('Copied to clipboard!');}).catch(()=>{alert('Could not copy automatically. Please select all and copy manually (Ctrl+A, Ctrl+C).');}); };
  const saveQuizLocally = () => {
    if(!validateQuizBuilder()) return;
    const quizData=buildQuizJSON(); const key=newQuizKey;
    setAllQuizData(p=>({...p,[key]:quizData}));
    if(!knownQuizzes.quizzes.includes(key)) setKnownQuizzes(p=>({quizzes:[...p.quizzes,key]}));
    const verb=editingKey?'updated':'saved'; resetQuizBuilder(); setAdminSection('list');
    alert(`Quiz "${quizData.title}" ${verb}!`);
  };
  const Header = ({ title, rightSlot }) => (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold text-gray-800 tracking-tight">{title}</h1>
      {rightSlot}
    </div>
  );
  const ContactLine = () => (
    <div className="mt-4 text-center">
      <p className="text-sm text-gray-600">Questions? Suggestions? Errors? Please contact me at{' '}
        <a href="mailto:eltigre1000@gmail.com" className="text-blue-600 hover:text-blue-800 underline">eltigre1000@gmail.com</a>.</p>
    </div>
  );
  const ExitModal = () => showResetModal ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <h2 className="text-xl font-semibold mb-3">Exit Quiz?</h2>
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
  const OthersPopup = () => othersPopupQuestion ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-lg font-bold text-gray-800">All Correct Answers</h2>
          <button onClick={()=>setOthersPopupQuestion(null)} className="text-gray-400 hover:text-gray-600"><X size={22}/></button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-500 mb-3 italic">{othersPopupQuestion.prompt}</p>
          <ul className="space-y-2">
            {othersPopupQuestion.acceptedAnswers.map((ans,i)=>(
              <li key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${i===othersPopupQuestion.primaryAnswerIndex?'bg-yellow-50 font-semibold text-gray-800':'text-gray-700'}`}>
                {i===othersPopupQuestion.primaryAnswerIndex && <Star size={13} className="text-yellow-500 fill-yellow-500 flex-shrink-0"/>}
                {ans}
              </li>
            ))}
          </ul>
        </div>
        <div className="px-5 pb-5"><button onClick={()=>setOthersPopupQuestion(null)} className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Close</button></div>
      </div>
    </div>
  ) : null;

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
      const primary=q.acceptedAnswers[q.primaryAnswerIndex]||q.acceptedAnswers[0]||'';
      const othersCount=q.acceptedAnswers.length-1; const showOthers=q.showOthersCount&&othersCount>0;
      return (
        <div key={i} className={`p-5 border-b last:border-b-0 ${ok?'bg-white':'bg-red-50'}`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">{ok?<Check size={22} className="text-green-500"/>:<X size={22} className="text-red-500"/>}</div>
            <div className="flex-1">
              {qNum&&<span className="text-xs text-gray-400 mb-1 block">Q{qNum}</span>}
              <div className="font-semibold text-gray-800 mb-1">{renderPrompt(q.prompt)}</div>
              <p className="text-gray-700 mb-1">Your answer: <span className={`font-semibold ${ok?'text-green-700':'text-red-600'}`}>{sa||(ok?'':'(no answer)')}</span></p>
              {!ok && <div className="text-sm text-gray-500 mt-1">Correct answer: <span className="font-semibold text-green-700">{primary}</span>{showOthers&&<> — <button onClick={()=>setOthersPopupQuestion(q)} className="font-semibold text-green-700 underline hover:text-green-900">there {othersCount===1?'is':'are'} {othersCount} other correct answer{othersCount>1?'s':''}</button></>}</div>}
              {ok && showOthers && <div className="text-sm text-gray-500 mt-1"><button onClick={()=>setOthersPopupQuestion(q)} className="text-green-700 underline hover:text-green-900">There {othersCount===1?'is':'are'} {othersCount} other correct answer{othersCount>1?'s':''}</button></div>}
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
    <div className="max-w-2xl mx-auto bg-gray-50 min-h-screen" style={{padding:"1.5rem"}}>
      <div style={{position:"relative"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
          <span className="text-sm text-gray-500">{displayName || currentUser?.email}</span>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"><LogOut size={16}/> Log Out</button>
        </div>
        <div style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Select From Active, Unfinished Quizzes</h1>
        </div>
      </div>
      {loadError ? (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 text-center">
          <p className="text-red-700 font-medium">Could not load quiz data. Please check that your quiz files are in the correct location.</p>
        </div>
      ) : allCategories.length===0 ? (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-8 text-center">
          <p className="text-yellow-800 font-medium">There are no active quizzes at this time.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-md p-8 mb-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Step 1: Select a Category</h2>
            <select value={selectedCategory} onChange={e=>handleCategoryChange(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 text-base">
              <option value="">— Select a category —</option>
              {allCategories.map(cat=><option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className={`bg-white rounded-xl shadow-md p-8 mb-6 transition-opacity ${selectedCategory?'opacity-100':'opacity-40 pointer-events-none'}`}>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Step 2: Choose a Quiz</h2>
            <select value={selectedQuizKey} onChange={e=>setSelectedQuizKey(e.target.value)} disabled={!selectedCategory} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 text-base mb-6">
              <option value="">— Select a quiz —</option>
              {quizzesInCategory.map(key => {
                const completed = userAttempts[key]?.status === 'submitted';
                return <option key={key} value={key}>{allQuizData[key]?.title||key}{completed ? ' ★ Completed' : ''}</option>;
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
    </div>
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
        <ContactLine/><ExitModal/>
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
        <ContactLine/><ExitModal/>
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
        <ContactLine/><ExitModal/>
      </div>
    );
  }

  if (mode==='assessment' && activeQuiz?.type==='combination') {
    const q=activeQuestions[currentQuestionIndex]; const total=activeQuestions.length;
    const answeredCount=activeQuestions.filter((aq,i)=>{const qt=aq.questionType;if(qt==='MC')return(studentAnswers[i]||[]).length>0;if(qt==='OR')return(studentAnswers[i]||'').trim()!=='';return studentAnswers[i]!==undefined;}).length;
    const qWithDisplay=q.questionType==='MC'?{...q,displayOptions:(q.randomizeOptions?shuffleArray:x=>x)(q.options.map((opt,i)=>({opt,correct:q.correctIndices.includes(i)})).filter(o=>o.opt.trim()!==''))}:q;
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
        <ContactLine/><ExitModal/>
      </div>
    );
  }

  if (mode==='summary') {
    const doublesOk = doubleSelections.length === DOUBLES_ALLOWED;
    return (
      <div className="max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{activeQuiz?.title}</h1>
          <button onClick={()=>{setCurrentQuestionIndex(0);setMode('assessment');}} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-medium text-sm">← Back to Questions</button>
        </div>
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-6">Question</div>
            <div className="col-span-3">Your Answer</div>
            <div className="col-span-2 text-center">Double?</div>
          </div>
          {activeQuestions.map((q, i) => (
            <div key={i} className={`grid grid-cols-12 gap-2 px-4 py-3 border-b last:border-b-0 items-center ${doubleSelections.includes(i) ? 'bg-yellow-50' : 'bg-white'}`}>
              <div className="col-span-1 text-center text-sm font-medium text-gray-500">{i+1}</div>
              <div className="col-span-6 text-sm text-gray-700">{getPromptPreview(q)}</div>
              <div className="col-span-3 text-sm text-blue-700 font-medium">{getAnswerDisplay(q, i)}</div>
              <div className="col-span-2 flex justify-center">
                <input type="checkbox" checked={doubleSelections.includes(i)} onChange={()=>toggleDouble(i)}
                  disabled={!doubleSelections.includes(i) && doubleSelections.length >= DOUBLES_ALLOWED}
                  className="w-5 h-5 accent-yellow-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"/>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-md p-5 mb-4">
          <p className={`text-center font-medium ${doublesOk ? 'text-green-700' : 'text-gray-600'}`}>
            {doublesOk
              ? `✓ You have selected ${DOUBLES_ALLOWED} answer${DOUBLES_ALLOWED!==1?'s':''} to double.`
              : `You must select exactly ${DOUBLES_ALLOWED} answer${DOUBLES_ALLOWED!==1?'s':''} to double. (${doubleSelections.length} selected)`}
          </p>
        </div>
        <button onClick={handleFinalSubmission} disabled={!doublesOk} className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
          <Check size={20}/> Final Submission
        </button>
      </div>
    );
  }

  if (mode==='submitted') return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-50 min-h-screen flex flex-col items-center justify-center">
      <div className="bg-white rounded-xl shadow-md p-10 text-center w-full">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Quiz Submitted!</h1>
        <p className="text-gray-600 mb-6">Your answers for <span className="font-semibold">{activeQuiz?.title}</span> have been recorded. Results and scores will be posted once everyone has completed the quiz — stay tuned!</p>
        <button onClick={()=>setMode('setup')} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Back to Quiz List</button>
      </div>
    </div>
  );

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
          <button onClick={()=>setMode('setup')} className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Back to Student View</button>
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
            <button onClick={()=>setMode('setup')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"><BookOpen size={18}/> Student View</button>
            <button onClick={adminLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"><LogOut size={18}/> Logout</button>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button onClick={()=>{setAdminSection('list');resetQuizBuilder();}} className={`px-5 py-2 rounded-lg font-medium ${adminSection==='list'?'bg-gray-800 text-white':'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'}`}>Existing Quizzes</button>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${adminSection==='create'&&!editingKey?'border-gray-800 bg-gray-50':'border-gray-300 bg-white'}`}>
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">New Quiz:</span>
            <select value={newQuizTypeSelector} onChange={e=>setNewQuizTypeSelector(e.target.value)} className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500">
              <option value="fillintheblank">Fill-in-the-blank</option>
              <option value="MC">Multiple Choice</option>
              <option value="openresponse">Open Response</option>
              <option value="combination">Combination</option>
            </select>
            <button onClick={startCreateQuiz} className="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm font-medium">Create</button>
          </div>
        </div>

        {adminSection==='list'&&(
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-600">Show:</label>
              <select value={adminStatusFilter} onChange={e=>setAdminStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="All">All</option><option value="Active">Active</option><option value="Inactive">Inactive</option>
              </select>
            </div>
            {knownQuizzes.quizzes.filter(key=>{const q=allQuizData[key];if(!q)return false;return adminStatusFilter==='All'||(q.status||'Active')===adminStatusFilter;}).map(key=>{
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
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${(quiz.status||'Active')==='Active'?'bg-green-100 text-green-700':'bg-gray-200 text-gray-500'}`}>{quiz.status||'Active'}</span>
                        {quiz.category&&<span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">{quiz.category}</span>}
                        <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{typeLabel(qType)}</span>
                        {itemCount} {itemLabel}{itemCount!==1?'s':''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>startEditQuiz(key)} className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"><Edit2 size={16}/> Edit</button>
                      <button onClick={()=>{setExportContent(JSON.stringify(quiz,null,2));setExportFilename(key+'.json');setShowExportModal(true);}} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"><Download size={16}/> Export</button>
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
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Quiz Title <span className="text-red-500">*</span></label>
                  <input type="text" value={newQuizTitle} onChange={e=>setNewQuizTitle(e.target.value)} placeholder="e.g. Chapter 5 Review" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Quiz Key (filename) <span className="text-red-500">*</span></label>
                  <input type="text" value={newQuizKey} onChange={e=>setNewQuizKey(e.target.value.replace(/\s+/g,'_').toLowerCase())} placeholder="e.g. chapter5review" disabled={!!editingKey}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm ${editingKey?'bg-gray-100 text-gray-400':''}`}/>
                  <p className="text-xs text-gray-400 mt-1">Lowercase, underscores only. No extension needed.</p>
                </div>
              </div>
              <div className="flex gap-3 items-end mb-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Category <span className="text-red-500">*</span></label>
                  <select value={showNewCategoryInput?'__new__':newQuizCategory} onChange={e=>{if(e.target.value==='__new__'){setShowNewCategoryInput(true);setNewQuizCategory('');}else{setShowNewCategoryInput(false);setNewQuizCategory(e.target.value);}}} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select a category —</option>
                    {allCategoriesAdmin.map(cat=><option key={cat} value={cat}>{cat}</option>)}
                    <option value="__new__">+ Add new category…</option>
                  </select>
                </div>
                <div style={{flexShrink:0}}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status <span className="text-red-500">*</span></label>
                  <select value={newQuizStatus} onChange={e=>setNewQuizStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="Active">Active</option><option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              {showNewCategoryInput&&<div className="mb-3"><input type="text" value={newCategoryInput} onChange={e=>setNewCategoryInput(e.target.value)} placeholder="New category name" autoFocus className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500"/></div>}
              {effectiveCategory&&<p className="text-xs text-gray-400">Category: <span className="font-semibold text-gray-600">{effectiveCategory}</span></p>}
              {(newQuizType==='MC'||newQuizType==='openresponse'||newQuizType==='combination')&&(
                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="randomizeQ" checked={newQuizType==='MC'?mcRandomizeQuestions:orRandomizeQuestions} onChange={e=>newQuizType==='MC'?setMcRandomizeQuestions(e.target.checked):setOrRandomizeQuestions(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600"/>
                  <label htmlFor="randomizeQ" className="text-sm font-medium text-gray-700">Randomize Question Order</label>
                </div>
              )}
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
                              <div className="flex items-center gap-2"><input type="checkbox" checked={combDraft.randomizeOptions||false} onChange={e=>updateCombDraft('randomizeOptions',e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600"/><span className="text-sm text-gray-600">Randomize option order</span></div>
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
                                  <span className="text-sm text-gray-700">Show "and [#] others" in student results</span>
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
                <div className="mb-5"><label className="block text-sm font-medium text-gray-600 mb-1">Prompt <span className="text-red-500">*</span></label><textarea value={mcQ.prompt} onChange={e=>updateMCQuestion('prompt',e.target.value)} placeholder="Enter the question..." rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"/><ImageHelper/></div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-600">Options</label>
                    <div className="flex items-center gap-2"><input type="checkbox" checked={mcQ.randomizeOptions||false} onChange={e=>updateMCQuestion('randomizeOptions',e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600"/><label className="text-sm text-gray-600">Randomize Answer Option Order</label></div>
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
                <div className="mb-5"><label className="block text-sm font-medium text-gray-600 mb-1">Prompt <span className="text-red-500">*</span></label><textarea value={orQ.prompt} onChange={e=>updateORQuestion('prompt',e.target.value)} placeholder="Enter the question..." rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"/><ImageHelper/></div>
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
                    <label className="text-sm text-gray-700">Show "and [#] others" in student results{orQ.showOthersCount&&orQ.acceptedAnswers.length>1&&<span className="ml-2 text-xs text-gray-400">(will display: "{orQ.acceptedAnswers[orQ.primaryAnswerIndex]||orQ.acceptedAnswers[0]} and {orQ.acceptedAnswers.length-1} other{orQ.acceptedAnswers.length-1>1?'s':''}")</span>}</label>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {newQuizType==='MC'&&<button onClick={addMCQuestion} className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-semibold"><Plus size={18}/> Add Next Question</button>}
              {newQuizType==='openresponse'&&<button onClick={addORQuestion} className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-semibold"><Plus size={18}/> Add Next Question</button>}
              <button onClick={saveQuizLocally} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">{editingKey?'Save Changes':'Save Quiz'}</button>
              <button onClick={exportQuiz} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"><Download size={20}/> Export Data</button>
              <button onClick={()=>{resetQuizBuilder();setAdminSection('list');}} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
            </div>
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
      </div>
    );
  }

  return null;
};

export default QuizApp;
