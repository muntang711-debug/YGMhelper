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
  Flame,
  Zap,
  Crown,
  Rocket
} from 'lucide-react';
import { fetchMealSchedule, getFormattedDate } from './services/neisApi';

// 앱 현재 버전 및 공지사항 고유 ID
const CURRENT_VERSION = '1.2.12';
const CURRENT_NOTICE_ID = 'notice_2026_08_22_rating_feature';

// 극락의 최신 도파민 MZ 평가 옵션 리스트
const RATING_OPTIONS = [
  { label: 'GOAT야르', icon: Crown, color: 'text-amber-400 border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 hover:from-amber-500/30 shadow-lg shadow-amber-500/20' },
  { label: '도파민극락', icon: Flame, color: 'text-pink-500 border-pink-500/40 bg-gradient-to-r from-pink-500/20 to-rose-500/20 hover:from-pink-500/30 shadow-lg shadow-pink-500/20' },
  { label: '알잘딱', icon: ThumbsUp, color: 'text-blue-400 border-blue-500/40 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 shadow-lg shadow-blue-500/20' },
  { label: '음...', icon: Meh, color: 'text-slate-400 border-slate-500/40 bg-slate-800/40 hover:bg-slate-700/50 shadow-md' },
  { label: '억까임', icon: Frown, color: 'text-rose-500 border-rose-500/40 bg-gradient-to-r from-rose-500/20 to-red-600/20 hover:from-rose-500/30 shadow-lg shadow-rose-500/20' }
];

// 패치노트 전체 히스토리 데이터베이스 (v1.0.0 ~ v1.2.12 완전 보존)
const PATCH_HISTORY = [
  {
    version: '1.2.12',
    date: '2026.08.28',
    title: '버전 1.2.12 패치노트: 버전 1.2.12 폭발적 반영 & 초화려 3D 네온 글로우 모션 극락 탑재 + 최신 도파민 MZ 어휘(GOAT/폼미쳤다/알잘딱) 풀충전⚡️🔥',
    changes: [
      '시맨틱 버저닝 1.2.12 정밀 연장 세팅 완료',
      '모든 주요 버튼 및 헤더에 3D 네온 글로우 오로라 이펙트 & 무지개 그라데이션 타이포그래피 적용',
      '최신 MZ 서브컬처 용어(GOAT야르, 도파민극락, 알잘딱, 억까임, 폼 미쳤다, 개추) 풀충전',
      '버튼 터치 시 통통 튀는 3D 스케일+스프링 타격감 및 발광 파티클 연출 극대화',
      '모바일 글래스모피즘 스티키 탭 바 & PC 컴시간 시간표 스티키 추적 고정 완전 유지',
      'v1.0.0부터 전 과거 버전 패치노트 내역 누락 없이 완전 보존'
    ]
  },
  {
    version: '1.2.11',
    date: '2026.08.28',
    title: '버전 1.2.11 패치노트: 버전 1.2.11 연속 정규 반영 & 야르 텐션 억샘 보강 및 최신 MZ 서브컬처 도파민 이펙트 극락 개편⚡️',
    changes: [
      '시맨틱 버저닝 연장선상에 따른 1.2.11 버전 정밀 반영 완료',
      '야르 감성 중심의 최신 서브컬처 도파민 멘트 및 인터랙션 반응 속도 극락 보강',
      '모바일 전용 독점 글래스모피즘 스티키 바 및 PC 시간표 스티키 추적 고정 완전 유지',
      'v1.0.0부터 v1.2.11까지의 모든 과거 패치노트 히스토리 누락 없이 원형 보존'
    ]
  },
  {
    version: '1.2.10',
    date: '2026.08.28',
    title: '버전 1.2.10 패치노트: 버전 1.2.10 정규 반영 & 지나간 어휘(스근/쌈뽕) 퇴출 및 야르 텐션 전면 주입 + 3D 글래스 글로우 모션 극락 개편⚡️',
    changes: [
      '시맨틱 버저닝 사양에 맞춘 1.2.10 버저닝 세팅 완료',
      '트렌드 지난 어휘(스근, 쌈뽕) 전면 퇴출 및 야르 중심의 도파민 멘트 대폭 내장',
      '모바일 전용 독점 글래스모피즘 스티키 탭 바 & PC 시간표 상단 밀착 스티키 완벽 작동',
      '모든 버튼/카드에 고탄성 3D 회전 스프링 타격감 및 네온 빛 반응 애니메이션 추가 강화',
      'v1.0.0부터 전체 패치노트 히스토리 원형 복원 및 유지'
    ]
  },
  {
    version: '1.2.9',
    date: '2026.08.28',
    title: '버전 1.2.9 패치노트: 모바일 스티키 바 글래스모피즘 CSS 전면 복구 & 컴시간 카드 스티키 밀착 + v1.0.0 전 버전 패치노트 완전 복원 & 3D 도파민 모션 극락 보강⚡️',
    changes: [
      '모바일 상단 탭 바 스크롤 고정(sticky top-16) 시 단색 뭉개짐 방지를 위한 고급 블러 글래스모피즘 CSS 복원',
      'PC/태블릿 스크롤 시 급식표 길이에 맞춰 컴시간 시간표 카드가 따라오는 sticky top-20 스티키 포지션 정밀 밀착',
      'v1.0.0부터 v1.2.8까지 축약되었던 전 과거 버전 패치노트 내역을 누락 없이 원형 그대로 완전 복구',
      '3D 파라락스 틸트 및 버튼 통통 튀는 학사모 스프링 회전 모션 대폭 보강'
    ]
  },
  {
    version: '1.2.8',
    date: '2026.08.28',
    title: '버전 1.2.8 패치노트: 모바일 탭 바 & 컴시간 시간표 스티키 완벽 밀착 + 전 팝업/버튼 3D 틸트 및 회전 스프링 모션 극락 개편⚡️',
    changes: [
      '모바일 상단 서비스 선택 탭 바 스크롤 고정 (sticky top-16) & 네온 발광 강조 이펙트 적용',
      'PC/태블릿 스크롤 시 컴시간 시간표 카드가 따라오는 스티키 (sticky top-20) 밀착 완',
      '모든 모달 팝업창(공지, 패치노트, 알러지 등) 및 카드에 마우스 3D 시선 추적 파라락스 틸트 전면 적용',
      '모든 버튼에 학사모 스타일 통통 튀는 3D 회전+스프링 타격감 애니메이션 통합 구현'
    ]
  },
  {
    version: '1.2.7',
    date: '2026.08.28',
    title: '버전 1.2.7 패치노트: PC/태블릿 대화면 와이드 풀 스크린 & 스크롤 연동 시간표 스티키 & 3D 시선 추적 파라락스 모션 대개편⚡️',
    changes: [
      '마우스 위치에 따라 시선이 입체적으로 기울어지는 3D 파라락스 인터랙티브 적용',
      '스크롤 시 시간표 카드가 화면에 자연스럽게 고정되어 따라오는 스티키 시스템 구현',
      '모바일 크롬 주소창 느낌의 스마트 스크롤 감지 헤더 & 와이드 풀스크린 가로 폭 확장',
      '반복 단어 정리 및 한층 새로워진 도파민 폭발 서브컬처 멘트 반영'
    ]
  },
  {
    version: '1.2.6',
    date: '2026.08.28',
    title: "버전 1.2.6 패치노트: 어지러운 마우스 파티클 & 카드 들썩임 억까 적출! 모바일 초화려 네온 모션 폭발⚡️",
    changes: [
      "마우스 잔상 파티클 및 카드 Y축 들썩임 완전 삭제",
      "모바일/데스크톱 탭 전환 및 카드 내 3D 에어로 글로우 스프링 모션 강화",
      "버튼 터치 타격감 및 네온 배지 애니메이션 감성 충전 완"
    ]
  },
  {
    version: '1.2.5',
    date: '2026.08.28',
    title: "버전 1.2.5 패치노트: '맛없음' -> '억까' 전면 개편 & 네온 파티클 폭발 마우스 트래킹⚡️🔥",
    changes: [
      "급식 평가 기존 '맛없음' 키워드를 '억까'로 알잘딱깔센 변경 완료",
      "마우스 궤적 잔상 네온 파티클 & 클릭 폭발 파티클 시스템 탑재",
      "UI 전반 멘트 MZ식 트렌디 감성으로 전면 패치 완료"
    ]
  },
  {
    version: '1.2.4',
    date: '2026.08.28',
    title: '버전 1.2.4 업데이트: package-lock.json 의존성 버전 정밀 맞춤 패치',
    changes: [
      'motion 라이브러리 버전을 12.43.0 표준 사양으로 정밀 동기화',
      '배포 서버 npm ci 락파일 충돌 에러 완전 방지 패치 완'
    ]
  },
  {
    version: '1.2.3',
    date: '2026.08.28',
    title: '버전 1.2.3 업데이트: motion/react 전면 이관',
    changes: [
      'motion/react 라이브러리로 전체 모션 시스템 이관',
      '공지사항 및 패치노트 멘트 개편'
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
      return isDark ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-lg shadow-pink-500/20 animate-pulse' : 'bg-pink-100 text-pink-700 border-pink-300 shadow-sm';
    case '음료':
      return isDark ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-500/20' : 'bg-cyan-100 text-cyan-700 border-cyan-300 shadow-sm';
    case '과일':
      return isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-lg shadow-rose-500/20' : 'bg-rose-100 text-rose-700 border-rose-300 shadow-sm';
    case '밥':
      return isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-lg shadow-blue-500/20' : 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm';
    case '국':
      return isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/20' : 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm';
    default:
      return isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm';
  }
};

// 🎯 초화려 3D 네온 파라락스 틸트 컴포넌트
const TiltCard = ({ children, className = '' }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ type: "spring", stiffness: 450, damping: 18 }}
      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// motion/react 초화려 고탄성 모달 애니메이션 옵션
const modalOverlayVariants = {
  hidden: { opacity: 0, backdropFilter: "blur(0px)" },
  visible: { opacity: 1, backdropFilter: "blur(12px)", transition: { duration: 0.25 } },
  exit: { opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.2 } }
};

const modalContentVariants = {
  hidden: { opacity: 0, scale: 0.5, y: 80, rotateX: 35 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    rotateX: 0,
    transition: { type: "spring", stiffness: 520, damping: 20 } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.6, 
    y: 40, 
    transition: { duration: 0.18 } 
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
  hidden: { opacity: 0, y: 25, scale: 0.85, rotateX: -15 },
  show: { opacity: 1, y: 0, scale: 1, rotateX: 0, transition: { type: "spring", stiffness: 550, damping: 18 } }
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
  const [ratings, setRatings] = useState({ "GOAT야르": 0, "도파민극락": 0, "알잘딱": 0, "음...": 0, "억까임": 0 });
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
        setRatings({ "GOAT야르": 0, "도파민극락": 0, "알잘딱": 0, "음...": 0, "억까임": 0 });
      }
    } catch (err) {
      console.error('Failed to load ratings:', err);
      setRatings({ "GOAT야르": 0, "도파민극락": 0, "알잘딱": 0, "음...": 0, "억까임": 0 });
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
    <div className={`min-h-screen transition-colors duration-300 selection:bg-purple-500 selection:text-white relative overflow-x-hidden ${
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          >
            <TiltCard className="w-full max-w-md">
              <motion.div 
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`w-full p-6 rounded-3xl border shadow-2xl relative ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
                  <div className="flex items-center gap-2.5">
                    <motion.div 
                      whileHover={{ scale: 1.3, rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 cursor-pointer"
                    >
                      <Download className="w-5 h-5" />
                    </motion.div>
                    <h2 className="font-extrabold text-base bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">📲 YGMhelper 앱 설치 폼미쳤다!</h2>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.3, rotate: 90 }}
                    whileTap={{ scale: 0.8 }}
                    onClick={() => setShowInstallGuide(false)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="space-y-4 text-sm font-medium leading-relaxed">
                  <motion.div 
                    whileHover={{ scale: 1.05, x: 5 }}
                    className={`p-4 rounded-2xl border ${
                      isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <p className="font-extrabold text-blue-500 flex items-center gap-1.5 mb-1">
                      <Share className="w-4 h-4" /> 아이폰 (iOS Safari)
                    </p>
                    <p className="text-slate-600 dark:text-neutral-400">
                      사파리 하단 <strong>공유 아이콘(↑)</strong> 누르고 <strong>[홈 화면에 추가]</strong> 클릭시 야르 극락 세팅 완료!
                    </p>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.05, x: 5 }}
                    className={`p-4 rounded-2xl border ${
                      isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <p className="font-extrabold text-emerald-500 flex items-center gap-1.5 mb-1">
                      📱 안드로이드 (Chrome)
                    </p>
                    <p className="text-slate-600 dark:text-neutral-400">
                      우상단 <strong>메뉴(⋮)</strong> 클릭 후 <strong>[앱 설치]</strong> 누르면 즉시 도파민 앱 생성 야르!
                    </p>
                  </motion.div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0], boxShadow: "0px 0px 25px rgba(59, 130, 246, 0.8)" }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setShowInstallGuide(false)}
                    className="text-sm px-5 py-2.5 rounded-2xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl transition-all"
                  >
                    야르~ 도파민 세팅 확인
                  </motion.button>
                </div>
              </motion.div>
            </TiltCard>
          </motion.div>
        )}

        {/* 📢 1. 공지사항 모달 */}
        {showNotice && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          >
            <TiltCard className="w-full max-w-md">
              <motion.div 
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`w-full p-6 rounded-3xl border shadow-2xl relative ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
                  <div className="flex items-center gap-2.5">
                    <motion.div 
                      animate={{ scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 cursor-pointer"
                    >
                      <Megaphone className="w-5 h-5" />
                    </motion.div>
                    <h2 className="font-black text-base sm:text-lg bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">📢 초긴급 도파민 공지! (GOAT)</h2>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.3, rotate: 90 }}
                    whileTap={{ scale: 0.8 }}
                    onClick={handleCloseNotice}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/30">
                      HOT 도파민
                    </span>
                    <h3 className="font-extrabold text-sm sm:text-base">오늘의 급식 실시간 도파민 평가 개시!</h3>
                  </div>

                  <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed font-medium ${
                    isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    오늘 급식 솔직한 후기! GOAT야르부터 억까임까지 알잘딱깔센하게 투표하고 도파민 챙기세요!🔥
                  </div>
                </div>

                <div className={`flex items-center ${isAutoNotice ? 'justify-between' : 'justify-end'} pt-4 border-t border-slate-200 dark:border-neutral-800`}>
                  {isAutoNotice && (
                    <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer select-none text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200">
                      <input
                        type="checkbox"
                        checked={neverShowNoticeChecked}
                        onChange={(e) => setNeverShowNoticeChecked(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 cursor-pointer"
                      />
                      <span>억까 방지 (다시 안 보기)</span>
                    </label>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.15, rotate: [0, -4, 4, 0], boxShadow: "0px 0px 25px rgba(168, 85, 247, 0.8)" }}
                    whileTap={{ scale: 0.85 }}
                    onClick={handleCloseNotice}
                    className="text-xs sm:text-sm px-5 py-2.5 rounded-2xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-xl transition-all"
                  >
                    야르~ 개추 누르고 확인
                  </motion.button>
                </div>
              </motion.div>
            </TiltCard>
          </motion.div>
        )}

        {/* 📜 2. 패치노트 모달 */}
        {showPatchModal && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70"
          >
            <TiltCard className="w-full max-w-2xl">
              <motion.div 
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`w-full max-h-[85vh] p-5 sm:p-6 rounded-3xl border shadow-2xl relative flex flex-col justify-between ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h2 className="font-black text-base sm:text-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">📜 폼 미친 패치노트 히스토리</h2>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.3, rotate: 90 }}
                    whileTap={{ scale: 0.8 }}
                    onClick={handleClosePatch}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 my-1 flex-1 min-h-0 overflow-hidden">
                  <div className="w-full sm:w-44 flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-x-hidden sm:overflow-y-auto shrink-0 pb-2 sm:pb-0 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-neutral-800 pr-0 sm:pr-3 max-h-[52px] sm:max-h-full">
                    <div className="hidden sm:block my-1 text-[11px] font-black text-purple-400 uppercase tracking-wider px-2 shrink-0">버전 히스토리</div>

                    {PATCH_HISTORY.map((patch) => (
                      <motion.button
                        key={patch.version}
                        whileHover={{ scale: 1.1, x: 6, rotate: [0, -2, 2, 0] }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSelectedPatchVersion(patch.version)}
                        className={`h-9 min-h-[36px] max-h-[36px] px-3.5 rounded-xl font-extrabold text-xs sm:text-sm text-left flex items-center justify-between transition-all shrink-0 whitespace-nowrap ${
                          selectedPatchVersion === patch.version
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                            : isDarkMode ? 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300' : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 opacity-70 shrink-0" />
                          <span>v{patch.version}</span>
                        </div>
                        {patch.version === CURRENT_VERSION && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-gradient-to-r from-amber-400 to-yellow-400 text-neutral-900 font-black shrink-0 ml-1.5 shadow-sm">NEW</span>
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
                          initial={{ opacity: 0, x: 25, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                          className="space-y-3 pr-1"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-neutral-800 pb-2">
                            <h3 className="font-black text-sm sm:text-base text-purple-600 dark:text-purple-400">
                              {patch.title}
                            </h3>
                            <span className="text-xs text-slate-400 font-bold shrink-0">{patch.date}</span>
                          </div>

                          <div className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium ${
                            isDarkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            <p className="font-extrabold text-xs text-purple-400 mb-2 flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 fill-purple-400" /> 도파민 패치 핵심 요약
                            </p>
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
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 cursor-pointer"
                      />
                      <span>이 버전 끄기</span>
                    </label>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.15, rotate: [0, -4, 4, 0], boxShadow: "0px 0px 25px rgba(99, 102, 241, 0.8)" }}
                    whileTap={{ scale: 0.85 }}
                    onClick={handleClosePatch}
                    className="text-xs sm:text-sm px-5 py-2.5 rounded-2xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl transition-all"
                  >
                    야르~ 확인완료
                  </motion.button>
                </div>
              </motion.div>
            </TiltCard>
          </motion.div>
        )}

        {/* 🔍 개별 알러지 모달 */}
        {selectedDishAllergy && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          >
            <TiltCard className="w-full max-w-md">
              <motion.div 
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`w-full p-6 rounded-3xl border shadow-2xl relative ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30">
                      <Info className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-base sm:text-lg">{selectedDishAllergy.dishName}</h2>
                      <p className="text-xs text-amber-500 font-bold">알러지 요소 정밀 체크</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.3, rotate: 90 }}
                    whileTap={{ scale: 0.8 }}
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
                          initial={{ opacity: 0, x: -20, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 18, delay: idx * 0.02 }}
                          className={`p-3 rounded-2xl border font-bold text-sm flex items-center gap-3 ${
                            isDarkMode ? 'bg-neutral-950 border-neutral-800 text-amber-400' : 'bg-amber-50/80 border-amber-200 text-amber-900'
                          }`}
                        >
                          <span className="w-7 h-7 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-xs font-black text-white shadow-sm shrink-0">
                            {cleanNum}
                          </span>
                          <span>{allergyName}</span>
                        </motion.div>
                      );
                    })}
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.15, rotate: [0, -4, 4, 0], boxShadow: "0px 0px 25px rgba(245, 158, 11, 0.8)" }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setSelectedDishAllergy(null)}
                    className="text-sm px-5 py-2.5 rounded-2xl font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl transition-all"
                  >
                    야르~ 체크완료
                  </motion.button>
                </div>
              </motion.div>
            </TiltCard>
          </motion.div>
        )}

        {/* 🧬 전체 알러지 정보 모달 */}
        {showAllergyModal && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          >
            <TiltCard className="w-full max-w-md">
              <motion.div 
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`w-full p-6 rounded-3xl border shadow-2xl relative ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30">
                      <Info className="w-5 h-5" />
                    </div>
                    <h2 className="font-extrabold text-base bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">전체 알러지 성분 알잘딱 정리</h2>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.3, rotate: 90 }}
                    whileTap={{ scale: 0.8 }}
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
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 480, damping: 16, delay: idx * 0.01 }}
                      className={`p-2.5 rounded-xl border font-bold ${
                        isDarkMode ? 'bg-neutral-950/80 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {item}
                    </motion.div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.15, rotate: [0, -4, 4, 0], boxShadow: "0px 0px 25px rgba(249, 115, 22, 0.8)" }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setShowAllergyModal(false)}
                    className="text-sm px-5 py-2.5 rounded-2xl font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xl transition-all"
                  >
                    야르~ 확인
                  </motion.button>
                </div>
              </motion.div>
            </TiltCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📱 상단 네비게이션 헤더 */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-xl transition-all ${
        isDarkMode ? 'bg-neutral-900/85 border-neutral-800/80' : 'bg-white/85 border-slate-200/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 20 }}
            className="flex items-center gap-2.5"
          >
            <motion.div 
              whileHover={{ rotate: [0, -30, 30, -15, 0], scale: 1.35, boxShadow: "0px 0px 25px rgba(59, 130, 246, 0.9)" }}
              whileTap={{ scale: 0.8 }}
              transition={{ duration: 0.35 }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 cursor-pointer"
            >
              <GraduationCap className="w-6 h-6" />
            </motion.div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-lg tracking-tight bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
                  YGMhelper
                </h1>
                <motion.span 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-[10px] px-2 py-0.5 rounded-lg font-black bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/20"
                >
                  GOAT
                </motion.span>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center gap-2">
            {!isStandalone && (
              <motion.button
                whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0], boxShadow: "0px 0px 20px rgba(59, 130, 246, 0.7)" }}
                whileTap={{ scale: 0.8 }}
                onClick={handleInstallClick}
                className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 transition-all"
                title="앱으로 설치하기"
              >
                <Download className="w-4.5 h-4.5" />
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.2, rotate: 45, boxShadow: "0px 0px 20px rgba(245, 158, 11, 0.7)" }}
              whileTap={{ scale: 0.8 }}
              onClick={toggleDarkMode}
              className={`p-2.5 rounded-2xl border transition-all ${
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
                whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                whileTap={{ scale: 0.8 }}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={`p-2.5 rounded-2xl border flex items-center gap-1 transition-all ${
                  isDarkMode 
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700' 
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
                }`}
                title="메뉴 열기"
              >
                <ChevronDown className={`w-4.5 h-4.5 transition-transform duration-300 ${isMenuOpen ? 'rotate-180 text-purple-500' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -15, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 550, damping: 20 }}
                    className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-2xl p-1.5 z-50 ${
                      isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-200' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <motion.button
                      whileHover={{ scale: 1.1, x: 6, rotate: [0, -3, 3, 0] }}
                      whileTap={{ scale: 0.9 }}
                      onClick={openNoticeModal}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
                        isDarkMode ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Megaphone className="w-4 h-4 text-purple-500" />
                      <span>공지사항</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.1, x: 6, rotate: [0, -3, 3, 0] }}
                      whileTap={{ scale: 0.9 }}
                      onClick={openPatchModal}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all ${
                        isDarkMode ? 'hover:bg-neutral-800 text-pink-400' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-pink-500" />
                      <span>패치노트</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* 🖥️ 풀 와이드 메인 영역 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* 📱 모바일 스티키 탭 바 (sticky top-16 z-40) */}
        <div className={`relative flex md:hidden p-1.5 mb-4 rounded-2xl sticky top-16 z-40 transition-all duration-300 backdrop-blur-xl backdrop-saturate-180 shadow-2xl ${
          isDarkMode 
            ? 'bg-neutral-900/75 border border-white/10 shadow-neutral-950/80 ring-1 ring-white/10' 
            : 'bg-white/75 border border-white/40 shadow-slate-300/60 ring-1 ring-black/5'
        }`}>
          <motion.div 
            layout
            transition={{ type: "spring", stiffness: 550, damping: 28 }}
            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] rounded-xl shadow-lg ${
              activeTab === 'meal' ? 'left-1.5' : 'left-[calc(50%+0.1875rem)]'
            } ${
              isDarkMode ? 'bg-gradient-to-r from-neutral-800 to-neutral-700 ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-200'
            }`}
          />

          <motion.button
            whileTap={{ scale: 0.9, rotate: -2 }}
            onClick={() => setActiveTab('meal')}
            className={`relative z-10 flex-1 py-3 font-black text-base flex items-center justify-center gap-2 transition-colors duration-200 ${
              activeTab === 'meal'
                ? isDarkMode ? 'text-white' : 'text-slate-900'
                : isDarkMode ? 'text-neutral-400' : 'text-slate-600'
            }`}
          >
            <Utensils className="w-5 h-5 text-orange-500 animate-pulse" />
            <span>급식표</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9, rotate: 2 }}
            onClick={() => setActiveTab('schedule')}
            className={`relative z-10 flex-1 py-3 font-black text-base flex items-center justify-center gap-2 transition-colors duration-200 ${
              activeTab === 'schedule'
                ? isDarkMode ? 'text-white' : 'text-slate-900'
                : isDarkMode ? 'text-neutral-400' : 'text-slate-600'
            }`}
          >
            <BookOpen className="w-5 h-5 text-purple-500 animate-pulse" />
            <span>실시간 시간표</span>
          </motion.button>
        </div>

        {/* 💻 PC/태블릿 12컬럼 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 🍽️ 급식표 Card */}
          <TiltCard className={`lg:col-span-7 ${activeTab === 'meal' ? 'block' : 'hidden md:block'}`}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 20 }}
              className={`p-5 sm:p-7 rounded-3xl border flex flex-col justify-between h-full ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <div className={`flex items-center justify-between pb-3.5 border-b mb-4 ${
                  isDarkMode ? 'border-neutral-800' : 'border-slate-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <motion.div 
                      whileHover={{ scale: 1.35, rotate: [0, -20, 20, 0], boxShadow: "0px 0px 25px rgba(249, 115, 22, 0.9)" }}
                      whileTap={{ scale: 0.8 }}
                      className="p-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 cursor-pointer"
                    >
                      <Utensils className="w-5.5 h-5.5" />
                    </motion.div>
                    <div>
                      <h2 className="font-black text-base sm:text-lg bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
                        지리는 급식 라인업 (GOAT야르)
                      </h2>
                      <p className={`text-xs font-bold ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>YGM 극락 맛도리 식단표</p>
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border mb-3 flex items-center justify-between gap-2 ${
                  isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <motion.div 
                    whileHover={{ scale: 1.08, rotate: [0, -2, 2, 0] }}
                    whileTap={{ scale: 0.92 }}
                    onClick={openDatePicker}
                    className="flex items-center gap-2 cursor-pointer select-none flex-wrap"
                  >
                    <CalendarIcon className="w-5 h-5 shrink-0 text-purple-500 animate-pulse" />
                    <span className={`text-sm sm:text-base font-black tracking-tight ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {currentDate.getFullYear()}.{currentDate.getMonth() + 1}.{currentDate.getDate()}
                    </span>
                    <motion.span 
                      whileHover={{ scale: 1.25 }}
                      className="text-xs px-2.5 py-0.5 rounded-lg font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20"
                    >
                      {['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()]}
                    </motion.span>

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
                      whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0], boxShadow: "0px 0px 20px rgba(168, 85, 247, 0.5)" }}
                      whileTap={{ scale: 0.85 }}
                      onClick={resetToToday}
                      className={`text-xs sm:text-sm px-3.5 py-2 rounded-xl font-black border transition-all ${
                        isDarkMode 
                          ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200' 
                          : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                      오늘
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.25, x: -4, rotate: -15 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => changeDate(-1)}
                      className={`p-2 rounded-xl border transition-all ${
                        isDarkMode 
                          ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                          : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                      }`}
                      title="이전 평일"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.25, x: 4, rotate: 15 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => changeDate(1)}
                      className={`p-2 rounded-xl border transition-all ${
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
                    <span className={`text-xs sm:text-sm font-bold ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                      총 칼로리 (벌크업 스펙)
                    </span>
                    <motion.span 
                      whileHover={{ scale: 1.2, rotate: [0, -4, 4, 0] }}
                      className="text-xs sm:text-sm px-3.5 py-1 rounded-full font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                    >
                      {meal.calories}
                    </motion.span>
                  </div>
                )}

                {mealLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="relative flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
                      <Sparkles className="w-6 h-6 text-orange-500 absolute animate-pulse" />
                    </div>
                    <span className="text-sm font-black text-transparent bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text animate-pulse">
                      야르~ 급식 도파민 데이터 획득 중...
                    </span>
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
                          whileHover={{ scale: 1.04, x: 8, transition: { type: "spring", stiffness: 550, damping: 16 } }}
                          whileTap={{ scale: 0.95 }}
                          className={`px-4 py-3.5 sm:py-4 rounded-2xl border flex items-center justify-between gap-3 shadow-md transition-all cursor-pointer ${
                            isDarkMode 
                              ? 'bg-neutral-950/80 border-neutral-800/80 hover:border-purple-500/40' 
                              : 'bg-slate-50 border-slate-200/80 hover:border-purple-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                            <span className={`font-black text-base sm:text-lg leading-snug ${
                              isDarkMode ? 'text-white' : 'text-slate-900'
                            }`}>
                              {dish.name}
                            </span>
                            <motion.span 
                              whileHover={{ scale: 1.25, rotate: [0, -5, 5, 0] }}
                              className={`text-xs font-black px-2.5 py-0.5 rounded-lg border self-start sm:self-auto ${badgeClass}`}
                            >
                              {category}
                            </motion.span>
                          </div>

                          {dish.allergy && (
                            <motion.button
                              whileHover={{ scale: 1.2, rotate: [0, -5, 5, 0], boxShadow: "0px 0px 15px rgba(245, 158, 11, 0.6)" }}
                              whileTap={{ scale: 0.8 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDishAllergy({ dishName: dish.name, allergyStr: dish.allergy });
                              }}
                              className={`text-xs font-extrabold px-2.5 py-1.5 rounded-xl border shrink-0 transition-all ${
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
                  <div className={`p-12 rounded-2xl text-center text-sm font-extrabold ${
                    isDarkMode ? 'bg-neutral-950/60 text-neutral-400' : 'bg-slate-50 text-slate-500'
                  }`}>
                    급식 정보가 없습니다. (오늘 휴교이거나 NEIS 점검 중!)
                  </div>
                )}

                {/* 🗳️ 실시간 도파민 평가 섹션 */}
                {isWithin7Days && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.08 }}
                    className={`mt-6 p-4 rounded-2xl border ${
                      isDarkMode ? 'bg-neutral-950/90 border-neutral-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs sm:text-sm font-black flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                        <span>🍱 실시간 급식 도파민 평가</span>
                        {totalVotes > 0 && (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black shadow-md shadow-purple-500/20">
                            {totalVotes}명 참전
                          </span>
                        )}
                      </span>
                      {!isToday ? (
                        <span className="text-[11px] text-amber-500 font-black">오늘 급식만 참여 가능</span>
                      ) : userVotedRating ? (
                        <span className="text-xs text-emerald-400 font-black">✓ 투표 완료</span>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                      {RATING_OPTIONS.map((opt) => {
                        const IconComponent = opt.icon;
                        const count = ratings[opt.label] || 0;
                        const isSelected = userVotedRating === opt.label;
                        const isDisabled = !isToday || Boolean(userVotedRating) || isRatingSubmitting;

                        return (
                          <motion.button
                            key={opt.label}
                            whileHover={!isDisabled ? { scale: 1.25, rotate: [0, -8, 8, 0], transition: { type: "spring", stiffness: 600 } } : {}}
                            whileTap={!isDisabled ? { scale: 0.75 } : {}}
                            onClick={() => handleVoteRating(opt.label)}
                            disabled={isDisabled}
                            className={`px-1 py-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all min-w-0 shadow-md ${
                              isSelected 
                                ? 'ring-2 ring-purple-500 border-purple-500 font-black shadow-xl shadow-purple-500/30' 
                                : opt.color
                            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <IconComponent className="w-5 h-5 shrink-0" />
                            <span className="text-[10px] sm:text-[11px] font-black leading-none whitespace-nowrap tracking-tighter">
                              {opt.label}
                            </span>
                            <span className="text-[9px] sm:text-[10px] font-black opacity-80">{count}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                <motion.button
                  whileHover={{ scale: 1.12, rotate: [0, -3, 3, 0], boxShadow: "0px 0px 20px rgba(249, 115, 22, 0.6)" }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setShowAllergyModal(true)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4.5 py-3 rounded-2xl font-black text-xs sm:text-sm border transition-all ${
                    isDarkMode 
                      ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Info className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>알러지 알잘딱 정돈</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.12, rotate: [0, -3, 3, 0], boxShadow: "0px 0px 20px rgba(59, 130, 246, 0.6)" }}
                  whileTap={{ scale: 0.88 }}
                  onClick={loadMealData}
                  disabled={mealLoading}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4.5 py-3 rounded-2xl font-black text-xs sm:text-sm border transition-all ${
                    isDarkMode 
                      ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <RotateCcw className={`w-4 h-4 text-blue-500 shrink-0 ${mealLoading ? 'animate-spin' : ''}`} />
                  <span>다시 당겨오기</span>
                </motion.button>
              </div>
            </motion.div>
          </TiltCard>

          {/* 📚 시간표 Card (스크롤 시 상단 추적 고정 sticky top-20 z-30 self-start) */}
          <div className={`lg:col-span-5 sticky top-20 z-30 self-start ${activeTab === 'schedule' ? 'block' : 'hidden md:block'}`}>
            <TiltCard>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 20, delay: 0.05 }}
                className={`p-5 sm:p-7 rounded-3xl border flex flex-col justify-between ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div>
                  <div className={`flex items-center justify-between pb-3.5 border-b mb-4 ${
                    isDarkMode ? 'border-neutral-800' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <motion.div 
                        whileHover={{ scale: 1.35, rotate: [0, -20, 20, 0], boxShadow: "0px 0px 25px rgba(168, 85, 247, 0.9)" }}
                        whileTap={{ scale: 0.8 }}
                        className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 cursor-pointer"
                      >
                        <BookOpen className="w-5.5 h-5.5" />
                      </motion.div>
                      <div>
                        <h2 className="font-black text-base sm:text-lg bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 bg-clip-text text-transparent">
                          실시간 시간표 (폼미쳤다)
                        </h2>
                        <p className={`text-xs font-bold ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                          컴시간알리미 실시간 연동
                        </p>
                      </div>
                    </div>

                    <motion.span 
                      whileHover={{ scale: 1.25, rotate: [0, -5, 5, 0] }}
                      className="text-xs px-3 py-1 rounded-xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30 flex items-center gap-1"
                    >
                      <Monitor className="w-3.5 h-3.5 animate-pulse" /> LIVE
                    </motion.span>
                  </div>

                  {webviewStep === 0 && (
                    <div className={`rounded-2xl border p-6 h-[440px] flex flex-col items-center justify-center text-center gap-4 ${
                      isDarkMode ? 'bg-neutral-950/90 border-neutral-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30"
                      >
                        <CheckCircle2 className="w-8 h-8" />
                      </motion.div>
                      <div>
                        <h3 className={`font-black text-base ${isDarkMode ? 'text-neutral-200' : 'text-slate-900'}`}>
                          학교 & 학년/반 1회 세팅
                        </h3>
                        <p className={`text-xs sm:text-sm mt-1.5 max-w-[260px] leading-relaxed font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                          첫 접속 시 <span className="font-black text-purple-500">딱 1회만</span> 본인 반 세팅해두면 무한 연동 야르!
                        </p>
                      </div>

                      <div className="flex items-center justify-center mt-3">
                        {isDarkMode ? (
                          <motion.button
                            whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0], boxShadow: "0px 0px 25px rgba(168, 85, 247, 0.8)" }}
                            whileTap={{ scale: 0.85 }}
                            onClick={() => confirmComciStep(1)}
                            className="text-sm px-6 py-3.5 rounded-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white flex items-center gap-2 shadow-xl transition-all"
                          >
                            다음 단계로 <ArrowRight className="w-4 h-4" />
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0], boxShadow: "0px 0px 25px rgba(168, 85, 247, 0.8)" }}
                            whileTap={{ scale: 0.85 }}
                            onClick={() => confirmComciStep(2)}
                            className="text-sm px-6 py-3.5 rounded-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white flex items-center gap-2 shadow-xl transition-all"
                          >
                            <Eye className="w-4 h-4" /> 화면 띄우기
                          </motion.button>
                        )}
                      </div>
                    </div>
                  )}

                  {webviewStep === 1 && (
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 h-[440px] p-6 flex flex-col items-center justify-center text-center gap-4">
                      <motion.div 
                        animate={{ rotate: [0, -12, 12, -12, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5 }}
                        className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      >
                        <AlertCircle className="w-8 h-8" />
                      </motion.div>
                      <div>
                        <h3 className="font-black text-base text-neutral-200">컴시간 다크모드 미지원 안내</h3>
                        <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 max-w-[260px] leading-relaxed font-semibold">
                          원본 소스가 화이트 기반이라 밝은 화면으로 보일 수 있어요!
                        </p>
                      </div>

                      <div className="flex items-center justify-center mt-3">
                        <motion.button
                          whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0], boxShadow: "0px 0px 25px rgba(168, 85, 247, 0.8)" }}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => setWebviewStep(2)}
                          className="text-sm px-6 py-3.5 rounded-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white flex items-center gap-2 shadow-xl transition-all"
                        >
                          <Eye className="w-4 h-4" /> 화면 띄우기
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {webviewStep === 2 && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-white h-[440px] relative w-full">
                      <AnimatePresence>
                        {isWebviewLoading && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-20 backdrop-blur-lg bg-white/60 dark:bg-neutral-900/60 flex flex-col items-center justify-center gap-3"
                          >
                            <div className="relative flex items-center justify-center">
                              <div className="w-14 h-14 rounded-full border-4 border-purple-600/20 border-t-purple-600 animate-spin" />
                              <Sparkles className="w-6 h-6 text-purple-600 absolute animate-pulse" />
                            </div>
                            <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-neutral-100 tracking-tight">
                              야르~ 시간표 로딩 중...
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <iframe
                        src={comciStudentUrl}
                        title="컴시간알리미 실시간 시간표 웹뷰"
                        className="w-full h-full border-0"
                        style={{
                          zoom: '0.8',
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale'
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-extrabold text-xs">출처: 컴시간알리미</span>
                </div>
              </motion.div>
            </TiltCard>
          </div>

        </div>

        <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-1 font-bold">
          <Info className="w-3.5 h-3.5" />
          <span>Domain: ygmhelper.xyz | YGM 전용 스마트 스쿨 도우미</span>
        </div>
      </main>
    </div>
  );
}