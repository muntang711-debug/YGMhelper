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
const CURRENT_VERSION = '1.1.2';
const CURRENT_NOTICE_ID = 'notice_2026_08_22_3';

const RATING_OPTIONS = [
  { label: '야르킁킁', icon: Flame, color: 'text-amber-500 border-amber-500/30 bg-amber-500/10' },
  { label: '야르', icon: ThumbsUp, color: 'text-blue-500 border-blue-500/30 bg-blue-500/10' },
  { label: '먹을만함', icon: Smile, color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' },
  { label: '그저그런', icon: Meh, color: 'text-slate-500 border-slate-500/30 bg-slate-500/10' },
  { label: '맛없음', icon: Frown, color: 'text-rose-500 border-rose-500/30 bg-rose-500/10' }
];

// 패치노트 전체 히스토리 데이터베이스 (1.0.0 ~ CURRENT_VERSION)
const PATCH_HISTORY = [
  {
    version: '1.1.2',
    date: '2026.08.22',
    title: '버전 1.1.2 업데이트: 최근 7일 급식 평가 모듈 상시 노출 및 공휴일 자동 스킵 처리',
    changes: [
      '데이터 존재 여부와 관계없이 최근 7일 이내 날짜 선택 시 급식 평가 모듈 상시 노출',
      '날짜 이동 및 선택 시 주말 및 공휴일 자동 스킵 처리',
      '급식표 내 빨간색 공휴일 안내 카드 제거'
    ]
  },
  {
    version: '1.1.1',
    date: '2026.08.22',
    title: '버전 1.1.1 업데이트: 과거 날짜 급식 평가 모듈 자동 숨김 및 샐러드 메뉴 분류 보정',
    changes: [
      '평가 데이터가 없는 과거 날짜의 경우 급식 평가 창 자동 비노출 처리',
      '식단 이름에 샐러드가 포함된 메뉴가 과일/음료 대신 반찬으로 분류되도록 카테고리 로직 개선'
    ]
  },
  {
    version: '1.1.0',
    date: '2026.08.22',
    title: '버전 1.1.0 업데이트: 실시간 급식 평가 기능 및 Cloudflare KV 백엔드 연동',
    changes: [
      '오늘 급식 한정 실시간 평가 기능 추가 (야르킁킁, 야르, 먹을만함, 그저그런, 맛없음)',
      '평가 기록 7일 자동 보관 및 삭제 로직 적용'
    ]
  },
  {
    version: '1.0.21',
    date: '2026.08.21',
    title: '버전 1.0.21 업데이트: 헤더 다운로드 버튼 모바일 최적화, 모달 가변 애니메이션 삭제 및 수동 열기 시 체크박스 숨김',
    changes: [
      '헤더 앱 설치 버튼의 텍스트 제거 및 다운로드 아이콘 단독 배치로 모바일 최적화',
      '패치노트 내용 변경 시 발생하던 어색한 창 크기 변형 애니메이션 완전 삭제',
      '드롭다운 메뉴를 통해 공지사항/패치노트 직접 열람 시 [다시 보지 않기] 체크박스 비노출 처리 (자동 팝업 시에만 노출)'
    ]
  },
  {
    version: '1.0.20',
    date: '2026.08.20',
    title: '버전 1.0.20 업데이트: 팝업 레이아웃 쏠림 현상 수정, 팝업 가변 애니메이션 및 모달 시스템 완전 안정화',
    changes: [
      '팝업 오픈 시 스크롤바가 제거되며 메인 화면이 우측으로 밀리던 레이아웃 쏠림(Layout Shift) 완벽 수정',
      '패치노트 선택 시 내용 길이에 따라 모달 높이가 자연스럽게 변하는 height 전환 애니메이션 적용',
      '공지사항 및 패치노트 모달 팝업 등장/퇴장 애니메이션 완전 통일'
    ]
  },
  {
    version: '1.0.19',
    date: '2026.08.20',
    title: '버전 1.0.19 업데이트: 팝업 배경 스크롤 차단, 패치 버전 버튼 세로 크기 고정 및 팝업 가변 애니메이션 적용',
    changes: [
      '모달 팝업 오픈 시 뒷 배경(메인 스크롤) 터치 및 스크롤 완전 방지 처리',
      '패치노트 내용 길이에 영향받던 버전 선택 버튼 높이(h-9) 완벽 고정',
      '패치 내용 길이에 맞춰 모달 크기가 유연하고 자연스럽게 늘어나는 300ms 애니메이션 적용'
    ]
  },
  {
    version: '1.0.18',
    date: '2026.08.20',
    title: '버전 1.0.18 업데이트: 패치노트 모달 스크롤 분리 및 모바일 레이아웃 고정',
    changes: [
      '패치노트 모달 좌측(버전 목록)과 우측(상세 내용) 독립 스크롤바 완전 분리',
      '상세 내용 길이에 따라 모바일 버전 선택 버튼 크기가 변형되는 버그 수정'
    ]
  },
  {
    version: '1.0.17',
    date: '2026.08.20',
    title: '버전 1.0.17 업데이트: 공지/패치노트 독립 팝업 로직 정밀화 및 전체 히스토리 반영',
    changes: [
      '공지사항(새 공지 등록 시에만 재노출)과 패치노트(새 버전 배포 시에만 자동 팝업) 저장 로직 완전 분리',
      '공지 확인 완료 후 배포된 새 버전 패치노트 순차 팝업 시스템 구현',
      '1.0.0 최초 출시부터 1.0.12 및 최신 버전까지의 전체 패치노트 히스토리 완벽 정리 반영'
    ]
  },
  {
    version: '1.0.16',
    date: '2026.08.20',
    title: '버전 1.0.16 업데이트: 공지사항 및 패치노트 분리, 팝업창 닫기 애니메이션 추가',
    changes: [
      '공지사항과 패치노트 메뉴 및 모달 창 완전 분리',
      '모든 팝업 모달창 열기/닫기 부드러운 전환 애니메이션 적용',
      '공지사항 독립 모달창 및 패치노트 히스토리 모달 구현'
    ]
  },
  {
    version: '1.0.15',
    date: '2026.08.20',
    title: '버전 1.0.15 업데이트: 식단 카테고리 오분류 수정, 패치노트 시스템 및 모달 애니메이션 강화',
    changes: [
      '식단 카테고리 오분류 수정 (떡볶이→디저트, 차돌박이→음료, (국제)→국 오인식 완벽 방지)',
      '다크모드 토글 버튼 상단 헤더 독립 재배치',
      '모달 팝업 스케일 효과 및 로딩 오버레이 애니메이션 강화'
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
  },
  {
    version: '1.0.12',
    date: '2026.08.18',
    title: '버전 1.0.12 업데이트: 모바일 UI 최적화 및 다크모드 디자인 개선',
    changes: [
      '모바일 기기 화면 비율 맞춤 UI 패딩 및 폰트 밸런스 조정',
      '다크모드 색상 대비 최적화'
    ]
  },
  {
    version: '1.0.11',
    date: '2026.08.18',
    title: '버전 1.0.11 업데이트: 급식 긴급 패치',
    changes: [
      'NEIS 급식 API 일부 예외 데이터 파싱 실패 오류 긴급 수정'
    ]
  },
  {
    version: '1.0.10',
    date: '2026.08.18',
    title: '버전 1.0.10 업데이트: 앱 설치 버그 수정',
    changes: [
      '특정 모바일 브라우저 환경에서 앱 설치 안내 프롬프트 호환성 개선'
    ]
  },
  {
    version: '1.0.9',
    date: '2026.08.18',
    title: '버전 1.0.9 업데이트: 앱 설치 기능 추가',
    changes: [
      'PWA 지원을 위한 Web App Manifest 및 앱 설치 가이드 모달 구현'
    ]
  },
  {
    version: '1.0.8',
    date: '2026.08.18',
    title: '버전 1.0.8 업데이트: CSS 오류 수정',
    changes: [
      '일부 디스플레이에서 발생하는 레이아웃 깨짐 현상 수정'
    ]
  },
  {
    version: '1.0.7',
    date: '2026.08.18',
    title: '버전 1.0.7 업데이트: 앱 다운로드 기능 추가',
    changes: [
      '홈 화면 추가 안내 및 다운로드 모듈 연동'
    ]
  },
  {
    version: '1.0.6',
    date: '2026.08.18',
    title: '버전 1.0.6 업데이트: UI/UX 개선',
    changes: [
      '상단 헤더 아이콘 배치 및 터치 영역 개선'
    ]
  },
  {
    version: '1.0.5',
    date: '2026.08.18',
    title: '버전 1.0.5 업데이트: 모바일 환경 UI/UX 개선',
    changes: [
      '모바일 접속 시 시간표 웹뷰 확대 비율 및 스크롤 최적화'
    ]
  },
  {
    version: '1.0.4',
    date: '2026.08.18',
    title: '버전 1.0.4 업데이트: 웹뷰 오류 수정',
    changes: [
      '컴시간알리미 프록시 통신 안전성 보강'
    ]
  },
  {
    version: '1.0.3',
    date: '2026.08.18',
    title: '버전 1.0.3 업데이트: 웹뷰 오류 수정',
    changes: [
      '시간표 프레임 로딩 지연 문제 패치'
    ]
  },
  {
    version: '1.0.2',
    date: '2026.08.18',
    title: '버전 1.0.2 업데이트: 컴시간 바로가기 버튼 추가',
    changes: [
      '시간표 연동 단축 경로 및 외부 연결 지원'
    ]
  },
  {
    version: '1.0.1',
    date: '2026.08.17',
    title: '버전 1.0.1 업데이트: 초기 웹뷰 및 데이터 파싱 구조 개편',
    changes: [
      '초기 웹뷰 모듈 안정화 및 NEIS 급식 데이터 처리 구조 개선'
    ]
  },
  {
    version: '1.0.0',
    date: '2026.08.17',
    title: '버전 1.0.0 업데이트: YGMhelper 서비스 최초 공식 출시',
    changes: [
      'YGM 전용 오늘의 급식표 및 실시간 시간표 조회 서비스 런칭'
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

// 주말 또는 공휴일 판별 함수
const isHolidayOrWeekend = (date) => {
  const day = date.getDay();
  if (day === 0 || day === 6) return true;
  return Boolean(getHolidayInfo(date));
};

// 정밀 급식 메뉴 카테고리 구분 함수
const getDishCategory = (dishName) => {
  if (!dishName) return '반찬';
  
  const cleanName = dishName.replace(/\([^)]*\)/g, '').trim();

  // 🥗 샐러드가 포함된 메뉴는 무조건 반찬으로 분류
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

  // 📢 공지사항 모달 상태 & 자동/수동 진입 구분 플래그
  const [showNotice, setShowNotice] = useState(false);
  const [isClosingNotice, setIsClosingNotice] = useState(false);
  const [neverShowNoticeChecked, setNeverShowNoticeChecked] = useState(false);
  const [isAutoNotice, setIsAutoNotice] = useState(false);

  // 📜 패치노트 모달 상태 & 자동/수동 진입 구분 플래그
  const [showPatchModal, setShowPatchModal] = useState(false);
  const [isClosingPatch, setIsClosingPatch] = useState(false);
  const [neverShowPatchChecked, setNeverShowPatchChecked] = useState(false);
  const [selectedPatchVersion, setSelectedPatchVersion] = useState(CURRENT_VERSION);
  const [isAutoPatch, setIsAutoPatch] = useState(false);

  const [pendingPatchShow, setPendingPatchShow] = useState(false);

  // 기타 모달 상태
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [isClosingAllergy, setIsClosingAllergy] = useState(false);

  const [selectedDishAllergy, setSelectedDishAllergy] = useState(null);
  const [isClosingDishAllergy, setIsClosingDishAllergy] = useState(false);

  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isClosingInstall, setIsClosingInstall] = useState(false);

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

  // 🍱 평가 관련 상태
  const [ratings, setRatings] = useState({ "야르킁킁": 0, "야르": 0, "먹을만함": 0, "그저그런": 0, "맛없음": 0 });
  const [userVotedRating, setUserVotedRating] = useState(null);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

  const formattedDateStr = getFormattedDate(currentDate);
  const todayStr = getFormattedDate(new Date());
  const isToday = formattedDateStr === todayStr;

  // 오늘 날짜와 선택된 날짜 간의 일수 차이 계산 (0 ~ 7일 이내 노출 여부 확인용)
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

  // 🔒 팝업 모달 활성화 시 우측 쏠림(Layout Shift) 완벽 방지 및 배경 스크롤 차단
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

  // 🔔 공지사항 및 패치노트 자동(강제) 팝업 감지 로직
  useEffect(() => {
    const hiddenNoticeId = localStorage.getItem('ygm_hide_notice_id');
    const hiddenPatchVersion = localStorage.getItem('ygm_hide_patch_version');

    const shouldShowNotice = hiddenNoticeId !== CURRENT_NOTICE_ID;
    const shouldShowPatch = hiddenPatchVersion !== CURRENT_VERSION;

    if (shouldShowNotice) {
      setIsAutoNotice(true); // 자동 팝업으로 오픈됨 표시
      setShowNotice(true);
      if (shouldShowPatch) {
        setPendingPatchShow(true);
      }
    } else if (shouldShowPatch) {
      setIsAutoPatch(true); // 자동 팝업으로 오픈됨 표시
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

  // 📊 평가 데이터 불러오기 및 로컬 투표 기록 확인
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

      if (nextTheme && webviewStep === 2) {
        setWebviewStep(1);
      } else if (!nextTheme && webviewStep === 1) {
        setWebviewStep(2);
      }

      return nextTheme;
    });
  };

  // 수동(드롭다운 메뉴)으로 공지사항 모달 오픈
  const openNoticeModal = () => {
    setIsAutoNotice(false); // 수동 오픈 표시
    const isNoticeHidden = localStorage.getItem('ygm_hide_notice_id') === CURRENT_NOTICE_ID;
    setNeverShowNoticeChecked(isNoticeHidden);
    setShowNotice(true);
    setIsMenuOpen(false);
  };

  // 수동(드롭다운 메뉴)으로 패치노트 모달 오픈
  const openPatchModal = () => {
    setIsAutoPatch(false); // 수동 오픈 표시
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
    
    triggerCloseAnimation(setIsClosingNotice, setShowNotice);

    if (pendingPatchShow) {
      setTimeout(() => {
        setIsAutoPatch(true); // 자동 팝업 패치노트 오픈
        setSelectedPatchVersion(CURRENT_VERSION);
        setShowPatchModal(true);
        setPendingPatchShow(false);
      }, 250);
    }
  };

  const handleClosePatch = () => {
    if (isAutoPatch && neverShowPatchChecked) {
      localStorage.setItem('ygm_hide_patch_version', CURRENT_VERSION);
    }
    triggerCloseAnimation(setIsClosingPatch, setShowPatchModal);
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

  // 주말/공휴일 자동 건너뛰기 날짜 변경 함수
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
    <div className={`min-h-screen transition-colors duration-200 selection:bg-blue-500 selection:text-white relative ${
      isDarkMode ? 'bg-neutral-950 text-neutral-50' : 'bg-slate-100 text-slate-900'
    }`}>
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

        @keyframes modalPopIn {
            0% { opacity: 0; transform: scale(0.92) translateY(12px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes modalPopOut {
            0% { opacity: 1; transform: scale(1) translateY(0); }
            100% { opacity: 0; transform: scale(0.92) translateY(10px); }
        }

        @keyframes backdropFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes backdropFadeOut { from { opacity: 1; } to { opacity: 0; } }

        @keyframes pulseGlow {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.15); opacity: 1; }
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .animate-modal-in { animation: modalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-modal-out { animation: modalPopOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-backdrop-in { animation: backdropFadeIn 0.25s ease-out forwards; }
        .animate-backdrop-out { animation: backdropFadeOut 0.2s ease-out forwards; }
        .animate-pulse-glow { animation: pulseGlow 1.8s ease-in-out infinite; }
        .animate-item-fade { animation: fadeInUp 0.3s ease-out forwards; }
      `}</style>

      {/* 📱 PWA 앱 설치 수동 안내 모달 */}
      {showInstallGuide && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md ${
          isClosingInstall ? 'animate-backdrop-out' : 'animate-backdrop-in'
        }`}>
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative ${
            isClosingInstall ? 'animate-modal-out' : 'animate-modal-in'
          } ${
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
                onClick={() => triggerCloseAnimation(setIsClosingInstall, setShowInstallGuide)}
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
                  사파리 하단 중앙의 <strong>공유 버튼(↑)</strong>을 누른 후 <strong>[홈 화면에 추가]</strong>를 선택하시면 됩니다.
                </p>
              </div>

              <div className={`p-3.5 rounded-2xl border ${
                isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="font-bold text-emerald-500 flex items-center gap-1.5 mb-1">
                  📱 안드로이드 (Chrome) 사용자
                </p>
                <p className="text-slate-600 dark:text-neutral-400">
                  브라우저 우측 상단 <strong>메뉴 버튼(⋮)</strong>을 누른 후 <strong>[앱 설치]</strong>를 클릭하세요.
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
              <button
                onClick={() => triggerCloseAnimation(setIsClosingInstall, setShowInstallGuide)}
                className="text-sm px-4 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📢 1. 공지사항 전용 독립 모달 (자동/수동 별 체크박스 분리) */}
      {showNotice && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md ${
          isClosingNotice ? 'animate-backdrop-out' : 'animate-backdrop-in'
        }`}>
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative ${
            isClosingNotice ? 'animate-modal-out' : 'animate-modal-in'
          } ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Megaphone className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-base sm:text-lg">서비스 공지사항</h2>
              </div>
              <button
                onClick={handleCloseNotice}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  공지
                </span>
                <h3 className="font-extrabold text-sm sm:text-base">서비스 이용 안내</h3>
              </div>

              <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed font-medium ${
                isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                오늘의 급식을 실시간으로 평가할 수 있는 급식 평가 기능이 추가되었습니다!
              </div>
            </div>

            {/* 푸터: 자동(강제) 팝업일 때만 [다시 보지 않기] 노출 */}
            <div className={`flex items-center ${isAutoNotice ? 'justify-between' : 'justify-end'} pt-4 border-t border-slate-200 dark:border-neutral-800`}>
              {isAutoNotice && (
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer select-none text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200">
                  <input
                    type="checkbox"
                    checked={neverShowNoticeChecked}
                    onChange={(e) => setNeverShowNoticeChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 cursor-pointer"
                  />
                  <span>다시 보지 않기</span>
                </label>
              )}

              <button
                onClick={handleCloseNotice}
                className="text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📜 2. 패치노트 전용 독립 모달 (자동/수동 별 체크박스 분리 & 애니메이션 깔끔 삭제) */}
      {showPatchModal && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md ${
          isClosingPatch ? 'animate-backdrop-out' : 'animate-backdrop-in'
        }`}>
          <div className={`w-full max-w-2xl max-h-[85vh] p-5 sm:p-6 rounded-3xl border shadow-2xl relative flex flex-col justify-between ${
            isClosingPatch ? 'animate-modal-out' : 'animate-modal-in'
          } ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* 헤더 */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-base sm:text-lg">패치노트 히스토리</h2>
              </div>
              <button
                onClick={handleClosePatch}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 본문 - 독립 스크롤 구조 (Left & Right) */}
            <div className="flex flex-col sm:flex-row gap-3 my-1 flex-1 min-h-0 overflow-hidden">
              
              {/* 좌측: 버전 목록 (버튼 세로 높이 h-9 완벽 고정) */}
              <div className="w-full sm:w-44 flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-x-hidden sm:overflow-y-auto shrink-0 pb-2 sm:pb-0 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-neutral-800 pr-0 sm:pr-3 max-h-[52px] sm:max-h-full">
                <div className="hidden sm:block my-1 text-[11px] font-bold text-slate-400 px-2 shrink-0">버전 목록</div>

                {PATCH_HISTORY.map((patch) => (
                  <button
                    key={patch.version}
                    onClick={() => setSelectedPatchVersion(patch.version)}
                    className={`h-9 min-h-[36px] max-h-[36px] px-3.5 rounded-xl font-bold text-xs sm:text-sm text-left flex items-center justify-between transition-colors shrink-0 whitespace-nowrap ${
                      selectedPatchVersion === patch.version
                        ? 'bg-blue-600 text-white shadow-md'
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
                  </button>
                ))}
              </div>

              {/* 우측: 선택된 패치노트 상세 내용 */}
              <div className="flex-1 min-h-0 overflow-y-auto pl-0 sm:pl-2 pt-1 sm:pt-0 pr-1">
                {(() => {
                  const patch = PATCH_HISTORY.find((p) => p.version === selectedPatchVersion);
                  if (!patch) return null;

                  return (
                    <div className="space-y-3 pr-1">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-neutral-800 pb-2">
                        <h3 className="font-extrabold text-sm sm:text-base text-blue-600 dark:text-blue-400">
                          {patch.title}
                        </h3>
                        <span className="text-xs text-slate-400 font-semibold shrink-0">{patch.date}</span>
                      </div>

                      <div className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-medium ${
                        isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <p className="font-bold text-xs text-slate-400 mb-2">변경 사항</p>
                        <ul className="list-disc list-inside space-y-1.5 pl-1">
                          {patch.changes.map((change, idx) => (
                            <li key={idx} className="leading-relaxed">{change}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* 푸터: 자동(강제) 팝업일 때만 [이 버전에서 다시 보지 않기] 노출 */}
            <div className={`flex items-center ${isAutoPatch ? 'justify-between' : 'justify-end'} pt-3 border-t border-slate-200 dark:border-neutral-800 shrink-0 mt-2`}>
              {isAutoPatch && (
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer select-none text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200">
                  <input
                    type="checkbox"
                    checked={neverShowPatchChecked}
                    onChange={(e) => setNeverShowPatchChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 cursor-pointer"
                  />
                  <span>이 버전에서 다시 보지 않기</span>
                </label>
              )}

              <button
                onClick={handleClosePatch}
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
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md ${
          isClosingDishAllergy ? 'animate-backdrop-out' : 'animate-backdrop-in'
        }`}>
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative ${
            isClosingDishAllergy ? 'animate-modal-out' : 'animate-modal-in'
          } ${
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
                onClick={() => triggerCloseAnimation(setIsClosingDishAllergy, setSelectedDishAllergy)}
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
                onClick={() => triggerCloseAnimation(setIsClosingDishAllergy, setSelectedDishAllergy)}
                className="text-sm px-4 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧬 전체 알러지 정보 모달 */}
      {showAllergyModal && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md ${
          isClosingAllergy ? 'animate-backdrop-out' : 'animate-backdrop-in'
        }`}>
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl relative ${
            isClosingAllergy ? 'animate-modal-out' : 'animate-modal-in'
          } ${
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
                onClick={() => triggerCloseAnimation(setIsClosingAllergy, setShowAllergyModal)}
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
                onClick={() => triggerCloseAnimation(setIsClosingAllergy, setShowAllergyModal)}
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
            {/* 📲 PWA [앱 설치] 아이콘 단독 버튼 */}
            {!isStandalone && (
              <button
                onClick={handleInstallClick}
                className="p-2.5 rounded-xl border flex items-center justify-center bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all active:scale-95"
                title="앱으로 설치하기"
              >
                <Download className="w-4.5 h-4.5" />
              </button>
            )}

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
                    <span>공지사항</span>
                  </button>

                  <button
                    onClick={openPatchModal}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors ${
                      isDarkMode ? 'hover:bg-neutral-800 text-purple-400' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-purple-500" />
                    <span>패치노트</span>
                  </button>
                </div>
              )}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          
          {/* 🍽️ 급식표 Card */}
          <div className={`p-5 sm:p-6 rounded-3xl border flex flex-col justify-between ${
            activeTab === 'meal' ? 'block' : 'hidden md:block'
          } ${
            isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div>
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

              <div className={`p-3 rounded-2xl border mb-3 flex items-center justify-between gap-2 ${
                isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div 
                  onClick={openDatePicker}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity select-none flex-wrap"
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

              {meal.calories && !mealLoading && (
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

              {mealLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
                    <Sparkles className="w-4 h-4 text-orange-500 absolute animate-pulse" />
                  </div>
                  <span className="text-sm font-bold text-slate-600 dark:text-neutral-300">급식 데이터 로딩 중...</span>
                </div>
              ) : meal.menuItems && meal.menuItems.length > 0 ? (
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

              {/* 🗳️ 최근 7일 이내(0~7일 전) 날짜인 경우 데이터 존재 여부 상관없이 상시 노출 */}
              {isWithin7Days && (
                <div className={`mt-5 p-4 rounded-2xl border ${
                  isDarkMode ? 'bg-neutral-950/90 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                      <span>🍱 오늘의 급식 평가</span>
                      {totalVotes > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold">
                          {totalVotes}명 참여
                        </span>
                      )}
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

              {webviewStep === 2 && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-white h-[420px] sm:h-[450px] relative w-full">
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

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold text-xs">출처: 컴시간알리미</span>
            </div>
          </div>

        </div>

        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1 font-medium">
          <Info className="w-3.5 h-3.5" />
          <span>Domain: ygmhelper.xyz | YGM 전용 스마트 스쿨 도우미</span>
        </div>
      </main>
    </div>
  );
}