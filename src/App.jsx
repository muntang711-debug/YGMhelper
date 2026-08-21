import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  Utensils, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Sun, 
  Moon, 
  RotateCcw, 
  Info, 
  Monitor, 
  X, 
  Megaphone, 
  AlertCircle, 
  GraduationCap,
  ArrowRight,
  Download,
  Share,
  FileText,
  Lock,
  KeyRound,
  ThumbsUp,
  Smile,
  Meh,
  Frown,
  Flame,
  Eye
} from 'lucide-react';
import { fetchMealSchedule, getFormattedDate } from './services/neisApi';

const CURRENT_VERSION = '1.1.0';
const CURRENT_NOTICE_ID = 'notice_2026_08_21_1';

const RATING_OPTIONS = [
  { label: '야르킁킁', icon: Flame, color: 'text-amber-500 border-amber-500/30 bg-amber-500/10' },
  { label: '야르', icon: ThumbsUp, color: 'text-blue-500 border-blue-500/30 bg-blue-500/10' },
  { label: '먹을만함', icon: Smile, color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' },
  { label: '그저그런', icon: Meh, color: 'text-slate-500 border-slate-500/30 bg-slate-500/10' },
  { label: '맛없음', icon: Frown, color: 'text-rose-500 border-rose-500/30 bg-rose-500/10' }
];

const PATCH_HISTORY = [
  {
    version: '1.1.0',
    date: '2026.08.21',
    title: '버전 1.1.0 업데이트: 실시간 급식 평가 기능 및 Cloudflare KV 연동',
    changes: [
      '오늘 급식 한정 실시간 평가 기능 추가 (야르킁킁, 야르, 먹을만함, 그저그런, 맛없음)',
      '평가 기록 7일 자동 보관 및 삭제 로직 적용',
      '알레르기 상세 팝업 및 급식 정보 UI 보완'
    ]
  },
  {
    version: '1.0.2',
    date: '2026.08.15',
    title: '버전 1.0.2 패치: 공휴일 감지 및 시간표 렌더링 안정화',
    changes: [
      '국경일 및 대체공휴일 자동 판별 로직 추가',
      '컴시간알리미 다크모드/라이트모드 안내 뷰 스텝 개선'
    ]
  },
  {
    version: '1.0.1',
    date: '2026.08.01',
    title: '버전 1.0.1 패치: PWA 지원 및 UI 테마 최적화',
    changes: [
      'PWA 홈 화면 추가 설치 가이드 모달 반영',
      '다크모드 색상 대비 및 모바일 레이아웃 조정'
    ]
  },
  {
    version: '1.0.0',
    date: '2026.07.20',
    title: '버전 1.0.0 정식 릴리즈',
    changes: [
      'NEIS API 기반 실시간 급식표 조회 서비스 시작',
      '컴시간알리미 실시간 시간표 연동'
    ]
  }
];

const ALLERGY_MAP = {
  "1": "난류", "2": "우유", "3": "메밀", "4": "땅콩", "5": "대두", "6": "밀",
  "7": "고등어", "8": "게", "9": "새우", "10": "돼지고기", "11": "복숭아",
  "12": "토마토", "13": "아황산류", "14": "호두", "15": "닭고기", "16": "쇠고기",
  "17": "오징어", "18": "조개류(굴,전복,홍합 포함)", "19": "잣"
};

const HOLIDAYS = {
  "2026-01-01": "신정", "2026-02-16": "설날 연휴", "2026-02-17": "설날", "2026-02-18": "설날 연휴",
  "2026-03-01": "삼일절", "2026-03-02": "대체공휴일", "2026-05-05": "어린이날", "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일", "2026-06-06": "현충일", "2026-08-15": "광복절", "2026-08-17": "대체공휴일",
  "2026-09-24": "추석 연휴", "2026-09-25": "추석", "2026-09-26": "추석 연휴", "2026-10-03": "개천절",
  "2026-10-05": "대체공휴일", "2026-10-09": "한글날", "2026-12-25": "성탄절"
};

const getHolidayInfo = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  if (HOLIDAYS[dateStr]) return HOLIDAYS[dateStr];

  const monthDay = `${m}-${d}`;
  const fixedHolidays = {
    "01-01": "신정", "03-01": "삼일절", "05-05": "어린이날", "06-06": "현충일",
    "08-15": "광복절", "10-03": "개천절", "10-09": "한글날", "12-25": "성탄절"
  };

  return fixedHolidays[monthDay] || null;
};

const getDishCategory = (dishName) => {
  if (!dishName) return '반찬';
  const cleanName = dishName.replace(/\([^)]*\)/g, '').trim();

  const isExcludedRiceCake = cleanName.includes('떡볶이') || cleanName.includes('떡갈비') || cleanName.includes('떡꼬치') || cleanName.includes('떡국');
  const desserts = [
    '케이크', '케익', '빵', '쿠키', '파이', '도넛', '와플', '마카롱', 
    '푸딩', '아이스크림', '타르트', '슈', '핫도그', '에그타르트',
    '경단', '꿀떡', '인절미', '송편', '가래떡', '찹쌀떡'
  ];
  if (!isExcludedRiceCake && desserts.some((d) => cleanName.includes(d))) return '디저트';

  if (
    cleanName.endsWith('차') || cleanName.includes('주스') || cleanName.includes('쥬스') || 
    cleanName.includes('에이드') || cleanName.includes('요구르트') || cleanName.includes('야쿠르트') || 
    cleanName.includes('우유') || cleanName.includes('음료') || cleanName.includes('라떼')
  ) return '음료';

  const fruits = [
    '과일', '사과', '바나나', '포도', '귤', '수박', '참외', '딸기', 
    '키위', '오렌지', '파인애플', '멜론', '메론', '체리', '자두', 
    '한라봉', '천혜향', '레드향', '샤인머스캣', '샤인머스켓', '망고', '청포도', '블루베리', '자몽'
  ];
  if (fruits.some((f) => cleanName.includes(f))) return '과일';

  if (cleanName.includes('밥') || cleanName.includes('덮밥') || cleanName.includes('볶음밥') || cleanName.includes('비빔밥')) return '밥';

  if (
    cleanName.endsWith('국') || cleanName.endsWith('탕') || cleanName.endsWith('찌개') || 
    cleanName.endsWith('스프') || cleanName.endsWith('수프') || cleanName.endsWith('우동') || 
    cleanName.endsWith('라면') || cleanName.endsWith('국수') || cleanName.endsWith('전골')
  ) return '국';

  return '반찬';
};

const getCategoryBadgeStyle = (category, isDark) => {
  switch (category) {
    case '디저트': return isDark ? 'bg-pink-500/15 text-pink-300 border-pink-500/30' : 'bg-pink-100 text-pink-700 border-pink-200';
    case '음료': return isDark ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-cyan-100 text-cyan-700 border-cyan-200';
    case '과일': return isDark ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-rose-100 text-rose-700 border-rose-200';
    case '밥': return isDark ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-700 border-blue-200';
    case '국': return isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-200';
    default: return isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const isAuthSession = sessionStorage.getItem('ygm_beta_auth') === 'true';
    const isBetaPath = window.location.pathname.startsWith('/beta');
    return isAuthSession && isBetaPath;
  });

  const [inputPasscode, setInputPasscode] = useState('');
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const isAuthSession = sessionStorage.getItem('ygm_beta_auth') === 'true';
    const isBetaPath = window.location.pathname.startsWith('/beta');

    if (isBetaPath && !isAuthSession) {
      window.history.replaceState({}, '', '/');
      setIsAuthenticated(false);
    } else if (isAuthSession && !isBetaPath) {
      window.history.replaceState({}, '', '/beta');
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (inputPasscode.trim() === 'beta') {
      sessionStorage.setItem('ygm_beta_auth', 'true');
      window.history.pushState({}, '', '/beta');
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setInputPasscode('');
    }
  };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('ygm_theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [activeTab, setActiveTab] = useState('meal');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [isStandalone, setIsStandalone] = useState(false);

  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    while (today.getDay() === 0 || today.getDay() === 6) {
      today.setDate(today.getDate() + 1);
    }
    return today;
  });

  const [showNotice, setShowNotice] = useState(false);
  const [isClosingNotice, setIsClosingNotice] = useState(false);
  const [neverShowNoticeChecked, setNeverShowNoticeChecked] = useState(false);
  const [isAutoNotice, setIsAutoNotice] = useState(false);

  const [showPatchModal, setShowPatchModal] = useState(false);
  const [isClosingPatch, setIsClosingPatch] = useState(false);
  const [neverShowPatchChecked, setNeverShowPatchChecked] = useState(false);
  const [selectedPatchVersion, setSelectedPatchVersion] = useState(CURRENT_VERSION);
  const [isAutoPatch, setIsAutoPatch] = useState(false);
  const [pendingPatchShow, setPendingPatchShow] = useState(false);

  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [isClosingAllergy, setIsClosingAllergy] = useState(false);

  const [selectedDishAllergy, setSelectedDishAllergy] = useState(null);
  const [isClosingDishAllergy, setIsClosingDishAllergy] = useState(false);

  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isClosingInstall, setIsClosingInstall] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const [webviewStep, setWebviewStep] = useState(() => {
    const isConfirmed = localStorage.getItem('ygm_comci_confirmed') === 'true';
    const savedTheme = localStorage.getItem('ygm_theme');
    const isDark = savedTheme ? savedTheme === 'dark' : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isConfirmed) return isDark ? 1 : 2;
    return 0;
  });

  const dateInputRef = useRef(null);
  const [meal, setMeal] = useState({ menuItems: [], calories: '', status: 'LOADING' });
  const [mealLoading, setMealLoading] = useState(true);

  // 🍱 평가 관련 상태
  const [ratings, setRatings] = useState({ "야르킁킁": 0, "야르": 0, "먹을만함": 0, "그저그런": 0, "맛없음": 0 });
  const [userVotedRating, setUserVotedRating] = useState(null);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

  const formattedDateStr = getFormattedDate(currentDate);
  const todayStr = getFormattedDate(new Date());
  const isToday = formattedDateStr === todayStr;

  const datePickerValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const holidayName = getHolidayInfo(currentDate);
  const comciStudentUrl = 'https://ygm-comci-proxy.muntang711.workers.dev';

  useEffect(() => {
    const isAnyModalOpen = showNotice || showPatchModal || showAllergyModal || Boolean(selectedDishAllergy) || showInstallGuide;
    if (isAnyModalOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [showNotice, showPatchModal, showAllergyModal, selectedDishAllergy, showInstallGuide]);

  const triggerCloseAnimation = (setClosingState, setModalState) => {
    setClosingState(true);
    setTimeout(() => {
      setClosingState(false);
      setModalState(false);
    }, 200);
  };

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };
    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);
    return () => window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkStandalone);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const hiddenNoticeId = localStorage.getItem('ygm_hide_notice_id');
    const hiddenPatchVersion = localStorage.getItem('ygm_hide_patch_version');

    const shouldShowNotice = hiddenNoticeId !== CURRENT_NOTICE_ID;
    const shouldShowPatch = hiddenPatchVersion !== CURRENT_VERSION;

    if (shouldShowNotice) {
      setIsAutoNotice(true);
      setShowNotice(true);
      if (shouldShowPatch) setPendingPatchShow(true);
    } else if (shouldShowPatch) {
      setIsAutoPatch(true);
      setSelectedPatchVersion(CURRENT_VERSION);
      setShowPatchModal(true);
    }
  }, [isAuthenticated]);

  // 📊 평가 데이터 불러오기 및 로컬 투표 기록 확인
  const loadRatings = useCallback(async () => {
    try {
      const savedVote = localStorage.getItem(`ygm_voted_${formattedDateStr}`);
      setUserVotedRating(savedVote);

      const res = await fetch(`/api/ratings?date=${formattedDateStr}`);
      if (res.ok) {
        const data = await res.json();
        setRatings(data);
      }
    } catch (err) {
      console.error('Failed to load ratings:', err);
    }
  }, [formattedDateStr]);

  // 🗳️ 평가 투표 제출
  const handleVoteRating = async (ratingLabel) => {
    if (!isToday || userVotedRating || isRatingSubmitting) return;

    setIsRatingSubmitting(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: formattedDateStr, rating: ratingLabel })
      });

      if (res.ok) {
        const updatedData = await res.json();
        setRatings(updatedData);
        setUserVotedRating(ratingLabel);
        localStorage.setItem(`ygm_voted_${formattedDateStr}`, ratingLabel);
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      setShowInstallGuide(true);
    }
  };

  const confirmComciStep = (nextStep) => {
    localStorage.setItem('ygm_comci_confirmed', 'true');
    setWebviewStep(nextStep);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const nextTheme = !prev;
      localStorage.setItem('ygm_theme', nextTheme ? 'dark' : 'light');
      if (nextTheme && webviewStep === 2) setWebviewStep(1);
      else if (!nextTheme && webviewStep === 1) setWebviewStep(2);
      return nextTheme;
    });
  };

  const openNoticeModal = () => {
    setIsAutoNotice(false);
    setNeverShowNoticeChecked(localStorage.getItem('ygm_hide_notice_id') === CURRENT_NOTICE_ID);
    setShowNotice(true);
    setIsMenuOpen(false);
  };

  const openPatchModal = () => {
    setIsAutoPatch(false);
    setNeverShowPatchChecked(localStorage.getItem('ygm_hide_patch_version') === CURRENT_VERSION);
    setSelectedPatchVersion(CURRENT_VERSION);
    setShowPatchModal(true);
    setIsMenuOpen(false);
  };

  const handleCloseNotice = () => {
    if (isAutoNotice && neverShowNoticeChecked) localStorage.setItem('ygm_hide_notice_id', CURRENT_NOTICE_ID);
    triggerCloseAnimation(setIsClosingNotice, setShowNotice);
    if (pendingPatchShow) {
      setTimeout(() => {
        setIsAutoPatch(true);
        setSelectedPatchVersion(CURRENT_VERSION);
        setShowPatchModal(true);
        setPendingPatchShow(false);
      }, 250);
    }
  };

  const handleClosePatch = () => {
    if (isAutoPatch && neverShowPatchChecked) localStorage.setItem('ygm_hide_patch_version', CURRENT_VERSION);
    triggerCloseAnimation(setIsClosingPatch, setShowPatchModal);
  };

  const openDatePicker = () => {
    if (dateInputRef.current) {
      if ('showPicker' in dateInputRef.current) {
        try { dateInputRef.current.showPicker(); } catch (e) { dateInputRef.current.focus(); }
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    while (newDate.getDay() === 0 || newDate.getDay() === 6) {
      newDate.setDate(newDate.getDate() + (days > 0 ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const resetToToday = () => {
    const today = new Date();
    while (today.getDay() === 0 || today.getDay() === 6) {
      today.setDate(today.getDate() + 1);
    }
    setCurrentDate(today);
  };

  const handleDateSelect = (e) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    const selected = new Date(y, m - 1, d);
    if (selected.getDay() === 6) selected.setDate(selected.getDate() + 2);
    else if (selected.getDay() === 0) selected.setDate(selected.getDate() + 1);
    setCurrentDate(selected);
  };

  const loadMealData = useCallback(() => {
    setMealLoading(true);
    fetchMealSchedule(formattedDateStr).then((mealRes) => {
      setMeal(mealRes);
      setMealLoading(false);
    });
    loadRatings();
  }, [formattedDateStr, loadRatings]);

  useEffect(() => {
    if (isAuthenticated) loadMealData();
  }, [loadMealData, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
        isDarkMode ? 'bg-neutral-950 text-neutral-50' : 'bg-slate-100 text-slate-900'
      }`}>
        <div className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl relative animate-modal-in ${
          isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-600 border border-blue-500/20 flex items-center justify-center mb-3">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight">DEV 테스트 접근 인증</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-1.5 font-medium">
              인증 코드를 입력해야 테스트 환경으로 이동할 수 있습니다.
            </p>
          </div>

          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <div className="relative">
              <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="인증 코드를 입력하세요"
                value={inputPasscode}
                onChange={(e) => setInputPasscode(e.target.value)}
                className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm font-bold outline-none transition-all ${
                  authError ? 'border-red-500 ring-2 ring-red-500/20' : 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                } ${
                  isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white placeholder-neutral-600' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {authError && (
              <p className="text-xs font-bold text-red-500 flex items-center gap-1.5 pl-1">
                <AlertCircle className="w-4 h-4" /> 올바르지 않은 인증 코드입니다.
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl font-extrabold text-sm bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>접근하기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-neutral-800 text-center">
            <span className="text-xs text-slate-400 font-semibold">
              dev.ygmhelper.xyz | YGMhelper Dev Server
            </span>
          </div>
        </div>
      </div>
    );
  }

  const totalVotes = Object.values(ratings).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className={`min-h-screen transition-colors duration-200 selection:bg-blue-500 selection:text-white relative ${
      isDarkMode ? 'bg-neutral-950 text-neutral-50' : 'bg-slate-100 text-slate-900'
    }`}>
      <style>{`
        @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Regular.woff2') format('woff2');
            font-weight: 400;
            font-display: swap;
        }
        @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Bold.woff2') format('woff2');
            font-weight: 700;
            font-display: swap;
        }
        body, * { font-family: 'Pretendard', sans-serif !important; }
        @keyframes modalPopIn { 0% { opacity: 0; transform: scale(0.92) translateY(12px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes modalPopOut { 0% { opacity: 1; transform: scale(1) translateY(0); } 100% { opacity: 0; transform: scale(0.92) translateY(10px); } }
        @keyframes backdropFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes backdropFadeOut { from { opacity: 1; } to { opacity: 0; } }
        .animate-modal-in { animation: modalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-modal-out { animation: modalPopOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-backdrop-in { animation: backdropFadeIn 0.25s ease-out forwards; }
        .animate-backdrop-out { animation: backdropFadeOut 0.2s ease-out forwards; }
      `}</style>

      {/* 📱 PWA 모달 */}
      {showInstallGuide && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md ${isClosingInstall ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative ${isClosingInstall ? 'animate-modal-out' : 'animate-modal-in'} ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600"><Download className="w-5 h-5" /></div>
                <h2 className="font-bold text-base">YGMhelper 앱 설치 방법</h2>
              </div>
              <button onClick={() => triggerCloseAnimation(setIsClosingInstall, setShowInstallGuide)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 text-sm font-medium leading-relaxed">
              <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                <p className="font-bold text-blue-500 flex items-center gap-1.5 mb-1"><Share className="w-4 h-4" /> 아이폰 사용자</p>
                <p className="text-slate-600 dark:text-neutral-400">사파리 하단 공유 버튼(↑) 선택 후 <strong>[홈 화면에 추가]</strong> 클릭</p>
              </div>
              <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                <p className="font-bold text-emerald-500 flex items-center gap-1.5 mb-1">📱 안드로이드 사용자</p>
                <p className="text-slate-600 dark:text-neutral-400">브라우저 우측 상단 메뉴(⋮) 선택 후 <strong>[앱 설치]</strong> 클릭</p>
              </div>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
              <button onClick={() => triggerCloseAnimation(setIsClosingInstall, setShowInstallGuide)} className="text-sm px-4 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 📢 공지사항 모달 */}
      {showNotice && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md ${isClosingNotice ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative ${isClosingNotice ? 'animate-modal-out' : 'animate-modal-in'} ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600"><Megaphone className="w-5 h-5" /></div>
                <h2 className="font-bold text-base sm:text-lg">서비스 공지사항</h2>
              </div>
              <button onClick={handleCloseNotice} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">공지</span>
                <h3 className="font-extrabold text-sm sm:text-base">급식 평가 기능 오픈</h3>
              </div>
              <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed font-medium ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                오늘의 급식을 평가할 수 있는 실시간 평가 시스템이 추가되었습니다! 맛에 따라 투표해 보세요.
              </div>
            </div>
            <div className={`flex items-center ${isAutoNotice ? 'justify-between' : 'justify-end'} pt-4 border-t border-slate-200 dark:border-neutral-800`}>
              {isAutoNotice && (
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer select-none text-slate-600 dark:text-neutral-400">
                  <input type="checkbox" checked={neverShowNoticeChecked} onChange={(e) => setNeverShowNoticeChecked(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                  <span>다시 보지 않기</span>
                </label>
              )}
              <button onClick={handleCloseNotice} className="text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 📜 패치노트 모달 */}
      {showPatchModal && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md ${isClosingPatch ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
          <div className={`w-full max-w-2xl max-h-[85vh] p-5 sm:p-6 rounded-3xl border shadow-2xl relative flex flex-col justify-between ${isClosingPatch ? 'animate-modal-out' : 'animate-modal-in'} ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600"><FileText className="w-5 h-5" /></div>
                <h2 className="font-bold text-base sm:text-lg">패치노트 히스토리</h2>
              </div>
              <button onClick={handleClosePatch} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 my-1 flex-1 min-h-0 overflow-hidden">
              <div className="w-full sm:w-44 flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-y-auto shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-neutral-800 pr-0 sm:pr-3 max-h-[52px] sm:max-h-full">
                {PATCH_HISTORY.map((patch) => (
                  <button key={patch.version} onClick={() => setSelectedPatchVersion(patch.version)} className={`h-9 px-3.5 rounded-xl font-bold text-xs sm:text-sm text-left flex items-center justify-between shrink-0 ${selectedPatchVersion === patch.version ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-100 text-slate-700'}`}>
                    <span>v{patch.version}</span>
                    {patch.version === CURRENT_VERSION && <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-neutral-900 font-extrabold ml-1">최신</span>}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pl-0 sm:pl-2 pt-1 sm:pt-0">
                {(() => {
                  const patch = PATCH_HISTORY.find((p) => p.version === selectedPatchVersion);
                  if (!patch) return null;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-2">
                        <h3 className="font-extrabold text-sm sm:text-base text-blue-600 dark:text-blue-400">{patch.title}</h3>
                        <span className="text-xs text-slate-400">{patch.date}</span>
                      </div>
                      <div className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-medium ${isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <ul className="list-disc list-inside space-y-1.5">{patch.changes.map((change, idx) => (<li key={idx}>{change}</li>))}</ul>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className={`flex items-center ${isAutoPatch ? 'justify-between' : 'justify-end'} pt-3 border-t border-slate-200 dark:border-neutral-800 shrink-0 mt-2`}>
              {isAutoPatch && (
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer select-none text-slate-600 dark:text-neutral-400">
                  <input type="checkbox" checked={neverShowPatchChecked} onChange={(e) => setNeverShowPatchChecked(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                  <span>이 버전에서 다시 보지 않기</span>
                </label>
              )}
              <button onClick={handleClosePatch} className="text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white">닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 🍤 개별 메뉴 알레르기 상세 팝업 */}
      {selectedDishAllergy && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md ${isClosingDishAllergy ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
          <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl relative ${isClosingDishAllergy ? 'animate-modal-out' : 'animate-modal-in'} ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 mb-3">
              <h3 className="font-bold text-base">{selectedDishAllergy.dishName} 알레르기 정보</h3>
              <button onClick={() => triggerCloseAnimation(setIsClosingDishAllergy, () => setSelectedDishAllergy(null))} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs sm:text-sm font-medium">
              <p className="text-slate-500 dark:text-neutral-400">포함된 알레르기 유발 성분 번호: <strong className="text-orange-500">{selectedDishAllergy.allergyStr}</strong></p>
              <div className={`p-3.5 rounded-2xl border space-y-1.5 ${isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                {selectedDishAllergy.allergyStr.split('.').map((num) => num.trim()).filter(Boolean).map((num) => (
                  <div key={num} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-orange-500">{num}번</span>
                    <span className="font-medium text-slate-700 dark:text-neutral-300">{ALLERGY_MAP[num] || '알 수 없음'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
              <button onClick={() => triggerCloseAnimation(setIsClosingDishAllergy, () => setSelectedDishAllergy(null))} className="text-xs px-4 py-2 rounded-xl font-bold bg-blue-600 text-white">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* ℹ️ 전체 알레르기 번호 안내 팝업 */}
      {showAllergyModal && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md ${isClosingAllergy ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
          <div className={`w-full max-w-md max-h-[80vh] p-6 rounded-3xl border shadow-2xl relative flex flex-col ${isClosingAllergy ? 'animate-modal-out' : 'animate-modal-in'} ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 mb-3 shrink-0">
              <h3 className="font-bold text-base sm:text-lg">알레르기 유발 성분 번호표</h3>
              <button onClick={() => triggerCloseAnimation(setIsClosingAllergy, setShowAllergyModal)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 my-2">
              {Object.entries(ALLERGY_MAP).map(([num, name]) => (
                <div key={num} className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs ${isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="font-extrabold text-orange-500 w-6">{num}.</span>
                  <span className="font-medium text-slate-700 dark:text-neutral-300">{name}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-neutral-800 flex justify-end shrink-0">
              <button onClick={() => triggerCloseAnimation(setIsClosingAllergy, setShowAllergyModal)} className="text-xs px-4 py-2 rounded-xl font-bold bg-blue-600 text-white">닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md ${isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <GraduationCap className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className={`font-bold text-lg tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>YGMhelper</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold bg-purple-600 text-white">DEV / BETA</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isStandalone && (
              <button onClick={handleInstallClick} className="p-2.5 rounded-xl border bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-sm">
                <Download className="w-4.5 h-4.5" />
              </button>
            )}
            <button onClick={toggleDarkMode} className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-amber-400' : 'bg-white border-slate-300 text-slate-700'}`}>
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setIsMenuOpen((prev) => !prev)} className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-200' : 'bg-white border-slate-300 text-slate-700'}`}>
                <ChevronDown className={`w-4.5 h-4.5 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isMenuOpen && (
                <div className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-2xl p-1.5 z-50 ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-200' : 'bg-white border-slate-200 text-slate-800'}`}>
                  <button onClick={openNoticeModal} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-neutral-800">
                    <Megaphone className="w-4 h-4 text-blue-500" /><span>공지사항</span>
                  </button>
                  <button onClick={openPatchModal} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-neutral-800">
                    <FileText className="w-4 h-4 text-purple-500" /><span>패치노트</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className={`relative flex md:hidden p-1.5 mb-4 rounded-2xl border ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-200/80 border-slate-300/60'}`}>
          <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] transition-all duration-300 rounded-xl shadow-md ${activeTab === 'meal' ? 'left-1.5' : 'left-[calc(50%+0.1875rem)]'} ${isDarkMode ? 'bg-neutral-800' : 'bg-white'}`} />
          <button onClick={() => setActiveTab('meal')} className={`relative z-10 flex-1 py-3 font-extrabold text-base flex items-center justify-center gap-2 ${activeTab === 'meal' ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'text-slate-500'}`}>
            <Utensils className="w-5 h-5 text-orange-500" /><span>급식표</span>
          </button>
          <button onClick={() => setActiveTab('schedule')} className={`relative z-10 flex-1 py-3 font-extrabold text-base flex items-center justify-center gap-2 ${activeTab === 'schedule' ? (isDarkMode ? 'text-white' : 'text-slate-900') : 'text-slate-500'}`}>
            <BookOpen className="w-5 h-5 text-blue-500" /><span>실시간 시간표</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          
          {/* 🍽️ 급식표 Card */}
          <div className={`p-5 sm:p-6 rounded-3xl border flex flex-col justify-between ${activeTab === 'meal' ? 'block' : 'hidden md:block'} ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div>
              <div className={`flex items-center justify-between pb-3.5 border-b mb-4 ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600"><Utensils className="w-5.5 h-5.5" /></div>
                  <div>
                    <h2 className={`font-bold text-base sm:text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>오늘의 급식</h2>
                    <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>YGM 식단표</p>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-2xl border mb-4 flex items-center justify-between gap-2 ${holidayName ? (isDarkMode ? 'bg-red-950/40 border-red-900/60' : 'bg-red-50 border-red-200') : (isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200')}`}>
                <div onClick={openDatePicker} className="flex items-center gap-2 cursor-pointer select-none">
                  <CalendarIcon className={`w-5 h-5 ${holidayName ? 'text-red-500' : 'text-blue-500'}`} />
                  <span className={`text-sm sm:text-base font-bold ${holidayName ? 'text-red-700 dark:text-red-400' : (isDarkMode ? 'text-white' : 'text-slate-900')}`}>
                    {currentDate.getFullYear()}.{currentDate.getMonth() + 1}.{currentDate.getDate()}
                  </span>
                  <input ref={dateInputRef} type="date" value={datePickerValue} onChange={handleDateSelect} className="sr-only" />
                </div>

                <div className="flex items-center gap-1.5">
                  <button onClick={resetToToday} className={`text-xs px-3 py-2 rounded-xl font-bold border ${isDarkMode ? 'border-neutral-700 text-neutral-300' : 'border-slate-300 text-slate-700'}`}>
                    <RotateCcw className="w-3.5 h-3.5 inline mr-1" />오늘
                  </button>
                  <button onClick={() => changeDate(-1)} className={`p-2 rounded-xl border ${isDarkMode ? 'border-neutral-700 text-neutral-300' : 'border-slate-300 text-slate-700'}`}><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => changeDate(1)} className={`p-2 rounded-xl border ${isDarkMode ? 'border-neutral-700 text-neutral-300' : 'border-slate-300 text-slate-700'}`}><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>

              {/* 급식 정보 목록 */}
              {mealLoading ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
                  <span className="text-sm font-bold">급식 데이터 로딩 중...</span>
                </div>
              ) : holidayName ? (
                <div className={`p-8 rounded-2xl text-center border ${isDarkMode ? 'bg-red-950/40 border-red-900/50 text-red-300' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <p className="font-bold">🎈 오늘은 공휴일입니다 ({holidayName})</p>
                </div>
              ) : meal.menuItems && meal.menuItems.length > 0 ? (
                <div className="space-y-2.5">
                  {meal.menuItems.map((dish, idx) => {
                    const category = getDishCategory(dish.name);
                    const badgeClass = getCategoryBadgeStyle(category, isDarkMode);
                    return (
                      <div key={idx} className={`px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 ${isDarkMode ? 'bg-neutral-950/80 border-neutral-800/80' : 'bg-slate-50 border-slate-200/80'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm sm:text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{dish.name}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${badgeClass}`}>{category}</span>
                        </div>
                        {dish.allergy && (
                          <button 
                            onClick={() => setSelectedDishAllergy({ dishName: dish.name, allergyStr: dish.allergy })} 
                            className="text-xs font-semibold px-2 py-1 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors"
                          >
                            알레르기: {dish.allergy}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">급식 정보가 없습니다.</div>
              )}

              {/* 🗳️ 급식 정보 아래 실시간 평가 섹션 */}
              {!holidayName && (
                <div className={`mt-5 p-4 rounded-2xl border ${isDarkMode ? 'bg-neutral-950/90 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                      <span>🍱 오늘의 급식 평가</span>
                      {totalVotes > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold">{totalVotes}명 참여</span>}
                    </span>
                    {!isToday ? (
                      <span className="text-[11px] text-amber-500 font-bold">오늘 급식만 평가 가능</span>
                    ) : userVotedRating ? (
                      <span className="text-xs text-emerald-500 font-bold">✓ 평가 완료</span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {RATING_OPTIONS.map((opt) => {
                      const IconComponent = opt.icon;
                      const count = ratings[opt.label] || 0;
                      const isSelected = userVotedRating === opt.label;
                      const isDisabled = !isToday || Boolean(userVotedRating) || isRatingSubmitting;

                      return (
                        <button
                          key={opt.label}
                          onClick={() => handleVoteRating(opt.label)}
                          disabled={isDisabled}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            isSelected 
                              ? 'ring-2 ring-blue-500 border-blue-500 font-black scale-105' 
                              : opt.color
                          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 cursor-pointer'}`}
                        >
                          <IconComponent className="w-4 h-4" />
                          <span className="text-[11px] font-bold leading-none">{opt.label}</span>
                          <span className="text-[10px] font-extrabold opacity-75">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2">
              <button onClick={() => setShowAllergyModal(true)} className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-xs border ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <Info className="w-4 h-4 text-orange-500" /><span>전체 알레르기 목록</span>
              </button>
              <button onClick={loadMealData} disabled={mealLoading} className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-xs border ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <RotateCcw className={`w-4 h-4 text-blue-500 ${mealLoading ? 'animate-spin' : ''}`} /><span>다시 불러오기</span>
              </button>
            </div>
          </div>

          {/* 📚 시간표 Card */}
          <div className={`p-5 sm:p-6 rounded-3xl border flex flex-col justify-between ${activeTab === 'schedule' ? 'block' : 'hidden md:block'} ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div>
              <div className={`flex items-center justify-between pb-3.5 border-b mb-4 ${isDarkMode ? 'border-neutral-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600"><BookOpen className="w-5.5 h-5.5" /></div>
                  <div>
                    <h2 className={`font-bold text-base sm:text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>실시간 시간표</h2>
                    <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>컴시간알리미</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-blue-600 text-white flex items-center gap-1"><Monitor className="w-3.5 h-3.5" /> 실시간</span>
              </div>

              {webviewStep === 0 && (
                <div className={`rounded-2xl border p-6 h-[420px] flex flex-col items-center justify-center text-center gap-4 ${isDarkMode ? 'bg-neutral-950/90 border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                  <h3 className="font-bold text-base">학교 및 학년/반 선택 안내</h3>
                  <button onClick={() => confirmComciStep(isDarkMode ? 1 : 2)} className="text-sm px-5 py-3 rounded-2xl font-bold bg-blue-600 text-white flex items-center gap-2">다음으로 <ArrowRight className="w-4 h-4" /></button>
                </div>
              )}

              {webviewStep === 1 && (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 h-[420px] p-6 flex flex-col items-center justify-center text-center gap-4">
                  <h3 className="font-bold text-base text-neutral-200">컴시간 다크모드 미지원 안내</h3>
                  <button onClick={() => setWebviewStep(2)} className="text-sm px-5 py-3 rounded-2xl font-bold bg-blue-600 text-white flex items-center gap-2"><Eye className="w-4 h-4" /> 표시하기</button>
                </div>
              )}

              {webviewStep === 2 && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-white h-[420px] relative w-full">
                  <iframe src={comciStudentUrl} title="시간표" className="w-full h-full border-0" style={{ zoom: '0.78' }} />
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800 text-xs text-slate-500">출처: 컴시간알리미</div>
          </div>

        </div>
      </main>
    </div>
  );
}