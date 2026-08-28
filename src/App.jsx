import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Utensils, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Sun, 
  Moon, 
  Sparkles, 
  RotateCcw, 
  Info, 
  Monitor, 
  X, 
  Megaphone, 
  AlertCircle, 
  Eye, 
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Download,
  Share,
  History,
  FileText,
  ThumbsUp,
  Smile,
  Meh,
  Frown,
  Flame
} from 'lucide-react';
import { fetchMealSchedule, getFormattedDate } from './services/neisApi';

// 앱 현재 버전 및 공지사항 고유 ID
const CURRENT_VERSION = '1.2.4';
const CURRENT_NOTICE_ID = 'notice_2026_08_22_rating_feature';

const RATING_OPTIONS = [
  { label: '야르킁킁', icon: Flame, color: 'text-amber-500 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 shadow-amber-500/10' },
  { label: '야르', icon: ThumbsUp, color: 'text-blue-500 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 shadow-blue-500/10' },
  { label: '먹을만함', icon: Smile, color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-emerald-500/10' },
  { label: '그저그런', icon: Meh, color: 'text-slate-500 border-slate-500/30 bg-slate-500/10 hover:bg-slate-500/20 shadow-slate-500/10' },
  { label: '맛없음', icon: Frown, color: 'text-rose-500 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 shadow-rose-500/10' }
];

// 패치노트 전체 히스토리 데이터베이스
const PATCH_HISTORY = [
  {
    version: '1.2.4',
    date: '2026.08.28',
    title: '버전 1.2.4 업데이트: package-lock.json 의존성 버전 정밀 맞춤 및 빌드 서버 동기화 패치',
    changes: [
      'motion 라이브러리 버전을 12.43.0 표준 사양으로 정밀 동기화',
      '배포 서버 npm ci 락파일 충돌 에러 완전 방지 패치 완',
      'MZ식 알잘딱깔센 모션 인터랙션 스근하게 유지'
    ]
  },
  {
    version: '1.2.3',
    date: '2026.08.28',
    title: '버전 1.2.3 업데이트: motion/react 전면 갈아엎기 & MZ식 알잘딱깔센 UI 텍스트 패치 폼 미쳤다',
    changes: [
      'motion/react 라이브러리로 전체 모션 시스템 스근하게 이관 완',
      '공지사항 및 패치노트 멘트 MZ식 트렌디 감성으로 전면 개편',
      '스프링 모션 타격감과 터치 마이크로 인터랙션 개쌉이득 강화'
    ]
  },
  {
    version: '1.2.2',
    date: '2026.08.28',
    title: '버전 1.2.2 업데이트: 모션 애니메이션 전면 개편',
    changes: [
      '3D 고탄성 스프링 인터랙션 및 카드 호버 연출 강화'
    ]
  },
  {
    version: '1.2.1',
    date: '2026.08.28',
    title: '버전 1.2.1 업데이트: npm ci 빌드 오류 조치',
    changes: [
      '의존성 버전 동기화 및 패키지 리포지토리 정비'
    ]
  },
  {
    version: '1.2.0',
    date: '2026.08.27',
    title: '버전 1.2.0 업데이트: 인터랙티브 모달 시스템 구축',
    changes: [
      '모달 팝업 및 배경 모션 이펙트 적용'
    ]
  },
  {
    version: '1.1.4',
    date: '2026.08.22',
    title: '버전 1.1.4 업데이트: 공지사항 팝업 재노출 버그 수정',
    changes: [
      '공지사항 ID 고정으로 중복 팝업 차단'
    ]
  },
  {
    version: '1.1.0',
    date: '2026.08.22',
    title: '버전 1.1.0 업데이트: 실시간 급식 평가 기능 연동',
    changes: [
      '실시간 급식 평가 모듈 연동'
    ]
  },
  {
    version: '1.0.0',
    date: '2026.08.17',
    title: '버전 1.0.0 업데이트: YGMhelper 서비스 공식 출시',
    changes: [
      'YGM 전용 스마트 스쿨 도우미 런칭'
    ]
  }
];

// NEIS 알러지 정보 19종 목록 및 맵
const ALLERGY_MAP = {
  "1": "난류", "2": "우유", "3": "메밀", "4": "땅콩", "5": "대두", "6": "밀",
  "7": "고등어", "8": "게", "9": "새우", "10": "돼지고기", "11": "복숭아",
  "12": "토마토", "13": "아황산류", "14": "호두", "15": "닭고기", "16": "쇠고기",
  "17": "오징어", "18": "조개류(굴,전복,홍합 포함)", "19": "잣"
};

const ALLERGY_LIST = Object.entries(ALLERGY_MAP).map(([num, name]) => `${num}. ${name}`);

// 주요 공휴일 데이터베이스
const HOLIDAYS = {
  "2025-01-01": "신정", "2025-01-28": "설날 연휴", "2025-01-29": "설날", "2025-01-30": "설날 연휴",
  "2025-03-01": "삼일절", "2025-03-03": "대체공휴일", "2025-05-05": "어린이날", "2025-05-06": "부처님오신날",
  "2025-06-06": "현충일", "2025-08-15": "광복절", "2025-10-03": "개천절", "2025-10-05": "추석 연휴",
  "2025-10-06": "추석", "2025-10-07": "추석 연휴", "2025-10-08": "대체공휴일", "2025-10-09": "한글날", "2025-12-25": "성탄절",
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

const isHolidayOrWeekend = (date) => {
  const day = date.getDay();
  if (day === 0 || day === 6) return true;
  return Boolean(getHolidayInfo(date));
};

const getDishCategory = (dishName) => {
  if (!dishName) return '반찬';
  
  const cleanName = dishName.replace(/\([^)]*\)/g, '').trim();

  if (cleanName.includes('샐러드')) return '반찬';

  const isExcludedRiceCake = cleanName.includes('떡볶이') || cleanName.includes('떡갈비') || cleanName.includes('떡꼬치') || cleanName.includes('떡국');
  const desserts = [
    '케이크', '케익', '빵', '쿠키', '파이', '도넛', '와플', '마카롱', 
    '푸딩', '아이스크림', '타르트', '슈', '핫도그', '에그타르트',
    '경단', '꿀떡', '인절미', '송편', '가래떡', '찹쌀떡'
  ];
  if (!isExcludedRiceCake && desserts.some((d) => cleanName.includes(d))) {
    return '디저트';
  }

  if (
    cleanName.endsWith('차') || 
    cleanName.includes('주스') || 
    cleanName.includes('쥬스') || 
    cleanName.includes('에이드') || 
    cleanName.includes('요구르트') || 
    cleanName.includes('야쿠르트') || 
    cleanName.includes('우유') || 
    cleanName.includes('음료') ||
    cleanName.includes('라떼')
  ) {
    return '음료';
  }

  const fruits = [
    '과일', '사과', '바나나', '포도', '귤', '수박', '참외', '딸기', 
    '키위', '오렌지', '파인애플', '멜론', '메론', '체리', '자두', 
    '한라봉', '천혜향', '레드향', '샤인머스캣', '샤인머스켓', '망고', 
    '청포도', '블루베리', '자몽'
  ];
  if (fruits.some((f) => cleanName.includes(f))) {
    return '과일';
  }

  if (cleanName.includes('밥') || cleanName.includes('덮밥') || cleanName.includes('볶음밥') || cleanName.includes('비빔밥')) {
    return '밥';
  }

  if (
    cleanName.endsWith('국') || 
    cleanName.endsWith('탕') || 
    cleanName.endsWith('찌개') || 
    cleanName.endsWith('스프') || 
    cleanName.endsWith('수프') ||
    cleanName.endsWith('우동') ||
    cleanName.endsWith('라면') ||
    cleanName.endsWith('국수') ||
    cleanName.endsWith('전골')
  ) {
    return '국';
  }

  return '반찬';
};

const getCategoryBadgeStyle = (category, isDark) => {
  switch (category) {
    case '디저트':
      return isDark ? 'bg-pink-500/15 text-pink-300 border-pink-500/30' : 'bg-pink-100 text-pink-700 border-pink-200';
    case '음료':
      return isDark ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-cyan-100 text-cyan-700 border-cyan-200';
    case '과일':
      return isDark ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-rose-100 text-rose-700 border-rose-200';
    case '밥':
      return isDark ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-700 border-blue-200';
    case '국':
      return isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-200';
    default:
      return isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
};

// motion/react 전용 스근한 스프링 컴포넌트 옵션
const modalOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

const modalContentVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 30 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 25 } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.85, 
    y: 15, 
    transition: { duration: 0.15 } 
  }
};

const listContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 }
  }
};

const listItemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 24 } }
};

export default function App() {
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
    while (isHolidayOrWeekend(today)) {
      today.setDate(today.getDate() + 1);
    }
    return today;
  });

  // 모달 상태
  const [showNotice, setShowNotice] = useState(false);
  const [neverShowNoticeChecked, setNeverShowNoticeChecked] = useState(false);
  const [isAutoNotice, setIsAutoNotice] = useState(false);

  const [showPatchModal, setShowPatchModal] = useState(false);
  const [neverShowPatchChecked, setNeverShowPatchChecked] = useState(false);
  const [selectedPatchVersion, setSelectedPatchVersion] = useState(CURRENT_VERSION);
  const [isAutoPatch, setIsAutoPatch] = useState(false);

  const [pendingPatchShow, setPendingPatchShow] = useState(false);

  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [selectedDishAllergy, setSelectedDishAllergy] = useState(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isWebviewLoading, setIsWebviewLoading] = useState(false);

  const [webviewStep, setWebviewStep] = useState(() => {
    const isConfirmed = localStorage.getItem('ygm_comci_confirmed') === 'true';
    const savedTheme = localStorage.getItem('ygm_theme');
    const isDark = savedTheme 
      ? savedTheme === 'dark' 
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isConfirmed) return isDark ? 1 : 2;
    return 0;
  });

  const dateInputRef = useRef(null);
  const [meal, setMeal] = useState({ menuItems: [], calories: '', status: 'LOADING' });
  const [mealLoading, setMealLoading] = useState(true);

  // 평가 관련 상태
  const [ratings, setRatings] = useState({ "야르킁킁": 0, "야르": 0, "먹을만함": 0, "그저그런": 0, "맛없음": 0 });
  const [userVotedRating, setUserVotedRating] = useState(null);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

  const formattedDateStr = getFormattedDate(currentDate);
  const todayStr = getFormattedDate(new Date());
  const isToday = formattedDateStr === todayStr;

  const getDiffDaysFromToday = () => {
    const todayObj = new Date();
    const t1 = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate()).getTime();
    const t2 = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();
    return Math.floor((t1 - t2) / (1000 * 60 * 60 * 24));
  };

  const diffDays = getDiffDaysFromToday();
  const isWithin7Days = diffDays >= 0 && diffDays <= 7;

  const datePickerValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
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

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone || 
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkStandalone);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
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
    const hiddenNoticeId = localStorage.getItem('ygm_hide_notice_id');
    const hiddenPatchVersion = localStorage.getItem('ygm_hide_patch_version');

    const shouldShowNotice = hiddenNoticeId !== CURRENT_NOTICE_ID;
    const shouldShowPatch = hiddenPatchVersion !== CURRENT_VERSION;

    if (shouldShowNotice) {
      setIsAutoNotice(true);
      setShowNotice(true);
      if (shouldShowPatch) {
        setPendingPatchShow(true);
      }
    } else if (shouldShowPatch) {
      setIsAutoPatch(true);
      setSelectedPatchVersion(CURRENT_VERSION);
      setShowPatchModal(true);
    }
  }, []);

  useEffect(() => {
    if (webviewStep === 2) {
      setIsWebviewLoading(true);
      const timer = setTimeout(() => {
        setIsWebviewLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [webviewStep]);

  const loadRatings = useCallback(async () => {
    try {
      const savedVote = localStorage.getItem(`ygm_voted_${formattedDateStr}`);
      setUserVotedRating(savedVote);

      const res = await fetch(`/api/ratings?date=${formattedDateStr}`);
      if (res.ok) {
        const data = await res.json();
        setRatings(data);
      } else {
        setRatings({ "야르킁킁": 0, "야르": 0, "먹을만함": 0, "그저그런": 0, "맛없음": 0 });
      }
    } catch (err) {
      console.error('Failed to load ratings:', err);
      setRatings({ "야르킁킁": 0, "야르": 0, "먹을만함": 0, "그저그런": 0, "맛없음": 0 });
    }
  }, [formattedDateStr]);

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

      if (nextTheme && webviewStep === 2) {
        setWebviewStep(1);
      } else if (!nextTheme && webviewStep === 1) {
        setWebviewStep(2);
      }

      return nextTheme;
    });
  };

  const openNoticeModal = () => {
    setIsAutoNotice(false);
    const isNoticeHidden = localStorage.getItem('ygm_hide_notice_id') === CURRENT_NOTICE_ID;
    setNeverShowNoticeChecked(isNoticeHidden);
    setShowNotice(true);
    setIsMenuOpen(false);
  };

  const openPatchModal = () => {
    setIsAutoPatch(false);
    const isPatchHidden = localStorage.getItem('ygm_hide_patch_version') === CURRENT_VERSION;
    setNeverShowPatchChecked(isPatchHidden);
    setSelectedPatchVersion(CURRENT_VERSION);
    setShowPatchModal(true);
    setIsMenuOpen(false);
  };

  const handleCloseNotice = () => {
    if (isAutoNotice && neverShowNoticeChecked) {
      localStorage.setItem('ygm_hide_notice_id', CURRENT_NOTICE_ID);
    }
    setShowNotice(false);

    if (pendingPatchShow) {
      setTimeout(() => {
        setIsAutoPatch(true);
        setSelectedPatchVersion(CURRENT_VERSION);
        setShowPatchModal(true);
        setPendingPatchShow(false);
      }, 200);
    }
  };

  const handleClosePatch = () => {
    if (isAutoPatch && neverShowPatchChecked) {
      localStorage.setItem('ygm_hide_patch_version', CURRENT_VERSION);
    }
    setShowPatchModal(false);
  };

  const openDatePicker = () => {
    if (dateInputRef.current) {
      if ('showPicker' in dateInputRef.current) {
        try {
          dateInputRef.current.showPicker();
        } catch (e) {
          dateInputRef.current.focus();
        }
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    do {
      newDate.setDate(newDate.getDate() + days);
    } while (isHolidayOrWeekend(newDate));
    setCurrentDate(newDate);
  };

  const resetToToday = () => {
    const today = new Date();
    while (isHolidayOrWeekend(today)) {
      today.setDate(today.getDate() + 1);
    }
    setCurrentDate(today);
  };

  const handleDateSelect = (e) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    const selected = new Date(y, m - 1, d);
    while (isHolidayOrWeekend(selected)) {
      selected.setDate(selected.getDate() + 1);
    }
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
    loadMealData();
  }, [loadMealData]);

  const totalVotes = Object.values(ratings).reduce((acc, curr) => acc + curr, 0);

  return (
    <div className={`min-h-screen transition-colors duration-300 selection:bg-blue-500 selection:text-white relative ${
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
        body, * {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
        }
      `}</style>

      <AnimatePresence>
        {/* 📱 PWA 앱 설치 안내 모달 */}
        {showInstallGuide && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                    <Download className="w-5 h-5" />
                  </div>
                  <h2 className="font-bold text-base">📲 YGMhelper 홈화면 설치 개쌉이득 법</h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.15, rotate: 90 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setShowInstallGuide(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="space-y-4 text-sm font-medium leading-relaxed">
                <div className={`p-3.5 rounded-2xl border ${
                  isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className="font-bold text-blue-500 flex items-center gap-1.5 mb-1">
                    <Share className="w-4 h-4" /> 아이폰 (iOS Safari)
                  </p>
                  <p className="text-slate-600 dark:text-neutral-400">
                    사파리 하단 <strong>공유 아이콘(↑)</strong> 누르고 <strong>[홈 화면에 추가]</strong> 누르면 깔끔하게 완료!
                  </p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${
                  isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <p className="font-bold text-emerald-500 flex items-center gap-1.5 mb-1">
                    📱 안드로이드 (Chrome)
                  </p>
                  <p className="text-slate-600 dark:text-neutral-400">
                    우상단 <strong>메뉴(⋮)</strong> 클릭하고 <strong>[앱 설치]</strong> 누르면 끝!
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowInstallGuide(false)}
                  className="text-sm px-4 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-colors"
                >
                  오케이 렛츠고
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 📢 1. 공지사항 모달 */}
        {showNotice && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <h2 className="font-bold text-base sm:text-lg">📢 긴급 공지 폼 미쳤다</h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.15, rotate: 90 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={handleCloseNotice}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    NEW
                  </span>
                  <h3 className="font-extrabold text-sm sm:text-base">오늘의 급식 실시간 평가 런칭!</h3>
                </div>

                <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed font-medium ${
                  isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  오늘 급식 맛 어땠는지 야르킁킁부터 억까까지 스근하게 투표 가능합니다! 지금 바로 최애 투표 드루오세요🔥
                </div>
              </div>

              <div className={`flex items-center ${isAutoNotice ? 'justify-between' : 'justify-end'} pt-4 border-t border-slate-200 dark:border-neutral-800`}>
                {isAutoNotice && (
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer select-none text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={neverShowNoticeChecked}
                      onChange={(e) => setNeverShowNoticeChecked(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 cursor-pointer"
                    />
                    <span>다시 안 보기 (억까 방지)</span>
                  </label>
                )}

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCloseNotice}
                  className="text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-colors"
                >
                  알잘딱깔센 확인
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 📜 2. 패치노트 모달 */}
        {showPatchModal && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`w-full max-w-2xl max-h-[85vh] p-5 sm:p-6 rounded-3xl border shadow-2xl relative flex flex-col justify-between ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h2 className="font-bold text-base sm:text-lg">📜 패치노트 히스토리 (업데이트 모음집)</h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.15, rotate: 90 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={handleClosePatch}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 my-1 flex-1 min-h-0 overflow-hidden">
                <div className="w-full sm:w-44 flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-x-hidden sm:overflow-y-auto shrink-0 pb-2 sm:pb-0 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-neutral-800 pr-0 sm:pr-3 max-h-[52px] sm:max-h-full">
                  <div className="hidden sm:block my-1 text-[11px] font-bold text-slate-400 px-2 shrink-0">버전 히스토리</div>

                  {PATCH_HISTORY.map((patch) => (
                    <motion.button
                      key={patch.version}
                      whileHover={{ scale: 1.04, x: 2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedPatchVersion(patch.version)}
                      className={`h-9 min-h-[36px] max-h-[36px] px-3.5 rounded-xl font-bold text-xs sm:text-sm text-left flex items-center justify-between transition-colors shrink-0 whitespace-nowrap ${
                        selectedPatchVersion === patch.version
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                          : isDarkMode ? 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300' : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 opacity-70 shrink-0" />
                        <span>v{patch.version}</span>
                      </div>
                      {patch.version === CURRENT_VERSION && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-400 text-neutral-900 font-extrabold shrink-0 ml-1.5">최신</span>
                      )}
                    </motion.button>
                  ))}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pl-0 sm:pl-2 pt-1 sm:pt-0 pr-1">
                  {(() => {
                    const patch = PATCH_HISTORY.find((p) => p.version === selectedPatchVersion);
                    if (!patch) return null;

                    return (
                      <motion.div 
                        key={patch.version}
                        initial={{ opacity: 0, x: 10, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="space-y-3 pr-1"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-neutral-800 pb-2">
                          <h3 className="font-extrabold text-sm sm:text-base text-blue-600 dark:text-blue-400">
                            {patch.title}
                          </h3>
                          <span className="text-xs text-slate-400 font-semibold shrink-0">{patch.date}</span>
                        </div>

                        <div className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-medium ${
                          isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <p className="font-bold text-xs text-slate-400 mb-2">🔥 변경사항 한눈에 보기</p>
                          <ul className="list-disc list-inside space-y-1.5 pl-1">
                            {patch.changes.map((change, idx) => (
                              <li key={idx} className="leading-relaxed">{change}</li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>
              </div>

              <div className={`flex items-center ${isAutoPatch ? 'justify-between' : 'justify-end'} pt-3 border-t border-slate-200 dark:border-neutral-800 shrink-0 mt-2`}>
                {isAutoPatch && (
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer select-none text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={neverShowPatchChecked}
                      onChange={(e) => setNeverShowPatchChecked(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 cursor-pointer"
                    />
                    <span>이 버전 끄기</span>
                  </label>
                )}

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClosePatch}
                  className="text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-colors"
                >
                  닫기
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 🔍 개별 알러지 모달 */}
        {selectedDishAllergy && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base sm:text-lg">{selectedDishAllergy.dishName}</h2>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">알러지 유발 체크 리스트</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.15, rotate: 90 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setSelectedDishAllergy(null)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="space-y-2 py-2 max-h-[320px] overflow-y-auto">
                {selectedDishAllergy.allergyStr
                  .split('.')
                  .filter(Boolean)
                  .map((numStr, idx) => {
                    const cleanNum = numStr.trim();
                    const allergyName = ALLERGY_MAP[cleanNum] || `알러지 ${cleanNum}`;
                    return (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: "spring", stiffness: 450, damping: 22, delay: idx * 0.02 }}
                        className={`p-3 rounded-2xl border font-bold text-sm flex items-center gap-3 ${
                          isDarkMode ? 'bg-neutral-950 border-neutral-800 text-amber-400' : 'bg-amber-50/80 border-amber-200 text-amber-900'
                        }`}
                      >
                        <span className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center text-xs font-black text-amber-600 shrink-0">
                          {cleanNum}
                        </span>
                        <span>{allergyName}</span>
                      </motion.div>
                    );
                  })}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDishAllergy(null)}
                  className="text-sm px-4 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-colors"
                >
                  확인 완
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 🧬 전체 알러지 정보 모달 */}
        {showAllergyModal && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                    <Info className="w-5 h-5" />
                  </div>
                  <h2 className="font-bold text-base">전체 알러지 성분 총정리</h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.15, rotate: 90 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setShowAllergyModal(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-semibold py-2 max-h-[320px] overflow-y-auto">
                {ALLERGY_LIST.map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20, delay: idx * 0.01 }}
                    className={`p-2.5 rounded-xl border ${
                      isDarkMode ? 'bg-neutral-950/80 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    {item}
                  </motion.div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAllergyModal(false)}
                  className="text-sm px-4 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-colors"
                >
                  확인 완
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 상단 네비게이션 헤더 */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md ${
        isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            className="flex items-center gap-2.5"
          >
            <motion.div 
              whileHover={{ rotate: [0, -10, 10, -5, 0], scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 cursor-pointer"
            >
              <GraduationCap className="w-5.5 h-5.5" />
            </motion.div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className={`font-bold text-lg tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  YGMhelper
                </h1>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                  isDarkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  YGM
                </span>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center gap-2">
            {!isStandalone && (
              <motion.button
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleInstallClick}
                className="p-2.5 rounded-xl border flex items-center justify-center bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all"
                title="앱으로 설치하기"
              >
                <Download className="w-4.5 h-4.5" />
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.08, rotate: 15 }}
              whileTap={{ scale: 0.92 }}
              onClick={toggleDarkMode}
              className={`p-2.5 rounded-xl border transition-all ${
                isDarkMode 
                  ? 'bg-neutral-800 border-neutral-700 text-amber-400 hover:bg-neutral-700' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
              }`}
              title="테마 전환"
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </motion.button>

            <div className="relative" ref={menuRef}>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={`p-2.5 rounded-xl border flex items-center gap-1 transition-all ${
                  isDarkMode 
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700' 
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
                }`}
                title="메뉴 열기"
              >
                <ChevronDown className={`w-4.5 h-4.5 transition-transform duration-300 ${isMenuOpen ? 'rotate-180 text-blue-500' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                    className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-2xl p-1.5 z-50 ${
                      isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-200' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <motion.button
                      whileHover={{ scale: 1.03, x: 2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={openNoticeModal}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors ${
                        isDarkMode ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Megaphone className="w-4 h-4 text-blue-500" />
                      <span>공지사항</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.03, x: 2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={openPatchModal}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors ${
                        isDarkMode ? 'hover:bg-neutral-800 text-purple-400' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-purple-500" />
                      <span>패치노트</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 영역 */}
      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className={`relative flex md:hidden p-1.5 mb-4 rounded-2xl border ${
          isDarkMode 
            ? 'bg-neutral-900 border-neutral-800' 
            : 'bg-slate-200/80 border-slate-300/60'
        }`}>
          {/* motion/react layout animation */}
          <motion.div 
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] rounded-xl shadow-md ${
              activeTab === 'meal' ? 'left-1.5' : 'left-[calc(50%+0.1875rem)]'
            } ${
              isDarkMode ? 'bg-neutral-800' : 'bg-white'
            }`}
          />

          <button
            onClick={() => setActiveTab('meal')}
            className={`relative z-10 flex-1 py-3 font-extrabold text-base flex items-center justify-center gap-2 transition-colors duration-200 ${
              activeTab === 'meal'
                ? isDarkMode ? 'text-white' : 'text-slate-900'
                : isDarkMode ? 'text-neutral-400' : 'text-slate-600'
            }`}
          >
            <Utensils className="w-5 h-5 text-orange-500" />
            <span>급식표</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`relative z-10 flex-1 py-3 font-extrabold text-base flex items-center justify-center gap-2 transition-colors duration-200 ${
              activeTab === 'schedule'
                ? isDarkMode ? 'text-white' : 'text-slate-900'
                : isDarkMode ? 'text-neutral-400' : 'text-slate-600'
            }`}
          >
            <BookOpen className="w-5 h-5 text-blue-500" />
            <span>실시간 시간표</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          
          {/* 🍽️ 급식표 Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className={`p-5 sm:p-6 rounded-3xl border flex flex-col justify-between ${
              activeTab === 'meal' ? 'block' : 'hidden md:block'
            } ${
              isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div>
              <div className={`flex items-center justify-between pb-3.5 border-b mb-4 ${
                isDarkMode ? 'border-neutral-800' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <motion.div 
                    whileHover={{ scale: 1.12, rotate: 8 }}
                    className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600"
                  >
                    <Utensils className="w-5.5 h-5.5" />
                  </motion.div>
                  <div>
                    <h2 className={`font-bold text-base sm:text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      오늘의 급식 라인업
                    </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>YGM 맛도리 식단표</p>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-2xl border mb-3 flex items-center justify-between gap-2 ${
                isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openDatePicker}
                  className="flex items-center gap-2 cursor-pointer select-none flex-wrap"
                >
                  <CalendarIcon className="w-5 h-5 shrink-0 text-blue-500" />
                  <span className={`text-sm sm:text-base font-bold tracking-tight ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {currentDate.getFullYear()}.{currentDate.getMonth() + 1}.{currentDate.getDate()}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold ${
                    isDarkMode ? 'bg-neutral-800 text-blue-400' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()]}
                  </span>

                  <input
                    ref={dateInputRef}
                    type="date"
                    value={datePickerValue}
                    onChange={handleDateSelect}
                    className="sr-only"
                  />
                </motion.div>

                <div className="flex items-center gap-1.5">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={resetToToday}
                    className={`text-xs sm:text-sm px-3 py-2 rounded-xl font-bold border transition-colors ${
                      isDarkMode 
                        ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                        : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                    오늘
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.08, x: -2 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => changeDate(-1)}
                    className={`p-2 rounded-xl border transition-colors ${
                      isDarkMode 
                        ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                        : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                    }`}
                    title="이전 평일"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.08, x: 2 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => changeDate(1)}
                    className={`p-2 rounded-xl border transition-colors ${
                      isDarkMode 
                        ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                        : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                    }`}
                    title="다음 평일"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              {meal.calories && !mealLoading && (
                <div className="flex items-center justify-between px-1 mb-3">
                  <span className={`text-xs sm:text-sm font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                    총 칼로리 (벌크업 스펙)
                  </span>
                  <span className={`text-xs sm:text-sm px-3 py-1 rounded-full font-bold ${
                    isDarkMode ? 'bg-neutral-800 text-orange-400' : 'bg-orange-100 text-orange-800 border border-orange-200'
                  }`}>
                    {meal.calories}
                  </span>
                </div>
              )}

              {mealLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
                    <Sparkles className="w-4 h-4 text-orange-500 absolute animate-pulse" />
                  </div>
                  <span className="text-sm font-bold text-slate-600 dark:text-neutral-300">스근하게 급식 로딩 중...</span>
                </div>
              ) : meal.menuItems && meal.menuItems.length > 0 ? (
                <motion.div 
                  variants={listContainerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                >
                  {meal.menuItems.map((dish, idx) => {
                    const category = getDishCategory(dish.name);
                    const badgeClass = getCategoryBadgeStyle(category, isDarkMode);

                    return (
                      <motion.div
                        key={idx}
                        variants={listItemVariants}
                        whileHover={{ scale: 1.02, x: 3, transition: { type: "spring", stiffness: 400 } }}
                        className={`px-4 py-3.5 sm:py-4 rounded-2xl border flex items-center justify-between gap-3 shadow-sm transition-colors ${
                          isDarkMode 
                            ? 'bg-neutral-950/80 border-neutral-800/80 hover:border-neutral-700' 
                            : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                          <span className={`font-extrabold text-base sm:text-lg leading-snug ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {dish.name}
                          </span>
                          <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-lg border self-start sm:self-auto ${badgeClass}`}>
                            {category}
                          </span>
                        </div>

                        {dish.allergy && (
                          <motion.button
                            whileHover={{ scale: 1.08, y: -1 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => setSelectedDishAllergy({ dishName: dish.name, allergyStr: dish.allergy })}
                            className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border shrink-0 transition-all ${
                              isDarkMode 
                                ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-amber-500/50 hover:text-amber-400' 
                                : 'bg-white border-slate-200 text-slate-500 hover:border-amber-500/50 hover:text-amber-700 shadow-sm'
                            }`}
                            title="터치하여 알러지 성분 확인"
                          >
                            알러지 {dish.allergy}
                          </motion.button>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <div className={`p-10 rounded-2xl text-center text-sm font-semibold ${
                  isDarkMode ? 'bg-neutral-950/60 text-neutral-400' : 'bg-slate-50 text-slate-500'
                }`}>
                  급식 정보가 없습니다. (오늘 휴교이거나 NEIS 점검 중!)
                </div>
              )}

              {/* 🗳️ 급식 평가 섹션 */}
              {isWithin7Days && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 20, delay: 0.08 }}
                  className={`mt-5 p-3.5 sm:p-4 rounded-2xl border ${
                    isDarkMode ? 'bg-neutral-950/90 border-neutral-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                      <span>🍱 실시간 급식 평가 폼 미쳤다</span>
                      {totalVotes > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold">
                          {totalVotes}명 참전
                        </span>
                      )}
                    </span>
                    {!isToday ? (
                      <span className="text-[11px] text-amber-500 font-bold">오늘 급식만 참여 가능</span>
                    ) : userVotedRating ? (
                      <span className="text-xs text-emerald-500 font-bold">✓ 투표 완료</span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                    {RATING_OPTIONS.map((opt) => {
                      const IconComponent = opt.icon;
                      const count = ratings[opt.label] || 0;
                      const isSelected = userVotedRating === opt.label;
                      const isDisabled = !isToday || Boolean(userVotedRating) || isRatingSubmitting;

                      return (
                        <motion.button
                          key={opt.label}
                          whileHover={!isDisabled ? { scale: 1.1, y: -3 } : {}}
                          whileTap={!isDisabled ? { scale: 0.88 } : {}}
                          onClick={() => handleVoteRating(opt.label)}
                          disabled={isDisabled}
                          className={`px-1 py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors min-w-0 shadow-sm ${
                            isSelected 
                              ? 'ring-2 ring-blue-500 border-blue-500 font-black shadow-blue-500/20' 
                              : opt.color
                          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <IconComponent className="w-4 h-4 shrink-0" />
                          <span className="text-[10px] sm:text-[11px] font-bold leading-none whitespace-nowrap tracking-tighter">
                            {opt.label}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-extrabold opacity-75">{count}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2">
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAllergyModal(true)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm border transition-colors ${
                  isDarkMode 
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Info className="w-4 h-4 text-orange-500 shrink-0" />
                <span>알러지 성분 총정리</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={loadMealData}
                disabled={mealLoading}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm border transition-colors ${
                  isDarkMode 
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <RotateCcw className={`w-4 h-4 text-blue-500 shrink-0 ${mealLoading ? 'animate-spin' : ''}`} />
                <span>다시 당겨오기</span>
              </motion.button>
            </div>
          </motion.div>

          {/* 📚 시간표 Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.05 }}
            className={`p-5 sm:p-6 rounded-3xl border flex flex-col justify-between ${
              activeTab === 'schedule' ? 'block' : 'hidden md:block'
            } ${
              isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div>
              <div className={`flex items-center justify-between pb-3.5 border-b mb-4 ${
                isDarkMode ? 'border-neutral-800' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <motion.div 
                    whileHover={{ scale: 1.12, rotate: -8 }}
                    className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600"
                  >
                    <BookOpen className="w-5.5 h-5.5" />
                  </motion.div>
                  <div>
                    <h2 className={`font-bold text-base sm:text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      실시간 시간표
                    </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                      컴시간알리미 실시간 동기화
                    </p>
                  </div>
                </div>

                <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-blue-600 text-white shadow-sm flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5" /> LIVE
                </span>
              </div>

              {webviewStep === 0 && (
                <div className={`rounded-2xl border p-6 h-[420px] sm:h-[450px] flex flex-col items-center justify-center text-center gap-4 ${
                  isDarkMode ? 'bg-neutral-950/90 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-base ${isDarkMode ? 'text-neutral-200' : 'text-slate-900'}`}>
                      학교 & 학년/반 1회 설정
                    </h3>
                    <p className={`text-xs sm:text-sm mt-1.5 max-w-[260px] leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                      컴시간 첫 접속 시 <span className="font-bold text-blue-500">딱 1회만</span> 본인 반 설정해주면 세팅 끝!
                    </p>
                  </div>

                  <div className="flex items-center justify-center mt-3">
                    {isDarkMode ? (
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => confirmComciStep(1)}
                        className="text-sm px-5 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-md shadow-blue-500/25 transition-colors"
                      >
                        스근하게 다음 <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => confirmComciStep(2)}
                        className="text-sm px-5 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-md shadow-blue-500/25 transition-colors"
                      >
                        <Eye className="w-4 h-4" /> 화면 띄우기
                      </motion.button>
                    )}
                  </div>
                </div>
              )}

              {webviewStep === 1 && (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 h-[420px] sm:h-[450px] p-6 flex flex-col items-center justify-center text-center gap-4">
                  <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-200">컴시간 다크모드 안 됨주의</h3>
                    <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 max-w-[260px] leading-relaxed">
                      컴시간 라이브러리가 화이트 화면이라 눈뽕 살짝 올 수 있음!
                    </p>
                  </div>

                  <div className="flex items-center justify-center mt-3">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setWebviewStep(2)}
                      className="text-sm px-5 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-md shadow-blue-500/25 transition-colors"
                    >
                      <Eye className="w-4 h-4" /> 괜찮으니 띄우기
                    </motion.button>
                  </div>
                </div>
              )}

              {webviewStep === 2 && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-white h-[420px] sm:h-[450px] relative w-full">
                  <AnimatePresence>
                    {isWebviewLoading && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-20 backdrop-blur-lg bg-white/50 dark:bg-neutral-900/50 flex flex-col items-center justify-center gap-3"
                      >
                        <div className="relative flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
                          <Sparkles className="w-5 h-5 text-blue-600 absolute animate-pulse" />
                        </div>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-neutral-100 drop-shadow-sm tracking-tight">
                          시간표 로딩 폼 미쳤다... 잠시만요!
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <iframe
                    src={comciStudentUrl}
                    title="컴시간알리미 실시간 시간표 웹뷰"
                    className="w-full h-full border-0"
                    style={{
                      zoom: '0.78',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale'
                    }}
                  />
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold text-xs">출처: 컴시간알리미</span>
            </div>
          </motion.div>

        </div>

        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1 font-medium">
          <Info className="w-3.5 h-3.5" />
          <span>Domain: ygmhelper.xyz | YGM 전용 알잘딱깔센 스쿨 도우미</span>
        </div>
      </main>
    </div>
  );
}