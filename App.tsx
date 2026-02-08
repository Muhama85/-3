
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  LayoutTemplate, 
  Zap, 
  ArrowRight,
  Globe,
  Layers,
  RefreshCcw,
  Lightbulb,
  ExternalLink,
  Search,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  GripVertical,
  Activity,
  Terminal,
  Cpu,
  Trophy,
  CreditCard,
  CheckCircle2,
  Circle,
  Command
} from 'lucide-react';
import { processContent } from './services/geminiService';
import { GeneratedContent, ToneType, GenerationStatus, Language, AppMode, GroundingSource } from './types';
import ResultCard from './components/ResultCard';

/**
 * Fix for aistudio declaration conflict: 
 * Defining AIStudio interface and extending Window with an optional aistudio property 
 */
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

const translations = {
  ar: {
    title: 'AGENT X PRO',
    welcomeBadge: 'نظام الهيمنة على المحتوى v3.5',
    heroTitle: 'لا تكتفِ بالنشر.. ابدأ بالسيطرة',
    heroDesc: 'حول أفكارك العادية إلى استراتيجيات فيروسية تكتسح الترند. وكيلنا الذكي يحلل أسرار المنافسين، يحدد الثغرات، ويصيغ لك محتوى لا يقاوم.',
    startBtn: 'دخول قمرة القيادة',
    modeRepurpose: 'تطوير استراتيجي',
    modeGenerate: 'توليد خارق',
    inputPlaceholder: 'أهلاً بك في المستقبل! ما هو هدفك التسويقي اليوم؟...',
    generateBtn: 'إطلاق العنان للوكيل',
    generating: 'الوكيل يحلل البيانات الآن...',
    editorTitle: 'مركز التنفيذ والقيادة',
    sourcesLabel: 'الاستخبارات الرقمية المكتشفة:',
    newChat: 'مهمة جديدة',
    agentConsole: 'وحدة التحكم المركزية',
    billingInfo: 'يتطلب النظام اتصالاً بمشروع GCP مفعل.',
    workLog: 'سير العمليات الحية (Live Operations)',
    agentThinking: 'الوكيل في حالة تفكير استراتيجي...',
    toneOptions: {
      [ToneType.PROFESSIONAL]: 'سلطة معرفية',
      [ToneType.FRIENDLY]: 'تفاعل إنساني',
      [ToneType.WITTY]: 'عبقري ساخر',
      [ToneType.URGENT]: 'اقتناص فرص',
    }
  },
  en: {
    title: 'AGENT X PRO',
    welcomeBadge: 'Content Dominance System v3.5',
    heroTitle: 'Don’t Just Post. Start Dominating.',
    heroDesc: 'Turn ordinary ideas into viral strategies. Our Agent decodes competitor secrets, identifies gaps, and crafts irresistible content for your brand.',
    startBtn: 'Enter the Cockpit',
    modeRepurpose: 'Strategic Evolve',
    modeGenerate: 'Hyper Gen',
    inputPlaceholder: 'Welcome to the future. What is your marketing goal today?...',
    generateBtn: 'Unleash Agent',
    generating: 'Agent analyzing intelligence...',
    editorTitle: 'Command & Execution Center',
    sourcesLabel: 'Discovered Intelligence:',
    newChat: 'New Mission',
    agentConsole: 'Central Command Console',
    billingInfo: 'Requires active GCP project connection.',
    workLog: 'Live Operations Log',
    agentThinking: 'Agent in strategic deep-thought...',
    toneOptions: {
      [ToneType.PROFESSIONAL]: 'Authority',
      [ToneType.FRIENDLY]: 'Human-Like',
      [ToneType.WITTY]: 'Witty Genius',
      [ToneType.URGENT]: 'Urgency',
    }
  }
};

interface Message {
  role: 'user' | 'agent';
  text: string;
  isLog?: boolean;
}

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('ar');
  const [mode, setMode] = useState<AppMode>('repurpose');
  const [showWelcome, setShowWelcome] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedTone, setSelectedTone] = useState<ToneType>(ToneType.PROFESSIONAL);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [results, setResults] = useState<GeneratedContent[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [history, setHistory] = useState<Message[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(520);
  const [currentStep, setCurrentStep] = useState(0);
  const isResizing = useRef(false);
  
  const t = translations[lang];

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = lang === 'ar' ? window.innerWidth - e.clientX : e.clientX;
    if (newWidth > 400 && newWidth < window.innerWidth * 0.8) setSidebarWidth(newWidth);
  }, [lang]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const handleStart = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) await window.aistudio.openSelectKey();
    }
    setShowWelcome(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const currentQuery = inputText;
    setIsActive(true);
    setHistory(prev => [...prev, { role: 'user', text: currentQuery }]);
    
    const greeting = lang === 'ar' 
      ? 'تم الاستلام. سأقوم الآن بربط قواعد البيانات الحية واستخراج استراتيجية الهيمنة الخاصة بك.' 
      : 'Received. I am now connecting to live databases to extract your dominance strategy.';
    
    setHistory(prev => [...prev, { role: 'agent', text: greeting }]);
    
    setInputText('');
    setStatus(GenerationStatus.LOADING);
    setResults([]);
    setSources([]);
    setCurrentStep(0);

    try {
      const result = await processContent(currentQuery, selectedTone, lang, mode);
      
      for (let i = 0; i < result.agentThoughtLog.length; i++) {
        await new Promise(r => setTimeout(r, 1000));
        setCurrentStep(i + 1);
        setHistory(prev => [...prev, { role: 'agent', text: result.agentThoughtLog[i], isLog: true }]);
      }

      setResults(result.content);
      setSources(result.sources);
      setStatus(GenerationStatus.SUCCESS);
      setHistory(prev => [...prev, { role: 'agent', text: lang === 'ar' ? 'تم اكتمال التحليل والتنفيذ. الملفات جاهزة في مساحة العمل.' : 'Analysis and execution complete. Assets ready in workspace.' }]);

    } catch (error) {
      console.error(error);
      setStatus(GenerationStatus.ERROR);
    }
  };

  const handleReset = () => {
    setIsActive(false);
    setHistory([]);
    setResults([]);
    setSources([]);
    setStatus(GenerationStatus.IDLE);
    setInputText('');
  };

  if (showWelcome) {
    return (
      <div className="min-h-screen bg-brand-base flex items-center justify-center relative overflow-hidden px-4">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-brand-indigo/10 blur-[150px] rounded-full animate-orb-drift opacity-40" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-brand-accent/10 blur-[150px] rounded-full animate-orb-drift-slow opacity-30" />

        <div className="max-w-4xl text-center z-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-indigo/10 border border-brand-indigo/30 rounded-full mb-10 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
            <Command size={16} className="text-brand-indigo animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-white/80">{t.welcomeBadge}</span>
          </div>
          <h1 className="text-7xl md:text-9xl font-black text-white mb-8 leading-[1] tracking-tighter">
            {t.heroTitle}
          </h1>
          <p className="text-2xl text-slate-400 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
            {t.heroDesc}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={handleStart}
              className="group px-14 py-7 bg-white text-brand-base rounded-[2.5rem] font-black text-2xl hover:bg-brand-indigo hover:text-white transition-all flex items-center gap-4 shadow-[0_30px_60px_rgba(255,255,255,0.1)] hover:shadow-brand-indigo/50 hover:-translate-y-1 active:translate-y-0"
            >
              {t.startBtn}
              <ArrowRight size={28} className={`transition-transform group-hover:translate-x-2 ${lang === 'ar' && 'rotate-180'}`} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-brand-base text-slate-200 flex overflow-hidden ${lang === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}>
      
      {/* Sidebar / Agent Console Panel - Redesigned to be full-height and solid */}
      <aside 
        style={isActive ? { width: `${sidebarWidth}px` } : { width: '100%', maxWidth: '900px', margin: 'auto' }}
        className={`transition-all duration-700 ease-in-out flex flex-col h-screen bg-brand-surface/95 backdrop-blur-3xl relative z-20 
          ${isActive ? (lang === 'ar' ? 'border-l border-white/10' : 'border-r border-white/10') : 'rounded-[4rem] shadow-2xl border border-white/10 overflow-hidden my-10 h-[90vh]'}`}
      >
        {/* Full-height Vertical Resize Bar */}
        {isActive && (
          <div 
            onMouseDown={startResizing}
            className={`absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-indigo transition-colors z-50 flex items-center justify-center
              ${lang === 'ar' ? 'left-0 translate-x-[-50%]' : 'right-0 translate-x-[50%]'}`}
          >
             <div className="h-20 w-1 bg-white/20 rounded-full" />
          </div>
        )}

        {/* Header */}
        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-brand-base/40">
          <div className="flex items-center gap-5 cursor-pointer" onClick={handleReset}>
             <div className="w-12 h-12 bg-brand-indigo rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-indigo/40 ring-4 ring-brand-indigo/10">
               <Terminal size={24} />
             </div>
             <div>
               <h1 className="text-xl font-black tracking-tighter text-white">{t.title}</h1>
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{t.agentConsole}</span>
               </div>
             </div>
          </div>
          <button onClick={handleReset} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all hover:scale-110 active:scale-90">
            <Plus size={24} />
          </button>
        </div>

        {/* Console / Chat Flow */}
        <div className="flex-grow overflow-y-auto p-10 space-y-8 no-scrollbar custom-scrollbar bg-gradient-to-b from-brand-base/20 to-transparent">
          {!isActive && (
            <div className="py-20 text-center space-y-6">
              <div className="w-24 h-24 bg-brand-indigo/10 rounded-full flex items-center justify-center mx-auto border border-brand-indigo/20">
                <Trophy size={48} className="text-brand-indigo" />
              </div>
              <h2 className="text-4xl font-black text-white tracking-tight">{t.heroTitle}</h2>
              <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">{t.heroDesc}</p>
            </div>
          )}
          
          {history.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
              <div className={`max-w-[95%] p-6 rounded-[2rem] text-lg leading-relaxed border transition-all shadow-2xl
                ${msg.role === 'user' 
                  ? 'bg-brand-indigo border-brand-indigo text-white shadow-brand-indigo/20' 
                  : msg.isLog 
                    ? 'bg-transparent border-transparent text-brand-accent/70 font-mono text-xs py-1 border-l-2 border-brand-accent/20 pl-4'
                    : 'bg-brand-base/60 border-white/5 text-slate-200 font-medium'}`}>
                {msg.text}
              </div>
            </div>
          ))}

          {status === GenerationStatus.LOADING && (
            <div className="flex items-center gap-4 p-5 bg-brand-indigo/10 border border-brand-indigo/20 rounded-3xl animate-pulse">
               <Loader2 size={20} className="animate-spin text-brand-indigo" />
               <span className="text-xs font-black uppercase tracking-[0.2em] text-brand-indigo">{t.agentThinking}</span>
            </div>
          )}
        </div>

        {/* Futuristic Input Area */}
        <div className="p-10 bg-brand-base/50 border-t border-white/10 backdrop-blur-md">
          <div className="mb-8 flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {Object.values(ToneType).map(tone => (
              <button 
                key={tone} 
                onClick={() => setSelectedTone(tone)}
                className={`px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] rounded-2xl border transition-all whitespace-nowrap
                  ${selectedTone === tone ? 'bg-brand-indigo border-brand-indigo text-white shadow-xl shadow-brand-indigo/30 scale-105' : 'border-white/10 text-slate-400 hover:text-white bg-white/5 hover:border-white/20'}`}
              >
                {t.toneOptions[tone]}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-brand-indigo via-brand-accent to-brand-indigo rounded-[3rem] blur opacity-10 group-focus-within:opacity-30 transition-all duration-700 animate-pulse"></div>
            <div className="relative bg-brand-surface border border-white/10 rounded-[2.5rem] overflow-hidden focus-within:border-brand-indigo/50 transition-all shadow-3xl">
              <textarea
                rows={isActive ? 3 : 4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t.inputPlaceholder}
                className="w-full p-8 pr-20 bg-transparent text-xl focus:ring-0 outline-none resize-none transition-all placeholder:text-slate-700 font-light leading-snug"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
              />
              <button 
                type="submit"
                disabled={!inputText.trim() || status === GenerationStatus.LOADING}
                className="absolute bottom-6 right-6 p-5 bg-brand-indigo text-white rounded-3xl hover:scale-110 active:scale-95 transition-all disabled:opacity-20 shadow-2xl shadow-brand-indigo/50 group/btn"
              >
                <Zap size={28} fill="currentColor" className="group-hover/btn:animate-pulse" />
              </button>
            </div>
          </form>
          
          <div className="mt-8 flex justify-center items-center gap-10 opacity-30 text-[10px] font-bold uppercase tracking-[0.4em]">
             <div className="flex items-center gap-2"><Globe size={14} /> LIVE SEARCH ON</div>
             <div className="flex items-center gap-2"><Cpu size={14} /> NEURAL ENGINE v3</div>
          </div>
        </div>
      </aside>

      {/* Main Command Center (The Workspace) */}
      <main className={`flex-grow flex flex-col h-screen overflow-hidden transition-all duration-700 
        ${isActive ? 'translate-x-0 opacity-100' : (lang === 'ar' ? '-translate-x-[15%]' : 'translate-x-[15%]') + ' opacity-0 pointer-events-none'}`}>
        
        <header className="h-28 border-b border-white/10 bg-brand-base/40 backdrop-blur-3xl px-14 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="p-4 bg-brand-indigo/10 border border-brand-indigo/30 rounded-3xl shadow-inner">
                 <LayoutTemplate size={32} className="text-brand-indigo" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter">{t.editorTitle}</h2>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                   <div className="w-2 h-2 bg-brand-indigo rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                   LIVE WORKSPACE
                </div>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold text-slate-400">
                {results.length} POSTS GENERATED
              </div>
           </div>
        </header>

        <div className="flex-grow overflow-y-auto p-14 space-y-20 custom-scrollbar bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.05),transparent)]">
           
           {/* Visual Process Log */}
           {status === GenerationStatus.LOADING && (
              <div className="max-w-4xl mx-auto py-12 animate-fade-in">
                 <div className="bg-brand-surface border border-white/10 rounded-[4rem] p-12 shadow-3xl relative overflow-hidden ring-1 ring-white/5">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-indigo/10 overflow-hidden">
                       <div className="h-full bg-brand-indigo animate-[progress_3s_infinite_linear]" style={{width: '40%'}} />
                    </div>
                    
                    <div className="flex justify-between items-center mb-14">
                      <h3 className="text-base font-black uppercase tracking-[0.4em] text-brand-indigo flex items-center gap-4">
                        <Activity size={24} />
                        {t.workLog}
                      </h3>
                      <div className="px-4 py-2 bg-brand-indigo/20 text-brand-indigo rounded-full text-[10px] font-black animate-pulse">
                        PROCESSING...
                      </div>
                    </div>

                    <div className="space-y-8">
                       {([
                         lang === 'ar' ? 'تحليل طلب الهيمنة وتحديد المنصات' : 'Analyzing dominance request & detecting platforms',
                         lang === 'ar' ? 'اختراق ترندات الويب العميقة واستخراج الكلمات الفيروسية' : 'Breaching web trends & extracting viral keywords',
                         lang === 'ar' ? 'محاكاة سيكولوجية الجمهور المستهدف' : 'Simulating target audience psychology',
                         lang === 'ar' ? 'هندسة الهاشتاجات المسرّعة للنمو' : 'Engineering growth-accelerating hashtags',
                         lang === 'ar' ? 'صياغة المحتوى الخارق النهائي' : 'Crafting final hyper-content assets'
                       ]).map((step, idx) => {
                          const isDone = currentStep > idx;
                          const isCurrent = currentStep === idx;
                          return (
                            <div key={idx} className={`flex items-center gap-6 transition-all duration-700 ${isDone ? 'opacity-100' : isCurrent ? 'opacity-100 scale-105' : 'opacity-20'}`}>
                               <div className="relative">
                                  {isDone ? <CheckCircle2 size={32} className="text-green-500" /> : isCurrent ? <Loader2 size={32} className="animate-spin text-brand-indigo" /> : <Circle size={32} className="text-slate-800" />}
                                  {isCurrent && <div className="absolute inset-0 bg-brand-indigo/20 blur-xl animate-pulse" />}
                               </div>
                               <span className={`text-xl font-bold tracking-tight ${isCurrent ? 'text-white' : 'text-slate-500'}`}>{step}</span>
                            </div>
                          );
                       })}
                    </div>
                 </div>
              </div>
           )}

           {results.length > 0 && (
             <div className="grid grid-cols-1 2xl:grid-cols-2 gap-16 animate-fade-in pb-28">
               {results.map((res, i) => <ResultCard key={i} data={res} lang={lang} />)}
             </div>
           )}

           {sources.length > 0 && (
             <div className="mt-28 p-14 bg-brand-surface/60 rounded-[5rem] border border-white/10 shadow-3xl relative overflow-hidden group ring-1 ring-white/5">
               <div className="absolute -top-10 -right-10 p-20 opacity-5 group-hover:rotate-12 transition-transform duration-1000">
                 <Globe size={300} />
               </div>
               <h4 className="text-[14px] font-black uppercase text-slate-500 tracking-[0.6em] mb-16 flex items-center gap-6">
                 <Search size={28} className="text-brand-indigo" />
                 {t.sourcesLabel}
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                 {sources.map((src, i) => (
                   <a key={i} href={src.uri} target="_blank" className="px-10 py-7 bg-brand-base/60 border border-white/5 rounded-[2.5rem] text-base text-slate-300 hover:text-white hover:bg-brand-indigo/10 hover:border-brand-indigo/30 transition-all flex items-center gap-5 group/src shadow-lg">
                     <ExternalLink size={24} className="group-hover/src:scale-125 transition-transform text-brand-indigo/60" />
                     <span className="font-bold tracking-tight truncate">{src.title}</span>
                   </a>
                 ))}
               </div>
             </div>
           )}
        </div>
      </main>

    </div>
  );
};

export default App;
