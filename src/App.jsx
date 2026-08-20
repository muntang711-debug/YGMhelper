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
  History
} from 'lucide-react';
import { fetchMealSchedule, getFormattedDate } from './services/neisApi';

// 앱 현재 버전
const CURRENT_VERSION = '1.0.15';

// 패치노트 히스토리 데이터베이스 (누적 기록)
const PATCH_HISTORY = [
  {
    version: '1.0.15',
    date: '2026.08.20',
    title: '버전 1.0.15 업데이트: 식단 카테고리 오분류 수정, 패치노트 시스템 및 모달 애니메이션 강화',
    changes: [
      '식단 카테고리 오분류 수정 (떡볶이→디저트, 차돌박이→음료, (국제)→국 오인식 완벽 방지)',
      '공지사항 및 누적 패치노트 좌/우 분리 탭 모달 시스템 구현',
      '다크모드 토글 버튼 상단 헤더 독립 재배치',
      '모달 팝업 바운스/스케일 효과 및 로딩 오버레이 펄스/글로우 애니메이션 강화'
    ]
  },
  {
    version: '1.0.14',
    date: '2026.08.19',
    title: '버전 1.0.14 업데이트: 헤더 드롭다운 메뉴, PWA 감지, 시간표 블러 로딩 및 식단 카테고리 컬러링',
    changes: [
      '우측 상단 메뉴 드롭다운 통합',
      'PWA 독립실행 모드 접속 시 [앱 설치] 버튼 자동 숨김',
      '시간표 로딩 시 투명 블러(Blur) 오버레이 적용',
      '식단 카테고리별 컬러풀 배지 적용'
    ]
  },
  {
    version: '1.0.13',
    date: '2026.08.18',
    title: '버전 1.0.13 업데이트: 급식표 UI 확대, 알러지 상세 팝업 및 컴시간 로딩 효과 추가',
    changes: [
      '급식표 텍스트 크기 확대 및 모바일 터치 편의성 강화',
      '메뉴별 알러지 번호 클릭 시 개별 알러지 상세 팝업 추가',
      '시간표 로딩 안내 레이어 추가'
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

// 주요 공휴일 및 대체공휴일 데이터베이스
const HOLIDAYS = {
  // 2025년
  "2025-01-01": "신정",
  "2025-01-28": "설날 연휴",
  "2025-01-29": "설날",
  "2025-01-30": "설날 연휴",
  "2025-03-01": "삼일절",
  "2025-03-03": "대체공휴일",
  "2025-05-05": "어린이날",
  "2025-05-06": "부처님오신날",
  "2025-06-06": "현충일",
  "2025-08-15": "광복절",
  "2025-10-03": "개천절",
  "2025-10-05": "추석 연휴",
  "2025-10-06": "추석",
  "2025-10-07": "추석 연휴",
  "2025-10-08": "대체공휴일",
  "2025-10-09": "한글날",
  "2025-12-25": "성탄절",

  // 2026년
  "2026-01-01": "신정",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-03-01": "삼일절",
  "2026-03-02": "대체공휴일",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일",
  "2026-06-06": "현충일",
  "2026-08-15": "광복절",
  "2026-08-17": "대체공휴일",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-10-03": "개천절",
  "2026-10-05": "대체공휴일",
  "2026-10-09": "한글날",
  "2026-12-25": "성탄절",

  // 2027년
  "2027-01-01": "신정",
  "2027-02-06": "설날 연휴",
  "2027-02-07": "설날",
  "2027-02-08": "설날 연휴",
  "2027-02-09": "대체공휴일",
  "2027-03-01": "삼일절",
  "2027-05-05": "어린이날",
  "2027-05-13": "부처님오신날",
  "2027-06-06": "현충일",
  "2027-06-07": "대체공휴일",
  "2027-08-15": "광복절",
  "2027-08-16": "대체공휴일",
  "2027-09-14": "추석 연휴",
  "2027-09-15": "추석",
  "2027-09-16": "추석 연휴",
  "2027-10-03": "개천절",
  "2027-10-04": "대체공휴일",
  "2027-10-09": "한글날",
  "2027-12-25": "성탄절"
};

// 공휴일 정보 조회 함수
const getHolidayInfo = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  if (HOLIDAYS[dateStr]) {
    return HOLIDAYS[dateStr];
  }

  const monthDay = `${m}-${d}`;
  const fixedHolidays = {
    "01-01": "신정",
    "03-01": "삼일절",
    "05-05": "어린이날",
    "06-06": "현충일",
    "08-15": "광복절",
    "10-03": "개천절",
    "10-09": "한글날",
    "12-25": "성탄절"
  };

  if (fixedHolidays[monthDay]) {
    return fixedHolidays[monthDay];
  }

  return null;
};

// 정밀 급식 메뉴 카테고리 구분 함수 (오분류 방지 정제 로직 포함)
const getDishCategory = (dishName) => {
  if (!dishName) return '반찬';
  
  // 1. 괄호 및 원산지/알러지 표시(예: (국제), (초))를 완벽 제거한 순수 음식명 추출
  const cleanName = dishName.replace(/\([^)]*\)/g, '').trim();

  // 2. 디저트 (떡볶이, 떡갈비, 떡꼬치, 떡국 등 식사류는 예외 처리)
  const isExcludedRiceCake = cleanName.includes('떡볶이') || cleanName.includes('떡갈비') || cleanName.includes('떡꼬치') || cleanName.includes('떡국');
  const desserts = [
    '케이크', '케익', '빵', '쿠키', '파이', '도넛', '와플', '마카롱', 
    '푸딩', '아이스크림', '타르트', '슈', '핫도그', '에그타르트',
    '경단', '꿀떡', '인절미', '송편', '가래떡', '찹쌀떡'
  ];
  if (!isExcludedRiceCake && desserts.some((d) => cleanName.includes(d))) {
    return '디저트';
  }

  // 3. 음료 ('차'로 끝나는 단어만 '차' 음료로 판단하여 '차돌박이' 오분류 완전 차단)
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

  // 4. 과일
  const fruits = [
    '과일', '사과', '바나나', '포도', '귤', '수박', '참외', '딸기', 
    '키위', '오렌지', '파인애플', '멜론', '메론', '체리', '자두', 
    '한라봉', '천혜향', '레드향', '샤인머스캣', '샤인머스켓', '망고', 
    '청포도', '블루베리', '자몽'
  ];
  if (fruits.some((f) => cleanName.includes(f))) {
    return '과일';
  }

  // 5. 밥
  if (cleanName.includes('밥') || cleanName.includes('덮밥') || cleanName.includes('볶음밥') || cleanName.includes('비빔밥')) {
    return '밥';
  }

  // 6. 국 (마지막 글자가 '국'이거나 탕, 찌개, 스프, 수프, 우동, 라면, 국수, 전골)
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

  // 7. 나머지는 반찬
  return '반찬';
};

// 카테고리별 테마 스타일 반환 함수
const getCategoryBadgeStyle = (category, isDark) => {
  switch (category) {
    case '디저트':
      return isDark 
        ? 'bg-pink-500/15 text-pink-300 border-pink-500/30' 
        : 'bg-pink-100 text-pink-700 border-pink-200';
    case '음료':
      return isDark 
        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' 
        : 'bg-cyan-100 text-cyan-700 border-cyan-200';
    case '과일':
      return isDark 
        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
        : 'bg-rose-100 text-rose-700 border-rose-200';
    case '밥':
      return isDark 
        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' 
        : 'bg-blue-100 text-blue-700 border-blue-200';
    case '국':
      return isDark 
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
        : 'bg-amber-100 text-amber-700 border-amber-200';
    default: // 반찬
      return isDark 
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
        : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
};

export default function App() {
  // 1. 다크모드 상태
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('ygm_theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // 모바일 전용 탭 선택 상태 ('meal': 급식표, 'schedule': 시간표)
  const [activeTab, setActiveTab] = useState('meal');

  // 상단 드롭다운 메뉴 상태
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // PWA (독립 실행 모드) 모드 감지 상태
  const [isStandalone, setIsStandalone] = useState(false);

  // 주말(토, 일) 제외 초기 날짜 설정
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    while (today.getDay() === 0 || today.getDay() === 6) {
      today.setDate(today.getDate() + 1);
    }
    return today;
  });

  // 공지사항 및 패치노트 모달 상태
  const [showNotice, setShowNotice] = useState(false);
  const [neverShowChecked, setNeverShowChecked] = useState(false);
  const [selectedNoticeTab, setSelectedNoticeTab] = useState('notice'); // 'notice' 또는 패치버전 (예: '1.0.15')

  // 기타 정보 모달 상태
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [selectedDishAllergy, setSelectedDishAllergy] = useState(null);

  // PWA 앱 설치 관련 상태
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // 컴시간 로딩 상태 (2초 딜레이 풍부한 애니메이션 블러 오버레이)
  const [isWebviewLoading, setIsWebviewLoading] = useState(false);

  // 웹뷰 커버 단계 (0: 최초 학교선택 안내 커버, 1: 다크모드 경고 커버, 2: 웹뷰 표시됨)
  const [webviewStep, setWebviewStep] = useState(() => {
    const isConfirmed = localStorage.getItem('ygm_comci_confirmed') === 'true';
    const savedTheme = localStorage.getItem('ygm_theme');
    const isDark = savedTheme 
      ? savedTheme === 'dark' 
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isConfirmed) {
      return isDark ? 1 : 2;
    }
    return 0;
  });

  // 달력 input 참조용 ref
  const dateInputRef = useRef(null);

  // 급식 state
  const [meal, setMeal] = useState({ menuItems: [], calories: '', status: 'LOADING' });
  const [mealLoading, setMealLoading] = useState(true);

  const formattedDateStr = getFormattedDate(currentDate);
  const datePickerValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  // 공휴일 여부 확인
  const holidayName = getHolidayInfo(currentDate);

  // HTTPS 통신을 위한 Cloudflare Worker 프록시 주소
  const comciStudentUrl = 'https://ygm-comci-proxy.muntang711.workers.dev';

  // PWA/독립실행 환경 감지
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

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // PWA 설치 감지 이벤트 등록
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 새 버전 배포 시 공지 팝업 자동 초기화 및 자동 노출 로직
  useEffect(() => {
    const savedNoticeVersion = localStorage.getItem('ygm_notice_version');
    if (savedNoticeVersion !== CURRENT_VERSION) {
      localStorage.removeItem('ygm_hide_notice');
      setSelectedNoticeTab('notice'); // 항상 공지가 먼저 노출
      setShowNotice(true);
    } else {
      const isNeverShow = localStorage.getItem('ygm_hide_notice') === 'true';
      if (!isNeverShow) {
        setSelectedNoticeTab('notice');
        setShowNotice(true);
      }
    }
  }, []);

  // 컴시간 웹뷰 단계가 2로 전환될 때 2초간 고화질 블러 오버레이 작동
  useEffect(() => {
    if (webviewStep === 2) {
      setIsWebviewLoading(true);
      const timer = setTimeout(() => {
        setIsWebviewLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [webviewStep]);

  // [앱 설치] 버튼 클릭 실행 함수
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  // 최초 알림 확인 후 단계 이동 및 localStorage 저장
  const confirmComciStep = (nextStep) => {
    localStorage.setItem('ygm_comci_confirmed', 'true');
    setWebviewStep(nextStep);
  };

  // 테마 변경 및 localStorage 저장 함수
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

  // 공지 및 패치노트 모달 열기
  const openNoticeModal = () => {
    const isNeverShow = localStorage.getItem('ygm_hide_notice') === 'true';
    setNeverShowChecked(isNeverShow);
    setSelectedNoticeTab('notice'); // 공지가 먼저 뜨도록 설정
    setShowNotice(true);
    setIsMenuOpen(false);
  };

  // 공지 모달 닫기
  const handleCloseNotice = () => {
    if (neverShowChecked) {
      localStorage.setItem('ygm_hide_notice', 'true');
      localStorage.setItem('ygm_notice_version', CURRENT_VERSION);
    } else {
      localStorage.removeItem('ygm_hide_notice');
    }
    setShowNotice(false);
  };

  // 브라우저 달력 팝업 실행
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

  // 날짜 변경 함수 (토, 일요일 건너뛰기)
  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    while (newDate.getDay() === 0 || newDate.getDay() === 6) {
      newDate.setDate(newDate.getDate() + (days > 0 ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  // 오늘 날짜로 이동 (오늘이 주말이면 다음 월요일로 이동)
  const resetToToday = () => {
    const today = new Date();
    while (today.getDay() === 0 || today.getDay() === 6) {
      today.setDate(today.getDate() + 1);
    }
    setCurrentDate(today);
  };

  // 달력에서 직접 날짜 선택 (주말 선택 시 평일로 조정)
  const handleDateSelect = (e) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    const selected = new Date(y, m - 1, d);
    if (selected.getDay() === 6) {
      selected.setDate(selected.getDate() + 2);
    } else if (selected.getDay() === 0) {
      selected.setDate(selected.getDate() + 1);
    }
    setCurrentDate(selected);
  };

  // 급식 데이터 로딩 함수
  const loadMealData = useCallback(() => {
    setMealLoading(true);
    fetchMealSchedule(formattedDateStr).then((mealRes) => {
      setMeal(mealRes);
      setMealLoading(false);
    });
  }, [formattedDateStr]);

  // 급식 데이터 로딩 (날짜 변경 시 실행)
  useEffect(() => {
    loadMealData();
  }, [loadMealData]);

  return (
    <div className={`min-h-screen transition-colors duration-200 selection:bg-blue-500 selection:text-white relative ${
      isDarkMode ? 'bg-neutral-950 text-neutral-50' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* 🎨 Pretendard 폰트 및 화려한 모달/로딩 애니메이션 동적 주입 */}
      <style>{`
        @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Thin.woff2') format('woff2');
            font-weight: 100;
            font-display: swap;
        }
        @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-ExtraLight.woff2') format('woff2');
            font-weight: 200;
            font-display: swap;
        }
        @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Light.woff2') format('woff2');
            font-weight: 300;
            font-display: swap;
        }
        @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Regular.woff2') format('woff2');
            font-weight: 400;
            font-display: swap;
        }
        @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Medium.woff2') format('woff2');
            font-weight: 500;
            font-display: swap;
        }
        @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-SemiBold.woff2') format('woff2');
            font-weight: 600;
            font-display: swap;
        }
        @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Bold.woff2') format('woff2');
            font-weight: 700;
            font-display: swap;
        }
        @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-ExtraBold.woff2') format('woff2');
            font-weight: 800;
            font-display: swap;
        }
        @font-face {
            font-family: 'Pretendard';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Black.woff2') format('woff2');
            font-weight: 900;
            font-display: swap;
        }

        body, * {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif !important;
        }

        @keyframes modalPop {
            0% {
                opacity: 0;
                transform: scale(0.92) translateY(12px);
            }
            100% {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        @keyframes pulseGlow {
            0%, 100% {
                transform: scale(1);
                opacity: 0.8;
            }
            50% {
                transform: scale(1.15);
                opacity: 1;
            }
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(8px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .animate-modal-pop {
            animation: modalPop 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-pulse-glow {
            animation: pulseGlow 1.8s ease-in-out infinite;
        }

        .animate-item-fade {
            animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>

      {/* 📱 PWA 앱 설치 수동 안내 모달 팝업 */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative transition-all animate-modal-pop ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Download className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-base">YGMhelper 앱 설치 방법</h2>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm font-medium leading-relaxed">
              <div className={`p-3.5 rounded-2xl border ${
                isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="font-bold text-blue-500 flex items-center gap-1.5 mb-1">
                  <Share className="w-4 h-4" /> 아이폰 (iOS Safari) 사용자
                </p>
                <p className="text-slate-600 dark:text-neutral-400">
                  사파리 하단 중앙의 <strong>공유 버튼(↑)</strong>을 누른 후 <strong>[홈 화면에 추가]</strong>를 선택하시면 앱처럼 설치됩니다.
                </p>
              </div>

              <div className={`p-3.5 rounded-2xl border ${
                isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="font-bold text-emerald-500 flex items-center gap-1.5 mb-1">
                  📱 안드로이드 (Chrome) 사용자
                </p>
                <p className="text-slate-600 dark:text-neutral-400">
                  브라우저 우측 상단 <strong>메뉴 버튼(⋮)</strong>을 누른 후 <strong>[앱 설치]</strong> 또는 <strong>[홈 화면에 추가]</strong>를 누르시면 됩니다.
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
              <button
                onClick={() => setShowInstallGuide(false)}
                className="text-sm px-4 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                확인
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📢 공지사항 & 누적 패치노트 모달 팝업 (좌측: 목록 / 우측: 내용) */}
      {showNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-2xl max-h-[85vh] p-5 sm:p-6 rounded-3xl border shadow-2xl relative flex flex-col justify-between transition-all animate-modal-pop ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Megaphone className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-base sm:text-lg">
                  소식 및 업데이트 히스토리
                </h2>
              </div>
              <button
                onClick={handleCloseNotice}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 본문 (좌측: 탭 목록 / 우측: 선택된 내용) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 overflow-y-auto mb-4 p-1 min-h-[260px]">
              
              {/* 좌측 탭 목록 (공지사항 + 누적 패치버전) */}
              <div className="sm:col-span-1 flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-neutral-800 pr-0 sm:pr-3 shrink-0">
                <button
                  onClick={() => setSelectedNoticeTab('notice')}
                  className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm text-left flex items-center gap-2 transition-all shrink-0 ${
                    selectedNoticeTab === 'notice'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isDarkMode ? 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300' : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  <Megaphone className="w-4 h-4" />
                  <span>공지사항</span>
                </button>

                <div className="hidden sm:block my-1 text-[11px] font-bold text-slate-400 px-2">패치 히스토리</div>

                {PATCH_HISTORY.map((patch) => (
                  <button
                    key={patch.version}
                    onClick={() => setSelectedNoticeTab(patch.version)}
                    className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm text-left flex items-center justify-between transition-all shrink-0 ${
                      selectedNoticeTab === patch.version
                        ? 'bg-blue-600 text-white shadow-md'
                        : isDarkMode ? 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300' : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 opacity-70" />
                      <span>v{patch.version}</span>
                    </div>
                    {patch.version === CURRENT_VERSION && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-400 text-neutral-900 font-extrabold">최신</span>
                    )}
                  </button>
                ))}
              </div>

              {/* 우측 내용 출력 영역 */}
              <div className="sm:col-span-2 pl-0 sm:pl-2 pt-1 sm:pt-0">
                {selectedNoticeTab === 'notice' ? (
                  /* 공지사항 탭 내용 (공지가 항상 먼저 나옴) */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        알림
                      </span>
                      <h3 className="font-extrabold text-base">서비스 안내 공지</h3>
                    </div>

                    <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed font-medium ${
                      isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      테스트 공지입니다. YGMhelper 서비스를 이용해 주셔서 감사합니다.
                    </div>
                  </div>
                ) : (
                  /* 누적 패치노트 내용 */
                  (() => {
                    const patch = PATCH_HISTORY.find((p) => p.version === selectedNoticeTab);
                    if (!patch) return null;

                    return (
                      <div className="space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-neutral-800 pb-2">
                          <h3 className="font-extrabold text-sm sm:text-base text-blue-600 dark:text-blue-400">
                            {patch.title}
                          </h3>
                          <span className="text-xs text-slate-400 font-semibold shrink-0">{patch.date}</span>
                        </div>

                        <div className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-medium ${
                          isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <p className="font-bold text-xs text-slate-400 mb-2">변경 상세 항목</p>
                          <ul className="list-disc list-inside space-y-1.5 pl-1">
                            {patch.changes.map((change, idx) => (
                              <li key={idx} className="leading-relaxed">{change}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

            </div>

            {/* 모달 푸터 (체크박스 + 닫기 버튼) */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-neutral-800 shrink-0">
              <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer select-none text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200">
                <input
                  type="checkbox"
                  checked={neverShowChecked}
                  onChange={(e) => setNeverShowChecked(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 cursor-pointer"
                />
                <span>이 버전에서 다시 보지 않기</span>
              </label>

              <button
                onClick={handleCloseNotice}
                className="text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                닫기
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🔍 개별 급식 알러지 상세 확인 모달 */}
      {selectedDishAllergy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative transition-all animate-modal-pop ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg">{selectedDishAllergy.dishName}</h2>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">함유된 알러지 성분 정보</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDishAllergy(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 py-2 max-h-[320px] overflow-y-auto">
              {selectedDishAllergy.allergyStr
                .split('.')
                .filter(Boolean)
                .map((numStr, idx) => {
                  const cleanNum = numStr.trim();
                  const allergyName = ALLERGY_MAP[cleanNum] || `알러지 ${cleanNum}`;
                  return (
                    <div key={idx} className={`p-3 rounded-2xl border font-bold text-sm flex items-center gap-3 ${
                      isDarkMode ? 'bg-neutral-950 border-neutral-800 text-amber-400' : 'bg-amber-50/80 border-amber-200 text-amber-900'
                    }`}>
                      <span className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center text-xs font-black text-amber-600 shrink-0">
                        {cleanNum}
                      </span>
                      <span>{allergyName}</span>
                    </div>
                  );
                })}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
              <button
                onClick={() => setSelectedDishAllergy(null)}
                className="text-sm px-4 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                확인
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🧬 전체 알러지 정보 안내 모달 팝업 */}
      {showAllergyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative transition-all animate-modal-pop ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                  <Info className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-base">전체 알러지 목록 (NEIS 기준)</h2>
              </div>
              <button
                onClick={() => setShowAllergyModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-semibold py-2 max-h-[320px] overflow-y-auto">
              {ALLERGY_LIST.map((item, idx) => (
                <div key={idx} className={`p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-neutral-950/80 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  {item}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
              <button
                onClick={() => setShowAllergyModal(false)}
                className="text-sm px-4 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                확인
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 상단 네비게이션 헤더 */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md ${
        isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <GraduationCap className="w-5.5 h-5.5" />
            </div>
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
          </div>

          <div className="flex items-center gap-2">
            {/* 📲 PWA [앱 설치] 버튼 (앱 접속 환경 시 자동 숨김) */}
            {!isStandalone && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 text-xs sm:text-sm px-3.5 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-95"
                title="앱으로 설치하기"
              >
                <Download className="w-4 h-4" />
                <span>앱 설치</span>
              </button>
            )}

            {/* ☀️/🌙 다크모드 전용 독립 아이콘 버튼 (헤더에 상시 노출) */}
            <button
              onClick={toggleDarkMode}
              className={`p-2.5 rounded-xl border transition-all ${
                isDarkMode 
                  ? 'bg-neutral-800 border-neutral-700 text-amber-400 hover:bg-neutral-700' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
              }`}
              title="테마 전환"
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* 🔽 드롭다운 메뉴 (`^` 모양 화살표 버튼) */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={`p-2.5 rounded-xl border flex items-center gap-1 transition-all ${
                  isDarkMode 
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700' 
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
                }`}
                title="메뉴 열기"
              >
                <ChevronDown className={`w-4.5 h-4.5 transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-blue-500' : ''}`} />
              </button>

              {/* 드롭다운 메뉴 팝업 */}
              {isMenuOpen && (
                <div className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-2xl p-1.5 z-50 animate-fadeIn ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-200' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <button
                    onClick={openNoticeModal}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors ${
                      isDarkMode ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Megaphone className="w-4 h-4 text-blue-500" />
                    <span>공지 & 패치노트</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 영역 */}
      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        
        {/* 📱 모바일 전용 탭 선택 상자 (슬라이딩 애니메이션) */}
        <div className={`relative flex md:hidden p-1.5 mb-4 rounded-2xl border ${
          isDarkMode 
            ? 'bg-neutral-900 border-neutral-800' 
            : 'bg-slate-200/80 border-slate-300/60'
        }`}>
          {/* 슬라이딩 사각형 배경 픽셀 이동 처리 */}
          <div 
            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] transition-all duration-300 ease-out rounded-xl shadow-md ${
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

        {/* 급식표 & 웹뷰 시간표 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          
          {/* 🍽️ 급식표 Card */}
          <div className={`p-5 sm:p-6 rounded-3xl border flex flex-col justify-between ${
            activeTab === 'meal' ? 'block' : 'hidden md:block'
          } ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div>
              {/* 급식 타이틀 헤더 */}
              <div className={`flex items-center justify-between pb-3.5 border-b mb-4 ${
                isDarkMode ? 'border-neutral-800' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600">
                    <Utensils className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h2 className={`font-bold text-base sm:text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      오늘의 급식
                    </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>YGM 식단표</p>
                  </div>
                </div>
              </div>

              {/* 📅 급식 전용 날짜 선택 바 */}
              <div className={`p-3 rounded-2xl border mb-3 flex items-center justify-between gap-2 ${
                holidayName
                  ? isDarkMode ? 'bg-red-950/40 border-red-900/60' : 'bg-red-50 border-red-200'
                  : isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div 
                  onClick={openDatePicker}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity select-none flex-wrap"
                >
                  <CalendarIcon className={`w-5 h-5 shrink-0 ${holidayName ? 'text-red-500' : 'text-blue-500'}`} />
                  <span className={`text-sm sm:text-base font-bold tracking-tight ${
                    holidayName 
                      ? 'text-red-700 dark:text-red-400' 
                      : isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {currentDate.getFullYear()}.{currentDate.getMonth() + 1}.{currentDate.getDate()}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold ${
                    holidayName
                      ? 'bg-red-600 text-white'
                      : isDarkMode ? 'bg-neutral-800 text-blue-400' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()]}
                  </span>

                  {/* 공휴일 뱃지 */}
                  {holidayName && (
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-bold border ${
                      isDarkMode 
                        ? 'bg-red-900/60 text-red-300 border-red-800' 
                        : 'bg-red-100 text-red-700 border-red-200'
                    }`}>
                      공휴일 ({holidayName})
                    </span>
                  )}

                  <input
                    ref={dateInputRef}
                    type="date"
                    value={datePickerValue}
                    onChange={handleDateSelect}
                    className="sr-only"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={resetToToday}
                    className={`text-xs sm:text-sm px-3 py-2 rounded-xl font-bold border transition-colors ${
                      isDarkMode 
                        ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                        : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                    오늘
                  </button>
                  <button
                    onClick={() => changeDate(-1)}
                    className={`p-2 rounded-xl border transition-colors ${
                      isDarkMode 
                        ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                        : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                    }`}
                    title="이전 평일"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => changeDate(1)}
                    className={`p-2 rounded-xl border transition-colors ${
                      isDarkMode 
                        ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                        : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                    }`}
                    title="다음 평일"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 선택한 날짜 칼로리 정보 */}
              {meal.calories && !mealLoading && !holidayName && (
                <div className="flex items-center justify-between px-1 mb-3">
                  <span className={`text-xs sm:text-sm font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                    선택한 날짜 총 칼로리
                  </span>
                  <span className={`text-xs sm:text-sm px-3 py-1 rounded-full font-bold ${
                    isDarkMode ? 'bg-neutral-800 text-orange-400' : 'bg-orange-100 text-orange-800 border border-orange-200'
                  }`}>
                    {meal.calories}
                  </span>
                </div>
              )}

              {/* 급식 목록 및 공휴일 메시지 상자 */}
              {mealLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
                    <Sparkles className="w-4 h-4 text-orange-500 absolute animate-pulse" />
                  </div>
                  <span className="text-sm font-bold text-slate-600 dark:text-neutral-300">급식 데이터 로딩 중...</span>
                </div>
              ) : holidayName ? (
                /* 공휴일 안내 상자 */
                <div className={`p-8 sm:p-10 rounded-2xl text-center text-sm font-semibold border flex flex-col items-center justify-center gap-2 ${
                  isDarkMode 
                    ? 'bg-red-950/40 border-red-900/50 text-red-300' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <p className={`font-bold text-base sm:text-lg ${
                    isDarkMode ? 'text-red-400' : 'text-red-700'
                  }`}>
                    🎈 오늘은 공휴일입니다 ({holidayName})
                  </p>
                  <p className={`text-xs sm:text-sm font-medium ${
                    isDarkMode ? 'text-red-300/80' : 'text-red-600'
                  }`}>
                    공휴일 및 대체공휴일에는 급식이 제공되지 않습니다.
                  </p>
                </div>
              ) : meal.menuItems && meal.menuItems.length > 0 ? (
                /* 정밀 카테고리화 급식 리스트 */
                <div className="space-y-3">
                  {meal.menuItems.map((dish, idx) => {
                    const category = getDishCategory(dish.name);
                    const badgeClass = getCategoryBadgeStyle(category, isDarkMode);

                    return (
                      <div
                        key={idx}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                        className={`animate-item-fade opacity-0 px-4 py-3.5 sm:py-4 rounded-2xl border flex items-center justify-between gap-3 shadow-sm transition-all hover:scale-[1.01] ${
                          isDarkMode 
                            ? 'bg-neutral-950/80 border-neutral-800/80' 
                            : 'bg-slate-50 border-slate-200/80'
                        }`}
                      >
                        {/* 메뉴 이름 및 알록달록한 카테고리 배지 */}
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

                        {/* 은은한 알러지 배지 */}
                        {dish.allergy && (
                          <button
                            onClick={() => setSelectedDishAllergy({ dishName: dish.name, allergyStr: dish.allergy })}
                            className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border shrink-0 transition-all hover:scale-105 active:scale-95 ${
                              isDarkMode 
                                ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-amber-500/50 hover:text-amber-400' 
                                : 'bg-white border-slate-200 text-slate-500 hover:border-amber-500/50 hover:text-amber-700 shadow-sm'
                            }`}
                            title="터치하여 함유된 알러지 성분 보기"
                          >
                            알러지 {dish.allergy}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`p-10 rounded-2xl text-center text-sm font-semibold ${
                  isDarkMode ? 'bg-neutral-950/60 text-neutral-400' : 'bg-slate-50 text-slate-500'
                }`}>
                  등록된 급식 정보가 없거나, NEIS에서 급식 정보를 불러오지 못했습니다.
                </div>
              )}
            </div>

            {/* 급식 카드 하단 컨트롤바 */}
            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2">
              <button
                onClick={() => setShowAllergyModal(true)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm border transition-colors ${
                  isDarkMode 
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Info className="w-4 h-4 text-orange-500 shrink-0" />
                <span>전체 알러지 목록</span>
              </button>

              <button
                onClick={loadMealData}
                disabled={mealLoading}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm border transition-colors ${
                  isDarkMode 
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <RotateCcw className={`w-4 h-4 text-blue-500 shrink-0 ${mealLoading ? 'animate-spin' : ''}`} />
                <span>다시 불러오기</span>
              </button>
            </div>
          </div>

          {/* 📚 시간표 Card */}
          <div className={`p-5 sm:p-6 rounded-3xl border flex flex-col justify-between ${
            activeTab === 'schedule' ? 'block' : 'hidden md:block'
          } ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div>
              <div className={`flex items-center justify-between pb-3.5 border-b mb-4 ${
                isDarkMode ? 'border-neutral-800' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                    <BookOpen className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h2 className={`font-bold text-base sm:text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      실시간 시간표
                    </h2>
                    <p className={`text-xs ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                      컴시간알리미
                    </p>
                  </div>
                </div>

                <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-blue-600 text-white shadow-sm flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5" /> 실시간
                </span>
              </div>

              {/* 1단계: 접속 초기 필수 선택 안내 커버 */}
              {webviewStep === 0 && (
                <div className={`rounded-2xl border p-6 h-[420px] sm:h-[450px] flex flex-col items-center justify-center text-center gap-4 ${
                  isDarkMode ? 'bg-neutral-950/90 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-base ${isDarkMode ? 'text-neutral-200' : 'text-slate-900'}`}>
                      학교 및 학년/반 선택 안내
                    </h3>
                    <p className={`text-xs sm:text-sm mt-1.5 max-w-[260px] leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                      컴시간 화면에서 <span className="font-bold text-blue-500">최초 1회</span> 학교와 학년/반을 선택하셔야 합니다.
                    </p>
                  </div>

                  <div className="flex items-center justify-center mt-3">
                    {isDarkMode ? (
                      <button
                        onClick={() => confirmComciStep(1)}
                        className="text-sm px-5 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm transition-colors"
                      >
                        다음으로 <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => confirmComciStep(2)}
                        className="text-sm px-5 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm transition-colors"
                      >
                        <Eye className="w-4 h-4" /> 표시하기
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 2단계: 다크모드 경고 커버 */}
              {webviewStep === 1 && (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 h-[420px] sm:h-[450px] p-6 flex flex-col items-center justify-center text-center gap-4">
                  <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-200">컴시간은 다크 모드를 지원하지 않습니다</h3>
                    <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 max-w-[260px] leading-relaxed">
                      밝은 하얀색 화면이 노출될 수 있으니 아래 버튼을 눌러 이용해 주세요.
                    </p>
                  </div>

                  <div className="flex items-center justify-center mt-3">
                    <button
                      onClick={() => setWebviewStep(2)}
                      className="text-sm px-5 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" /> 표시하기
                    </button>
                  </div>
                </div>
              )}

              {/* 3단계: 시간표 웹뷰 출력 + 풍부한 로딩 오버레이 */}
              {webviewStep === 2 && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-white h-[420px] sm:h-[450px] relative w-full">
                  {/* 컴시간 웹뷰 지연용 투명 블러 및 글로우 오버레이 */}
                  {isWebviewLoading && (
                    <div className="absolute inset-0 z-20 backdrop-blur-lg bg-white/50 dark:bg-neutral-900/50 flex flex-col items-center justify-center gap-3 animate-fadeIn">
                      <div className="relative flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
                        <Sparkles className="w-5 h-5 text-blue-600 absolute animate-pulse-glow" />
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-neutral-100 drop-shadow-sm tracking-tight">
                        시간표 불러오는 중... 잠시만 기다려 주세요
                      </p>
                    </div>
                  )}

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

            {/* 하단 출처 표시 */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold text-xs">출처: 컴시간알리미</span>
            </div>
          </div>

        </div>

        {/* 푸터 */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1 font-medium">
          <Info className="w-3.5 h-3.5" />
          <span>Domain: ygmhelper.xyz | YGM 전용 스마트 스쿨 도우미</span>
        </div>
      </main>
    </div>
  );
}