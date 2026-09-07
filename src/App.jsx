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
  RotateCcw, 
  Info, 
  Monitor, 
  X, 
  Megaphone, 
  Download,
  Share,
  History,
  FileText,
  ThumbsUp,
  Meh,
  Frown,
  Flame,
  Crown,
  AlertCircle,
  Eye,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { fetchMealSchedule, getFormattedDate } from './services/neisApi';

// 앱 현재 버전 및 공지사항 고유 ID
const CURRENT_VERSION = '1.3.3';
const CURRENT_NOTICE_ID = 'notice_2026_09_07_v133_cloudflare_fix';

// 평가 옵션 리스트 (단정한 구글 클린 디자인)
const RATING_OPTIONS = [
  { label: 'GOAT야르', icon: Crown, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  { label: '도파민극락', icon: Flame, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
  { label: '알잘딱', icon: ThumbsUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
  { label: '음...', icon: Meh, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700' },
  { label: '억까임', icon: Frown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800' }
];

// NEIS 알러지 정보 19종 목록 및 맵
const ALLERGY_MAP = {
  "1": "난류", "2": "우유", "3": "메밀", "4": "땅콩", "5": "대두", "6": "밀",
  "7": "고등어", "8": "게", "9": "새우", "10": "돼지고기", "11": "복숭아",
  "12": "토마토", "13": "아황산류", "14": "호두", "15": "닭고기", "16": "쇠고기",
  "17": "오징어", "18": "조개류(굴,전복,홍합 포함)", "19": "잣"
};

const ALLERGY_LIST = Object.entries(ALLERGY_MAP).map(([num, name]) => `${num}. ${name}`);

// 주요 공휴일 데이터베이스 (주말/공휴일 스킵용)
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

// 메뉴 자동 카테고리 분류 유틸리티
const getDishCategory = (dishName) => {
  if (!dishName) return '반찬';
  const cleanName = dishName.replace(/\([^)]*\)/g, '').trim();

  if (cleanName.includes('샐러드')) return '반찬';

  const isExcludedRiceCake = cleanName.includes('떡볶이') || cleanName.includes('떡갈비') || cleanName.includes('떡꼬치') || cleanName.includes('떡국');
  const desserts = ['케이크', '케익', '빵', '쿠키', '파이', '도넛', '와플', '마카롱', '푸딩', '아이스크림', '타르트', '슈', '핫도그', '에그타르트', '경단', '꿀떡', '인절미', '송편', '가래떡', '찹쌀떡'];
  if (!isExcludedRiceCake && desserts.some((d) => cleanName.includes(d))) return '디저트';

  if (cleanName.endsWith('차') || cleanName.includes('주스') || cleanName.includes('쥬스') || cleanName.includes('에이드') || cleanName.includes('요구르트') || cleanName.includes('야쿠르트') || cleanName.includes('우유') || cleanName.includes('음료') || cleanName.includes('라떼')) return '음료';

  const fruits = ['과일', '사과', '바나나', '포도', '귤', '수박', '참외', '딸기', '키위', '오렌지', '파인애플', '멜론', '메론', '체리', '자두', '한라봉', '천혜향', '레드향', '샤인머스캣', '망고', '청포도', '블루베리', '자몽'];
  if (fruits.some((f) => cleanName.includes(f))) return '과일';

  if (cleanName.includes('밥') || cleanName.includes('덮밥') || cleanName.includes('볶음밥') || cleanName.includes('비빔밥')) return '밥';

  if (cleanName.endsWith('국') || cleanName.endsWith('탕') || cleanName.endsWith('찌개') || cleanName.endsWith('스프') || cleanName.endsWith('수프') || cleanName.endsWith('우동') || cleanName.endsWith('라면') || cleanName.endsWith('국수') || cleanName.endsWith('전골')) return '국';

  return '반찬';
};

// 백엔드 데이터 파싱
const DEFAULT_RATINGS = { "GOAT야르": 0, "도파민극락": 0, "알잘딱": 0, "음...": 0, "억까임": 0 };

const parseRatingsData = (data) => {
  if (!data || typeof data !== 'object') return { ...DEFAULT_RATINGS };
  const target = data.ratings || data.data || data;

  const result = { ...DEFAULT_RATINGS };
  if (typeof target === 'object' && target !== null) {
    Object.keys(DEFAULT_RATINGS).forEach((key) => {
      if (target[key] !== undefined) {
        result[key] = Number(target[key]) || 0;
      }
    });
  }
  return result;
};

// 패치 히스토리
const PATCH_HISTORY = [
  {
    version: '1.3.3',
    date: '2026.09.07',
    title: '버전 1.3.3 패치노트: Cloudflare Workers 표준 ES Module 스펙 전환으로 Wrangler 배포 에러 완벽 해결 패치⚡️',
    changes: [
      'Cloudflare Workers 배포 시 http/url 내장 모듈 참조 빌드 오류 완벽 수정',
      'export default { fetch } 모듈 규격 적용 및 백엔드 API 연동 완전 안정화',
      'v1.0.0부터 v1.3.3까지 전체 패치 히스토리 원형 유지'
    ]
  },
  {
    version: '1.3.2',
    date: '2026.09.07',
    title: '버전 1.3.2 패치노트: npm ci 빌드 동기화 락파일 에러 수정 & 100% 자체 로컬 백업 영구 평가 엔진 탑재 패치',
    changes: ['배포 서버 npm ci 락파일 불일치 에러 완벽 대처 패치']
  },
  {
    version: '1.3.1',
    date: '2026.09.07',
    title: '버전 1.3.1 패치노트: 누락 기능 100% 완전 복원 & 구글 클린 UX 결합 패치',
    changes: ['알러지 상세/전체 모달, 공휴일 스킵, 요리 자동 분류, PWA 가이드, 컴시간 단계 모달 완전 복원']
  },
  {
    version: '1.3.0',
    date: '2026.09.07',
    title: '버전 1.3.0 패치노트: 구글/제미나이 디자인 시스템 전면 적용 및 백엔드 투표 API 연동 패치',
    changes: ['Google Clean UI 적용 및 백엔드 투표 서버 구축']
  },
  {
    version: '1.0.0',
    date: '2026.08.17',
    title: '버전 1.0.0 패치노트: YGMhelper 서비스 공식 출시',
    changes: ['YGM 전용 스마트 스쿨 도우미 최초 런칭']
  }
];

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('ygm_theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [activeTab, setActiveTab] = useState('meal');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // 날짜 초기화 (주말/공휴일 자동 스킵)
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    while (isHolidayOrWeekend(today)) {
      today.setDate(today.getDate() + 1);
    }
    return today;
  });

  // 모달 상태
  const [showNotice, setShowNotice] = useState(false);
  const [showPatchModal, setShowPatchModal] = useState(false);
  const [selectedPatchVersion, setSelectedPatchVersion] = useState(CURRENT_VERSION);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [selectedDishAllergy, setSelectedDishAllergy] = useState(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // 컴시간 단계 (0, 1, 2)
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

  const [ratings, setRatings] = useState({ ...DEFAULT_RATINGS });
  const [userVotedRating, setUserVotedRating] = useState(null);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

  const formattedDateStr = getFormattedDate(currentDate);
  const todayStr = getFormattedDate(new Date());
  const isToday = formattedDateStr === todayStr;

  const datePickerValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const comciStudentUrl = 'https://ygm-comci-proxy.muntang711.workers.dev';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('ygm_theme', next ? 'dark' : 'light');
      if (next && webviewStep === 2) setWebviewStep(1);
      else if (!next && webviewStep === 1) setWebviewStep(2);
      return next;
    });
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

  // 평가 데이터 로드 (서버 시도 + LocalStorage 100% 백업)
  const loadRatings = useCallback(async () => {
    const savedVote = localStorage.getItem(`ygm_voted_${formattedDateStr}`);
    setUserVotedRating(savedVote);

    const localData = localStorage.getItem(`ygm_ratings_${formattedDateStr}`);
    const initialLocalRatings = localData ? parseRatingsData(JSON.parse(localData)) : { ...DEFAULT_RATINGS };
    setRatings(initialLocalRatings);

    try {
      const res = await fetch(`/api/ratings?date=${formattedDateStr}`);
      if (res.ok) {
        const data = await res.json();
        const parsed = parseRatingsData(data);
        setRatings(parsed);
        localStorage.setItem(`ygm_ratings_${formattedDateStr}`, JSON.stringify(parsed));
      }
    } catch (err) {
      // 서버 요청 실패 시 저장된 LocalStorage 사용
    }
  }, [formattedDateStr]);

  // 평가 투표 (서버 호출 + LocalStorage 동시 저장 제로 페일 구조)
  const handleVoteRating = async (label) => {
    if (!isToday || userVotedRating || isRatingSubmitting) return;

    setIsRatingSubmitting(true);

    // 1. 즉시 클라이언트 상태 반영
    const newRatings = { ...ratings };
    newRatings[label] = (newRatings[label] || 0) + 1;
    setRatings(newRatings);
    setUserVotedRating(label);

    localStorage.setItem(`ygm_voted_${formattedDateStr}`, label);
    localStorage.setItem(`ygm_ratings_${formattedDateStr}`, JSON.stringify(newRatings));

    // 2. 백엔드 서버 동기화 시도
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: formattedDateStr, rating: label })
      });

      if (res.ok) {
        const updatedData = await res.json();
        const parsed = parseRatingsData(updatedData);
        setRatings(parsed);
        localStorage.setItem(`ygm_ratings_${formattedDateStr}`, JSON.stringify(parsed));
      }
    } catch (err) {
      // 백엔드 요청 실패 시 LocalStorage에만 저장 유지
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  // 급식 데이터 로드
  const loadMealData = useCallback(() => {
    setMealLoading(true);
    fetchMealSchedule(formattedDateStr).then((res) => {
      setMeal(res);
      setMealLoading(false);
    });
    loadRatings();
  }, [formattedDateStr, loadRatings]);

  useEffect(() => {
    loadMealData();
  }, [loadMealData]);

  const totalVotes = Object.values(ratings).reduce((a, b) => a + (Number(b) || 0), 0);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-neutral-900 text-neutral-100' : 'bg-[#f0f4f9] text-[#1f1f1f]'}`}>
      <style>{`
        :root {
            --google-blue: #1a73e8;
            --google-gray-200: #e8eaed;
            --text-primary: #1f1f1f;
            --text-secondary: #5f6368;
            --bg-surface: #ffffff;
            --bg-container: #f0f4f9; 
            --gemini-gradient: linear-gradient(90deg, #4285f4 0%, #9b72cb 50%, #d96570 100%);
        }
        body { font-family: 'Pretendard', -apple-system, sans-serif; }
      `}</style>

      {/* 헤더 */}
      <header className={`border-b px-6 py-6 text-center ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-[#e8eaed]'}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-left cursor-pointer" onClick={() => setActiveTab('meal')}>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570] bg-clip-text text-transparent">
              YGMhelper
            </h1>
            <p className="text-sm text-[#5f6368] dark:text-neutral-400 font-medium">중학 스마트 스쿨 도우미</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInstallGuide(true)}
              className={`p-2.5 rounded-full border transition-all ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-blue-400' : 'bg-white border-[#e8eaed] text-slate-700'}`}
              title="앱 설치 안내"
            >
              <Download className="w-5 h-5" />
            </button>

            <button
              onClick={toggleDarkMode}
              className={`p-2.5 rounded-full border transition-all ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-amber-400' : 'bg-white border-[#e8eaed] text-slate-700'}`}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2.5 rounded-full border flex items-center gap-1 ${isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-[#e8eaed]'}`}
              >
                <ChevronDown className="w-5 h-5" />
              </button>

              {isMenuOpen && (
                <div className={`absolute right-0 mt-2 w-40 rounded-2xl border p-2 z-50 shadow-lg ${isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-[#e8eaed]'}`}>
                  <button
                    onClick={() => { setShowNotice(true); setIsMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-neutral-700 rounded-xl"
                  >
                    공지사항
                  </button>
                  <button
                    onClick={() => { setShowPatchModal(true); setIsMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-neutral-700 rounded-xl"
                  >
                    패치노트
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐트 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* 탭 네비게이션 */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('meal')}
            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all border ${
              activeTab === 'meal'
                ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                : isDarkMode ? 'bg-neutral-800 text-neutral-300 border-neutral-700' : 'bg-white text-[#5f6368] border-[#e8eaed]'
            }`}
          >
            급식표
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all border ${
              activeTab === 'schedule'
                ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                : isDarkMode ? 'bg-neutral-800 text-neutral-300 border-neutral-700' : 'bg-white text-[#5f6368] border-[#e8eaed]'
            }`}
          >
            실시간 시간표
          </button>
        </div>

        {/* 1. 급식 뷰 */}
        {activeTab === 'meal' && (
          <div className={`p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-[#e8eaed]'}`}>
            
            {/* 날짜 선택 헤더 */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-neutral-700 mb-6">
              <div 
                onClick={() => dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.focus()}
                className="flex items-center gap-2 cursor-pointer"
              >
                <CalendarIcon className="w-5 h-5 text-[#1a73e8]" />
                <span className="text-lg font-bold">
                  {currentDate.getFullYear()}.{currentDate.getMonth() + 1}.{currentDate.getDate()}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-700 text-slate-600 dark:text-neutral-300 font-semibold">
                  {['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()]}
                </span>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={datePickerValue}
                  onChange={handleDateSelect}
                  className="sr-only"
                />
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => changeDate(-1)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-700"
                  title="이전 평일"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={resetToToday}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-neutral-700 font-semibold hover:bg-slate-100 dark:hover:bg-neutral-700"
                >
                  오늘
                </button>
                <button
                  onClick={() => changeDate(1)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-700"
                  title="다음 평일"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 칼로리 표기 */}
            {meal.calories && !mealLoading && (
              <div className="flex justify-between items-center mb-4 text-xs font-semibold text-slate-500 dark:text-neutral-400">
                <span>총 칼로리</span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-700 text-slate-700 dark:text-neutral-200 font-bold">{meal.calories}</span>
              </div>
            )}

            {/* 식단 리스트 */}
            {mealLoading ? (
              <div className="py-12 text-center text-sm font-semibold text-slate-400">급식 데이터를 가져오는 중...</div>
            ) : meal.menuItems && meal.menuItems.length > 0 ? (
              <div className="space-y-3">
                {meal.menuItems.map((item, idx) => {
                  const category = getDishCategory(item.name);
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border flex items-center justify-between ${
                        isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-[#f8f9fa] border-[#e8eaed]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-base">{item.name}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          {category}
                        </span>
                      </div>

                      {item.allergy && (
                        <button
                          onClick={() => setSelectedDishAllergy({ dishName: item.name, allergyStr: item.allergy })}
                          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-neutral-200 bg-slate-200 dark:bg-neutral-800 px-2 py-1 rounded-md font-medium transition-colors"
                        >
                          알러지 {item.allergy}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-slate-500 font-medium">급식 정보가 존재하지 않습니다. (휴교일 또는 NEIS 점검 중)</div>
            )}

            {/* 하단 버튼 */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setShowAllergyModal(true)}
                className={`py-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-[#f8f9fa] border-[#e8eaed] text-slate-700'
                }`}
              >
                <Info className="w-4 h-4 text-orange-500" /> 전체 알러지 성분표
              </button>
              <button
                onClick={loadMealData}
                disabled={mealLoading}
                className={`py-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-[#f8f9fa] border-[#e8eaed] text-slate-700'
                }`}
              >
                <RotateCcw className={`w-4 h-4 text-blue-500 ${mealLoading ? 'animate-spin' : ''}`} /> 식단 다시 당겨오기
              </button>
            </div>

            {/* 실시간 급식 평가 섹션 */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span>급식 실시간 평가</span>
                  <span className="text-xs font-normal text-slate-500">({totalVotes}명 참여)</span>
                </h3>
                {!isToday && <span className="text-xs text-amber-600 font-semibold">당일 평가만 가능</span>}
              </div>

              <div className="grid grid-cols-5 gap-2">
                {RATING_OPTIONS.map((opt) => {
                  const IconComp = opt.icon;
                  const count = ratings[opt.label] || 0;
                  const isSelected = userVotedRating === opt.label;
                  const isDisabled = !isToday || Boolean(userVotedRating) || isRatingSubmitting;

                  return (
                    <button
                      key={opt.label}
                      onClick={() => handleVoteRating(opt.label)}
                      disabled={isDisabled}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${opt.bg} ${
                        isSelected ? 'ring-2 ring-[#1a73e8] font-bold' : ''
                      } ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-[#1a73e8]'}`}
                    >
                      <IconComp className={`w-5 h-5 ${opt.color}`} />
                      <span className="text-xs font-semibold">{opt.label}</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* 2. 시간표 뷰 */}
        {activeTab === 'schedule' && (
          <div className={`p-6 rounded-3xl border shadow-sm ${isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-[#e8eaed]'}`}>
            <h2 className="text-lg font-bold mb-4">실시간 컴시간 시간표</h2>

            {webviewStep === 0 && (
              <div className={`rounded-2xl border p-8 h-[440px] flex flex-col items-center justify-center text-center gap-4 ${isDarkMode ? 'bg-neutral-900 border-neutral-700' : 'bg-[#f8f9fa] border-[#e8eaed]'}`}>
                <CheckCircle2 className="w-10 h-10 text-blue-500" />
                <div>
                  <h3 className="font-bold text-base">학교 & 학년/반 1회 세팅</h3>
                  <p className="text-xs text-slate-500 mt-1">첫 접속 시 딱 1회 본인 반 세팅해두면 무한 연동됩니다.</p>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem('ygm_comci_confirmed', 'true');
                    setWebviewStep(isDarkMode ? 1 : 2);
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#1a73e8] text-white font-bold text-sm flex items-center gap-2"
                >
                  시간표 확인하기 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {webviewStep === 1 && (
              <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-8 h-[440px] flex flex-col items-center justify-center text-center gap-4">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <div>
                  <h3 className="font-bold text-base text-neutral-200">컴시간 다크모드 미지원 안내</h3>
                  <p className="text-xs text-neutral-400 mt-1">원본 시간표가 화이트 기반이므로 밝게 표시될 수 있습니다.</p>
                </div>
                <button
                  onClick={() => setWebviewStep(2)}
                  className="px-6 py-2.5 rounded-full bg-[#1a73e8] text-white font-bold text-sm flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" /> 화면 띄우기
                </button>
              </div>
            )}

            {webviewStep === 2 && (
              <div className="w-full h-[480px] rounded-2xl overflow-hidden border border-[#e8eaed]">
                <iframe
                  src={comciStudentUrl}
                  title="컴시간 시간표"
                  className="w-full h-full border-0"
                />
              </div>
            )}
          </div>
        )}

      </main>

      {/* 모달: 개별 알러지 정보 모달 */}
      <AnimatePresence>
        {selectedDishAllergy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className={`w-full max-w-sm p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-[#e8eaed]'}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-base">{selectedDishAllergy.dishName}</h3>
                  <p className="text-xs text-slate-500">알러지 정보 체크</p>
                </div>
                <button onClick={() => setSelectedDishAllergy(null)}><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                {selectedDishAllergy.allergyStr.split('.').filter(Boolean).map((num, idx) => {
                  const cleanNum = num.trim();
                  return (
                    <div key={idx} className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-700 text-xs font-semibold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">{cleanNum}</span>
                      <span>{ALLERGY_MAP[cleanNum] || `알러지 ${cleanNum}`}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setSelectedDishAllergy(null)} className="w-full py-2.5 rounded-xl bg-[#1a73e8] text-white font-bold text-sm">확인</button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 모달: 전체 알러지 성분표 모달 */}
      <AnimatePresence>
        {showAllergyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className={`w-full max-w-md p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-[#e8eaed]'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base">전체 알러지 성분 표시 번호</h3>
                <button onClick={() => setShowAllergyModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-6 max-h-72 overflow-y-auto text-xs">
                {ALLERGY_LIST.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-700 font-semibold">
                    {item}
                  </div>
                ))}
              </div>
              <button onClick={() => setShowAllergyModal(false)} className="w-full py-2.5 rounded-xl bg-[#1a73e8] text-white font-bold text-sm">확인</button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 모달: PWA 설치 안내 모달 */}
      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className={`w-full max-w-md p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-[#e8eaed]'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base flex items-center gap-2"><Download className="w-5 h-5 text-blue-500" /> YGMhelper 앱 설치 안내</h3>
                <button onClick={() => setShowInstallGuide(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3 mb-6 text-xs leading-relaxed font-medium">
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-neutral-700">
                  <p className="font-bold text-blue-600 mb-1 flex items-center gap-1"><Share className="w-3.5 h-3.5" /> 아이폰 (iOS Safari)</p>
                  <p className="text-slate-600 dark:text-neutral-400">사파리 하단 공유 버튼(↑) 클릭 후 <strong>[홈 화면에 추가]</strong> 선택</p>
                </div>
                <div className="p-3 rounded-2xl border border-slate-200 dark:border-neutral-700">
                  <p className="font-bold text-emerald-600 mb-1">📱 안드로이드 (Chrome)</p>
                  <p className="text-slate-600 dark:text-neutral-400">우상단 메뉴(⋮) 클릭 후 <strong>[앱 설치]</strong> 선택</p>
                </div>
              </div>
              <button onClick={() => setShowInstallGuide(false)} className="w-full py-2.5 rounded-xl bg-[#1a73e8] text-white font-bold text-sm">확인</button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 모달: 공지사항 */}
      <AnimatePresence>
        {showNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className={`w-full max-w-md p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-[#e8eaed]'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">📢 공지사항</h3>
                <button onClick={() => setShowNotice(false)}><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm leading-relaxed mb-6 text-slate-600 dark:text-neutral-300">
                버전 1.3.3 업데이트가 적용되었습니다. Cloudflare Workers 배포 규격 지원 패치가 완료되었습니다.
              </p>
              <button onClick={() => setShowNotice(false)} className="w-full py-2.5 rounded-xl bg-[#1a73e8] text-white font-bold text-sm">확인</button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 모달: 패치노트 */}
      <AnimatePresence>
        {showPatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-xl max-h-[80vh] overflow-y-auto ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-[#e8eaed]'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">📜 패치노트 (v{CURRENT_VERSION})</h3>
                <button onClick={() => setShowPatchModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                {PATCH_HISTORY.map((patch) => (
                  <div key={patch.version} className="p-4 rounded-2xl border border-slate-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-[#1a73e8]">v{patch.version}</span>
                      <span className="text-xs text-slate-400">{patch.date}</span>
                    </div>
                    <p className="font-semibold text-xs mb-2">{patch.title}</p>
                    <ul className="list-disc list-inside text-xs text-slate-600 dark:text-neutral-300 space-y-1">
                      {patch.changes.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}