import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  Utensils, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
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
  Share
} from 'lucide-react';
import { fetchMealSchedule, getFormattedDate } from './services/neisApi';

// NEIS 알러지 정보 19종 목록
const ALLERGY_LIST = [
  "1. 난류", "2. 우유", "3. 메밀", "4. 땅콩", "5. 대두", "6. 밀",
  "7. 고등어", "8. 게", "9. 새우", "10. 돼지고기", "11. 복숭아",
  "12. 토마토", "13. 아황산류", "14. 호두", "15. 닭고기", "16. 쇠고기",
  "17. 오징어", "18. 조개류(굴,전복,홍합 포함)", "19. 잣"
];

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

// 급식 메뉴명에 따른 카테고리 구분 함수
const getDishCategory = (dishName) => {
  if (!dishName) return '반찬';
  const name = dishName.trim();

  // 1. 음료
  if (
    name.includes('우유') || 
    name.includes('주스') || 
    name.includes('쥬스') || 
    name.includes('에이드') || 
    name.includes('요구르트') || 
    name.includes('야쿠르트') || 
    name.includes('음료')
  ) {
    return '음료';
  }

  // 2. 과일
  const fruits = [
    '과일', '사과', '바나나', '포도', '귤', '수박', '참외', '딸기', 
    '키위', '오렌지', '파인애플', '멜론', '메론', '체리', '자두', 
    '한라봉', '천혜향', '레드향', '샤인머스캣', '샤인머스켓', '망고', 
    '청포도', '블루베리', '자몽'
  ];
  if (fruits.some((f) => name.includes(f))) {
    return '과일';
  }

  // 3. 밥
  if (name.includes('밥')) {
    return '밥';
  }

  // 4. 국
  if (
    name.includes('국') || 
    name.includes('탕') || 
    name.includes('찌개') || 
    name.includes('스프') || 
    name.includes('수프')
  ) {
    return '국';
  }

  // 5. 나머지는 반찬
  return '반찬';
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

  // 주말(토, 일) 제외 초기 날짜 설정
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    while (today.getDay() === 0 || today.getDay() === 6) {
      today.setDate(today.getDate() + 1);
    }
    return today;
  });

  // 공지사항 팝업 및 알러지 정보 모달 상태
  const [showNotice, setShowNotice] = useState(false);
  const [neverShowChecked, setNeverShowChecked] = useState(false);
  const [showAllergyModal, setShowAllergyModal] = useState(false);

  // PWA 앱 설치 관련 상태
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // 2. 웹뷰 커버 단계 (0: 최초 학교선택 안내 커버, 1: 다크모드 경고 커버, 2: 웹뷰 표시됨)
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

  // [앱 설치] 버튼 클릭 실행 함수
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // 자동 설치 프롬프트가 지원되지 않는 환경(아이폰, Safari, 조건 미충족)에서는 안내 모달 출력
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

  // 페이지 마운트 시 '공지 다시 보지 않기' 저장 상태 확인
  useEffect(() => {
    const isNeverShow = localStorage.getItem('ygm_hide_notice') === 'true';
    setNeverShowChecked(isNeverShow);
    if (!isNeverShow) {
      setShowNotice(true);
    }
  }, []);

  // 공지 모달 열기
  const openNoticeModal = () => {
    const isNeverShow = localStorage.getItem('ygm_hide_notice') === 'true';
    setNeverShowChecked(isNeverShow);
    setShowNotice(true);
  };

  // 공지 모달 닫기
  const handleCloseNotice = () => {
    if (neverShowChecked) {
      localStorage.setItem('ygm_hide_notice', 'true');
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
    <div className={`min-h-screen transition-colors duration-150 selection:bg-blue-500 selection:text-white relative ${
      isDarkMode ? 'bg-neutral-950 text-neutral-50' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* 🎨 Pretendard 폰트 동적 주입 */}
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
      `}</style>

      {/* 📱 PWA 앱 설치 수동 안내 모달 팝업 */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative transition-all ${
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

            <div className="space-y-4 text-xs sm:text-sm font-medium leading-relaxed">
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
                className="text-xs sm:text-sm px-4 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                확인
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📢 공지사항 모달 팝업 */}
      {showNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative transition-all ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Megaphone className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-base">YGM헬퍼 안내사항</h2>
              </div>
              <button
                onClick={handleCloseNotice}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className={`text-xs sm:text-sm leading-relaxed space-y-2.5 mb-6 font-medium ${
              isDarkMode ? 'text-neutral-300' : 'text-slate-700'
            }`}>
              <p>안녕하세요, YGM헬퍼 개발자입니다.</p>
              <p>저희 YGM헬퍼에서는 시간표 기능을 제공하고 있습니다.</p>
              <p>원래는 컴시간 api를 가져오려고 했으나, api를 가져오는데 어려움을 겪고 결국 webview방식으로 구현했습니다.</p>
              <p>이에 따라 컴시간 창에서 최초 1회만 학교 이름과 자신의 학년/반을 선택해주시면, 다음 접속부터는 선택한 내용이 저장되어 다시 선택할 필요가 없습니다.</p>
              <p className="text-xs opacity-75 pt-1">이용에 불편을 드려 죄송합니다.</p>
            </div>

            {/* 모달 푸터 (체크박스 + 닫기 버튼) */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-neutral-800">
              <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer select-none text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200">
                <input
                  type="checkbox"
                  checked={neverShowChecked}
                  onChange={(e) => setNeverShowChecked(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 cursor-pointer"
                />
                <span>다시 보지 않기</span>
              </label>

              <button
                onClick={handleCloseNotice}
                className="text-xs sm:text-sm px-4 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                닫기
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🧬 알러지 정보 안내 모달 팝업 */}
      {showAllergyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative transition-all ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                  <Info className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-base">알러지 정보 (NEIS 기준)</h2>
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
                className="text-xs sm:text-sm px-4 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
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
            <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className={`font-bold text-base tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
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
            {/* 📲 유튜브 스타일 PWA [앱 설치] 버튼 (항상 노출되며 클릭 시 알맞게 동작) */}
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-95"
              title="앱으로 설치하기"
            >
              <Download className="w-4 h-4" />
              <span>앱 설치</span>
            </button>

            {/* 공지사항 다시보기 버튼 */}
            <button
              onClick={openNoticeModal}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold border transition-colors ${
                isDarkMode 
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
              }`}
              title="공지사항 보기"
            >
              <Megaphone className="w-4 h-4 text-blue-500" />
              <span>공지</span>
            </button>

            {/* 다크/라이트모드 토글 */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl border transition-colors ${
                isDarkMode 
                  ? 'bg-neutral-800 border-neutral-700 text-amber-400 hover:bg-neutral-700' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
              }`}
              title="테마 전환"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* 메인 영역 */}
      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        
        {/* 📱 모바일 전용 탭 선택 상자 */}
        <div className="flex md:hidden p-1.5 mb-4 rounded-2xl bg-slate-200/80 dark:bg-neutral-800 border border-slate-300/60 dark:border-neutral-700/80">
          <button
            onClick={() => setActiveTab('meal')}
            className={`flex-1 py-3 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
              activeTab === 'meal'
                ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-white shadow-md'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
            }`}
          >
            <Utensils className="w-4.5 h-4.5 text-orange-500" />
            <span>급식표</span>
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-3 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
              activeTab === 'schedule'
                ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-white shadow-md'
                : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
            }`}
          >
            <BookOpen className="w-4.5 h-4.5 text-blue-500" />
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
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`font-bold text-sm sm:text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
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
                  <CalendarIcon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${holidayName ? 'text-red-500' : 'text-blue-500'}`} />
                  <span className={`text-xs sm:text-sm font-bold tracking-tight ${
                    holidayName 
                      ? 'text-red-700 dark:text-red-400' 
                      : isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {currentDate.getFullYear()}.{currentDate.getMonth() + 1}.{currentDate.getDate()}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-lg font-bold ${
                    holidayName
                      ? 'bg-red-600 text-white'
                      : isDarkMode ? 'bg-neutral-800 text-blue-400' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()]}
                  </span>

                  {/* 공휴일 뱃지 */}
                  {holidayName && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-lg font-bold border ${
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
                    className={`text-xs px-2.5 py-1.5 rounded-xl font-bold border transition-colors ${
                      isDarkMode 
                        ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                        : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3 inline mr-1" />
                    오늘
                  </button>
                  <button
                    onClick={() => changeDate(-1)}
                    className={`p-1.5 rounded-xl border transition-colors ${
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
                    className={`p-1.5 rounded-xl border transition-colors ${
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

              {/* 급식 목록 및 선명한 공휴일 메시지 상자 */}
              {mealLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2.5">
                  <Sparkles className="w-6 h-6 animate-spin text-orange-500" />
                  <span className="text-sm font-semibold">급식 데이터 불러오는 중...</span>
                </div>
              ) : holidayName ? (
                /* 공휴일 안내 상자 */
                <div className={`p-8 sm:p-10 rounded-2xl text-center text-sm font-semibold border flex flex-col items-center justify-center gap-2 ${
                  isDarkMode 
                    ? 'bg-red-950/40 border-red-900/50 text-red-300' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <p className={`font-bold text-sm sm:text-base ${
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
                <div className="space-y-2.5">
                  {meal.menuItems.map((dish, idx) => (
                    <div
                      key={idx}
                      className={`px-4 py-3 sm:py-3.5 rounded-xl border flex items-center justify-between gap-2.5 ${
                        isDarkMode 
                          ? 'bg-neutral-950/80 border-neutral-800' 
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* 메뉴 이름 및 옆에 표시되는 회색 카테고리 태그 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-xs sm:text-sm ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {dish.name}
                        </span>
                        <span className={`text-xs font-medium ${
                          isDarkMode ? 'text-neutral-500' : 'text-slate-400'
                        }`}>
                          {getDishCategory(dish.name)}
                        </span>
                      </div>

                      {/* 알러지 정보 배지 */}
                      {dish.allergy && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg border shrink-0 ${
                          isDarkMode 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          알러지 {dish.allergy}
                        </span>
                      )}
                    </div>
                  ))}
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
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-colors ${
                  isDarkMode 
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Info className="w-4 h-4 text-orange-500 shrink-0" />
                <span>알러지 정보 확인</span>
              </button>

              <button
                onClick={loadMealData}
                disabled={mealLoading}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-colors ${
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
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`font-bold text-sm sm:text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
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
                    <h3 className={`font-bold text-sm sm:text-base ${isDarkMode ? 'text-neutral-200' : 'text-slate-900'}`}>
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
                        className="text-xs sm:text-sm px-5 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm transition-colors"
                      >
                        다음으로 <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => confirmComciStep(2)}
                        className="text-xs sm:text-sm px-5 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm transition-colors"
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
                    <h3 className="font-bold text-sm sm:text-base text-neutral-200">컴시간은 다크 모드를 지원하지 않습니다</h3>
                    <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 max-w-[260px] leading-relaxed">
                      밝은 하얀색 화면이 노출될 수 있으니 아래 버튼을 눌러 이용해 주세요.
                    </p>
                  </div>

                  <div className="flex items-center justify-center mt-3">
                    <button
                      onClick={() => setWebviewStep(2)}
                      className="text-xs sm:text-sm px-5 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" /> 표시하기
                    </button>
                  </div>
                </div>
              )}

              {/* 3단계: 시간표 웹뷰 출력 */}
              {webviewStep === 2 && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-white h-[420px] sm:h-[450px] relative w-full">
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