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
  CheckCircle2,
  Download,
  Share,
  History,
  FileText,
  ThumbsUp,
  Smile,
  Meh,
  Frown,
  ArrowRight
} from 'lucide-react';
import { fetchMealSchedule, getFormattedDate } from './services/neisApi';

// 앱 현재 버전 및 공지사항 고유 ID
const CURRENT_VERSION = '1.3.0';
const CURRENT_NOTICE_ID = 'notice_2026_09_03_gemini_design';

// 평가 옵션 (단정하고 직관적인 Google/Gemini 스타일 5단계)
const RATING_OPTIONS = [
  { 
    label: '최고예요', 
    icon: Sparkles, 
    colorClass: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/40',
    activeClass: 'ring-2 ring-amber-500 border-amber-500 bg-amber-100 dark:bg-amber-900/60 font-bold shadow-sm'
  },
  { 
    label: '맛있어요', 
    icon: ThumbsUp, 
    colorClass: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40 hover:bg-blue-100 dark:hover:bg-blue-900/40',
    activeClass: 'ring-2 ring-blue-500 border-blue-500 bg-blue-100 dark:bg-blue-900/60 font-bold shadow-sm'
  },
  { 
    label: '보통이에요', 
    icon: Smile, 
    colorClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
    activeClass: 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-100 dark:bg-emerald-900/60 font-bold shadow-sm'
  },
  { 
    label: '조금 아쉬워요', 
    icon: Meh, 
    colorClass: 'text-slate-600 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800',
    activeClass: 'ring-2 ring-slate-500 border-slate-500 bg-slate-200 dark:bg-slate-700 font-bold shadow-sm'
  },
  { 
    label: '별로예요', 
    icon: Frown, 
    colorClass: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40 hover:bg-rose-100 dark:hover:bg-rose-900/40',
    activeClass: 'ring-2 ring-rose-500 border-rose-500 bg-rose-100 dark:bg-rose-900/60 font-bold shadow-sm'
  }
];

// 레거시 키 대응 매핑
const LEGACY_KEY_MAP = {
  '최고예요': ['최고예요', 'goat야르', 'goat', '고트', '고트야르', '야르킁킁', 'opt1'],
  '맛있어요': ['맛있어요', '도파민극락', '도파민', '극락', '야르', 'opt2'],
  '보통이에요': ['보통이에요', '알잘딱', '알잘딱깔센', '먹을만함', 'opt3'],
  '조금 아쉬워요': ['조금 아쉬워요', '음...', '음', '그저그런', 'soso', 'opt4'],
  '별로예요': ['별로예요', '억까임', '억까', '맛없음', 'bad', 'opt5']
};

const getRatingCount = (ratingsData, label) => {
  if (!ratingsData || typeof ratingsData !== 'object') return 0;
  if (ratingsData[label] !== undefined) return Number(ratingsData[label]) || 0;

  const aliases = LEGACY_KEY_MAP[label] || [];
  for (const [k, v] of Object.entries(ratingsData)) {
    const cleanKey = k.toLowerCase().trim();
    if (aliases.some(alias => alias.toLowerCase() === cleanKey)) {
      return Number(v) || 0;
    }
  }
  return 0;
};

const getTotalVotes = (ratingsData) => {
  if (!ratingsData || typeof ratingsData !== 'object') return 0;
  let sum = 0;
  RATING_OPTIONS.forEach(opt => {
    sum += getRatingCount(ratingsData, opt.label);
  });
  return sum;
};

// 패치노트 전체 히스토리 데이터베이스 (v1.0.0 ~ v1.3.0 완전 보존)
const PATCH_HISTORY = [
  {
    version: '1.3.0',
    date: '2026.09.03',
    title: '버전 1.3.0 패치노트: Google/Gemini 스타일 디자인 전면 개편 & 급식 평가 정상화',
    changes: [
      '눈이 편안하고 모던한 Google/Gemini 감성의 미니멀 디자인으로 전면 리뉴얼',
      '기존의 과도한 네온 및 흔들림 애니메이션을 제거하고, 부드럽고 직관적인 인터랙션으로 개선',
      '모든 문구를 단정하고 정중한 표준어로 변경하여 가독성과 사용자 경험 극대화',
      '급식 실시간 평가 백엔드와 프론트엔드의 데이터 동기화 오류 및 400 전송 오류를 완벽 수정',
      '직관적인 5단계 평가(최고예요, 맛있어요, 보통이에요, 조금 아쉬워요, 별로예요) 도입 및 기존 투표 데이터 완전 호환',
      'v1.0.0부터의 모든 패치노트 히스토리 원형 유지'
    ]
  },
  {
    version: '1.2.19',
    date: '2026.08.28',
    title: '버전 1.2.19 패치노트: 백엔드 단축키/메타데이터 다중 에일리어스(RATING_ALIASES) 매핑 탑재 & 투표 데이터 동기화 오차 완벽 해결 패치⚡️',
    changes: [
      '백엔드 API 응답 데이터 키(단축어, 영문, 숫자인덱스 등)를 100% 매칭하는 RATING_ALIASES 파서 시스템 탑재',
      '총 참전 인원수(3명 참전)와 개별 항목 카운트 합산 간 데이터 불일치를 완전 적출하여 정밀 일치하도록 개선',
      'PC/모바일 전 환경 고대비 파스텔 테마 및 대형화 컨트롤 레이아웃 완전 유지',
      'v1.0.0부터 v1.2.19까지 단 하나도 누락 없는 전체 패치 히스토리 원형 보존'
    ]
  },
  {
    version: '1.2.18',
    date: '2026.08.28',
    title: '버전 1.2.18 패치노트: PC/모바일 평가 버튼 초고대비 테마 완전 고정 & 백엔드 투표 데이터 매핑(0 표시) 완벽 수정 패치⚡️',
    changes: [
      '백엔드 API 응답 데이터 키의 형식을 유연하게 파싱하는 getRatingCount 파서를 탑재하여 개별 수치 매핑 오류 보완',
      'PC/모바일 라이트 모드에서 평가 버튼이 어두운 박스로 뭉개지던 현상을 isDarkMode 기반 분리 테마로 강제 고정',
      '날짜 선택 컨트롤의 대형화 크기 및 편의성 완전 유지',
      'v1.0.0부터 v1.2.18까지 단 하나도 누락 없는 전체 패치 히스토리 원형 보존'
    ]
  },
  {
    version: '1.2.17',
    date: '2026.08.28',
    title: '버전 1.2.17 패치노트: PC/모바일 전 환경 급식 평가 버튼 초고대비 텍스트/아이콘 색상 고정 & 날짜 선택 컨트롤 대형화 원복 패치⚡️',
    changes: [
      'PC 및 모바일 라이트 모드에서 급식 평가 버튼의 글씨와 아이콘이 하얗게/흐리게 보이던 현상을 각 요소별 명시적 고대비 색상으로 전면 강제 고정',
      '날짜 선택 컨트롤 영역의 크기 및 패딩을 대형화 원복하여 터치 및 클릭 편의성 극대화',
      'v1.0.0부터 v1.2.17까지 단 하나도 누락 없는 전 과거 패치 히스토리 보존'
    ]
  },
  {
    version: '1.2.16',
    date: '2026.08.28',
    title: '버전 1.2.16 패치노트: 급식 평가 버튼 고대비 색상 복원 & 모바일 날짜 헤더 줄바꿈 완전 교정⚡️',
    changes: [
      '라이트 모드에서 급식 평가 버튼의 글씨와 아이콘이 흰색/연파스텔로 뭉개지던 현상을 초고대비 전용 테마로 완벽 복원',
      '모바일 해상도에서 급식표 날짜 컨트롤의 [오늘] 버튼 및 화살표가 공간 부족으로 줄바꿈되던 레이아웃 버그를 whitespace-nowrap & shrink-0 정밀 조정으로 완벽 해결',
      'v1.0.0부터 v1.2.16까지 단 하나도 누락 없는 패치 히스토리 원형 보존'
    ]
  },
  {
    version: '1.2.15',
    date: '2026.08.28',
    title: '버전 1.2.15 패치노트: 라이트/다크 모드 급식 평가 버튼 시인성(텍스트/아이콘 명도 대비) 정밀 교정 패치⚡️',
    changes: [
      '라이트 모드에서 급식 평가 버튼의 글씨와 아이콘이 하얗게 날아가던 가시성 버그 완전 해결',
      '라이트 모드/다크 모드 각각에 최적화된 고대비 컬러 매핑 적용으로 가독성 극대화',
      '800Hz 고탄성 타격감 및 버튼 1:1 레이아웃 구조 완벽 유지',
      'v1.0.0부터 v1.2.15까지 단 하나도 누락 없는 패치 히스토리 보존'
    ]
  },
  {
    version: '1.2.14',
    date: '2026.08.28',
    title: '버전 1.2.14 패치노트: 초고속 800Hz 하이퍼 스피드 모션 엔진 & 카지노 배너급 네온 오로라 글로우 대개편⚡️🔥',
    changes: [
      '모든 애니메이션 및 모달 반응 속도를 800Hz 고탄성 초고속 스프링 엔진(stiffness: 800)으로 개편하여 손끝에 감기는 스피드 확보',
      '하단 버튼 및 모달창에 카지노 배너 스타일의 오로라 네온 무지개 글로우 및 3D 타격감 이펙트 탑재',
      '마우스 이동/이탈 시 TiltCard의 회전 반응 및 복원 스프링 속도를 극강으로 단축하여 렉 요소 완전 적출',
      '하단 버튼 간격 grid 1:1 완벽 정밀 균등 구조 완전 유지',
      'v1.0.0부터 v1.2.14까지 단 하나도 누락 없는 패치 히스토리 원형 보존'
    ]
  },
  {
    version: '1.2.13',
    date: '2026.08.28',
    title: '버전 1.2.13 패치노트: 초초초개씹레전드 글로우 네온 모션 패치 & 하단 버튼 간격 정밀 교정 + 마우스 이탈 시 3D 틸트 원복 보정⚡️🔥',
    changes: [
      '하단 버튼 간격 버그(알러지 정돈 & 다시 당겨오기)를 grid 1:1 정밀 레이아웃으로 완벽 맞춤 수정',
      '마우스를 뗄 때 3D 카드 애니메이션이 중간에 멈추던 현상을 탄성 복귀 물리 엔진으로 완벽 원복 보정',
      '버튼 호버/클릭 시 3D 회전 스프링 및 무지개 스펙트럼 발광 효과 초레전드급으로 보강',
      '모바일 글래스모피즘 스티키 탭 바 & PC 컴시간 시간표 스티키 포지션 완벽 고정',
      'v1.0.0부터 전 과거 버전 패치노트 내역 누락 없이 원형 보존'
    ]
  },
  {
    version: '1.2.12',
    date: '2026.08.28',
    title: '버전 1.2.12 패치노트: 버전 1.2.12 폭발적 반영 & 초화려 3D 네온 글로우 모션 극락 탑재 + 최신 도파민 MZ 어휘(GOAT/폼미쳤다/알잘딱) 풀충전⚡️🔥',
    changes: [
      '시맨틱 버저닝 1.2.12 정밀 연장 세팅 완료',
      '모든 주요 버튼 및 헤더에 3D 네온 글로우 오로라 이펙트 & 무지개 그라데이션 타이포그래피 적용',
      '최신 MZ 서브컬처 용어 풀충전',
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
      '트렌드 지난 어휘 전면 퇴출 및 야르 중심의 도파민 멘트 대폭 내장',
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
      '모바일 상단 탭 바 스크롤 고정 시 단색 뭉개짐 방지를 위한 고급 블러 글래스모피즘 CSS 복원',
      'PC/태블릿 스크롤 시 급식표 길이에 맞춰 컴시간 시간표 카드가 따라오는 스티키 포지션 정밀 밀착',
      'v1.0.0부터 v1.2.8까지 축약되었던 전 과거 버전 패치노트 내역을 누락 없이 원형 그대로 완전 복구',
      '3D 파라락스 틸트 및 버튼 통통 튀는 학사모 스프링 회전 모션 대폭 보강'
    ]
  },
  {
    version: '1.2.8',
    date: '2026.08.28',
    title: '버전 1.2.8 패치노트: 모바일 탭 바 & 컴시간 시간표 스티키 완벽 밀착 + 전 팝업/버튼 3D 틸트 및 회전 스프링 모션 극락 개편⚡️',
    changes: [
      '모바일 상단 서비스 선택 탭 바 스크롤 고정 & 네온 발광 강조 이펙트 적용',
      'PC/태블릿 스크롤 시 컴시간 시간표 카드가 따라오는 스티키 밀착 완',
      '모든 모달 팝업창 및 카드에 마우스 3D 시선 추적 파라락스 틸트 전면 적용',
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
      return isDark 
        ? 'bg-purple-950/40 text-purple-300 border-purple-800/40' 
        : 'bg-purple-50 text-purple-700 border-purple-200';
    case '음료':
      return isDark 
        ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40' 
        : 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case '과일':
      return isDark 
        ? 'bg-rose-950/40 text-rose-300 border-rose-800/40' 
        : 'bg-rose-50 text-rose-700 border-rose-200';
    case '밥':
      return isDark 
        ? 'bg-blue-950/40 text-blue-300 border-blue-800/40' 
        : 'bg-blue-50 text-blue-700 border-blue-200';
    case '국':
      return isDark 
        ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' 
        : 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return isDark 
        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' 
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
};

// Google Material 3 스타일의 부드러운 모달 애니메이션
const modalOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }
};

const modalContentVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.96, y: 6, transition: { duration: 0.15, ease: 'easeIn' } }
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
  const [ratings, setRatings] = useState({ "최고예요": 0, "맛있어요": 0, "보통이에요": 0, "조금 아쉬워요": 0, "별로예요": 0 });
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
      }, 1000);
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
        setRatings({ "최고예요": 0, "맛있어요": 0, "보통이에요": 0, "조금 아쉬워요": 0, "별로예요": 0 });
      }
    } catch (err) {
      console.error('Failed to load ratings:', err);
      setRatings({ "최고예요": 0, "맛있어요": 0, "보통이에요": 0, "조금 아쉬워요": 0, "별로예요": 0 });
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
      }, 100);
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

  const totalVotes = getTotalVotes(ratings);

  return (
    <div className={`min-h-screen transition-colors duration-200 selection:bg-blue-500 selection:text-white relative overflow-x-hidden ${
      isDarkMode ? 'bg-[#131314] text-[#e3e3e3]' : 'bg-[#f8fafd] text-[#1f1f1f]'
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
        body, * {
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
        }
      `}</style>

      {/* 팝업 모달 영역 */}
      <AnimatePresence>
        {/* 앱 설치 가이드 모달 */}
        {showInstallGuide && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`w-full max-w-md p-6 rounded-2xl border shadow-xl relative ${
                isDarkMode ? 'bg-[#1e1f20] border-[#333538] text-[#e3e3e3]' : 'bg-white border-[#e0e2ec] text-[#1f1f1f]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-[#333538] mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Download className="w-5 h-5" />
                  </div>
                  <h2 className="font-bold text-base">앱으로 설치하기</h2>
                </div>
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm leading-relaxed">
                <div className={`p-4 rounded-xl border ${
                  isDarkMode ? 'bg-[#131314] border-[#333538]' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <p className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-1">
                    <Share className="w-4 h-4" /> 아이폰 (Safari)
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-400 text-xs sm:text-sm">
                    하단의 <strong>[공유]</strong> 버튼을 누른 후 <strong>[홈 화면에 추가]</strong>를 선택하시면 앱처럼 편리하게 이용하실 수 있습니다.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isDarkMode ? 'bg-[#131314] border-[#333538]' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                    <Monitor className="w-4 h-4" /> 안드로이드 (Chrome)
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-400 text-xs sm:text-sm">
                    우측 상단 <strong>더보기(⋮)</strong> 메뉴를 누른 후 <strong>[앱 설치]</strong> 또는 <strong>[홈 화면에 추가]</strong>를 선택해 주세요.
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-neutral-200 dark:border-[#333538] flex justify-end">
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="text-sm px-5 py-2.5 rounded-full font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-colors"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 공지사항 모달 */}
        {showNotice && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`w-full max-w-md p-6 rounded-2xl border shadow-xl relative ${
                isDarkMode ? 'bg-[#1e1f20] border-[#333538] text-[#e3e3e3]' : 'bg-white border-[#e0e2ec] text-[#1f1f1f]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-[#333538] mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <h2 className="font-bold text-base">공지사항</h2>
                </div>
                <button
                  onClick={handleCloseNotice}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                    안내
                  </span>
                  <h3 className="font-semibold text-sm sm:text-base">오늘의 급식 실시간 평가 기능</h3>
                </div>

                <div className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                  isDarkMode ? 'bg-[#131314] border-[#333538] text-neutral-300' : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                }`}>
                  오늘 급식에 대해 솔직한 평가를 남겨보세요! 최고예요부터 별로예요까지 버튼을 눌러 간편하게 의견을 표현하실 수 있습니다.
                </div>
              </div>

              <div className={`flex items-center ${isAutoNotice ? 'justify-between' : 'justify-end'} pt-4 border-t border-neutral-200 dark:border-[#333538]`}>
                {isAutoNotice && (
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer select-none text-neutral-600 dark:text-neutral-400">
                    <input
                      type="checkbox"
                      checked={neverShowNoticeChecked}
                      onChange={(e) => setNeverShowNoticeChecked(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 cursor-pointer"
                    />
                    <span>다시 보지 않기</span>
                  </label>
                )}

                <button
                  onClick={handleCloseNotice}
                  className="text-xs sm:text-sm px-5 py-2.5 rounded-full font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-colors"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 패치노트 모달 */}
        {showPatchModal && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`w-full max-w-2xl max-h-[85vh] p-5 sm:p-6 rounded-2xl border shadow-xl relative flex flex-col justify-between ${
                isDarkMode ? 'bg-[#1e1f20] border-[#333538] text-[#e3e3e3]' : 'bg-white border-[#e0e2ec] text-[#1f1f1f]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-[#333538] mb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h2 className="font-bold text-base sm:text-lg">업데이트 내역</h2>
                </div>
                <button
                  onClick={handleClosePatch}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 my-1 flex-1 min-h-0 overflow-hidden">
                <div className="w-full sm:w-44 flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-x-hidden sm:overflow-y-auto shrink-0 pb-2 sm:pb-0 border-b sm:border-b-0 sm:border-r border-neutral-200 dark:border-[#333538] pr-0 sm:pr-3 max-h-[52px] sm:max-h-full">
                  <div className="hidden sm:block my-1 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-2 shrink-0">
                    버전 목록
                  </div>

                  {PATCH_HISTORY.map((patch) => (
                    <button
                      key={patch.version}
                      onClick={() => setSelectedPatchVersion(patch.version)}
                      className={`h-9 min-h-[36px] max-h-[36px] px-3 rounded-xl font-medium text-xs sm:text-sm text-left flex items-center justify-between transition-colors shrink-0 whitespace-nowrap ${
                        selectedPatchVersion === patch.version
                          ? 'bg-[#1a73e8] text-white shadow-sm'
                          : isDarkMode 
                            ? 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300' 
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 opacity-70 shrink-0" />
                        <span>v{patch.version}</span>
                      </div>
                      {patch.version === CURRENT_VERSION && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold shrink-0 ml-1.5">
                          최신
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pl-0 sm:pl-2 pt-1 sm:pt-0 pr-1">
                  {(() => {
                    const patch = PATCH_HISTORY.find((p) => p.version === selectedPatchVersion);
                    if (!patch) return null;

                    return (
                      <div key={patch.version} className="space-y-3 pr-1">
                        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 dark:border-[#333538] pb-2">
                          <h3 className="font-bold text-sm sm:text-base text-blue-600 dark:text-blue-400">
                            {patch.title}
                          </h3>
                          <span className="text-xs text-neutral-400 font-medium shrink-0">{patch.date}</span>
                        </div>

                        <div className={`p-4 rounded-xl border text-xs sm:text-sm ${
                          isDarkMode ? 'bg-[#131314] border-[#333538] text-neutral-300' : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                        }`}>
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

              <div className={`flex items-center ${isAutoPatch ? 'justify-between' : 'justify-end'} pt-3 border-t border-neutral-200 dark:border-[#333538] shrink-0 mt-2`}>
                {isAutoPatch && (
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer select-none text-neutral-600 dark:text-neutral-400">
                    <input
                      type="checkbox"
                      checked={neverShowPatchChecked}
                      onChange={(e) => setNeverShowPatchChecked(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 cursor-pointer"
                    />
                    <span>이 버전 안내 닫기</span>
                  </label>
                )}

                <button
                  onClick={handleClosePatch}
                  className="text-xs sm:text-sm px-5 py-2.5 rounded-full font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-colors"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 개별 메뉴 알레르기 모달 */}
        {selectedDishAllergy && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`w-full max-w-md p-6 rounded-2xl border shadow-xl relative ${
                isDarkMode ? 'bg-[#1e1f20] border-[#333538] text-[#e3e3e3]' : 'bg-white border-[#e0e2ec] text-[#1f1f1f]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-[#333538] mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base sm:text-lg">{selectedDishAllergy.dishName}</h2>
                    <p className="text-xs text-neutral-500">알레르기 유발 성분 안내</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDishAllergy(null)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 py-2 max-h-[300px] overflow-y-auto">
                {selectedDishAllergy.allergyStr
                  .split('.')
                  .filter(Boolean)
                  .map((numStr, idx) => {
                    const cleanNum = numStr.trim();
                    const allergyName = ALLERGY_MAP[cleanNum] || `알레르기 ${cleanNum}`;
                    return (
                      <div 
                        key={idx}
                        className={`p-3 rounded-xl border font-medium text-sm flex items-center gap-3 ${
                          isDarkMode ? 'bg-[#131314] border-[#333538] text-neutral-200' : 'bg-neutral-50 border-neutral-200 text-neutral-800'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                          {cleanNum}
                        </span>
                        <span>{allergyName}</span>
                      </div>
                    );
                  })}
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-[#333538] flex justify-end">
                <button
                  onClick={() => setSelectedDishAllergy(null)}
                  className="text-sm px-5 py-2.5 rounded-full font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-colors"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 전체 알레르기 목록 모달 */}
        {showAllergyModal && (
          <motion.div 
            variants={modalOverlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`w-full max-w-md p-6 rounded-2xl border shadow-xl relative ${
                isDarkMode ? 'bg-[#1e1f20] border-[#333538] text-[#e3e3e3]' : 'bg-white border-[#e0e2ec] text-[#1f1f1f]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-[#333538] mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base">알레르기 유발 정보 안내</h2>
                    <p className="text-xs text-neutral-500">식품의약품안전처 지정 19종</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAllergyModal(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 max-h-[320px] overflow-y-auto">
                {ALLERGY_LIST.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`p-2.5 rounded-xl border font-medium ${
                      isDarkMode ? 'bg-[#131314] border-[#333538] text-neutral-300' : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-neutral-200 dark:border-[#333538] flex justify-end">
                <button
                  onClick={() => setShowAllergyModal(false)}
                  className="text-sm px-5 py-2.5 rounded-full font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-colors"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 상단 헤더 (Google / Gemini 스타일) */}
      <header className={`border-b sticky top-0 z-50 backdrop-blur-md transition-colors ${
        isDarkMode ? 'bg-[#131314]/90 border-[#282a2c]' : 'bg-white/90 border-[#e0e2ec]'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-neutral-900 dark:text-neutral-100">
                  YGMhelper
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                  서울용곡중
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isStandalone && (
              <button
                onClick={handleInstallClick}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>앱 설치</span>
              </button>
            )}

            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full border transition-colors ${
                isDarkMode 
                  ? 'border-neutral-700 hover:bg-neutral-800 text-amber-400' 
                  : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
              }`}
              title="테마 전환"
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={`p-2 rounded-full border transition-colors flex items-center ${
                  isDarkMode 
                    ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                    : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                }`}
                title="메뉴"
              >
                <ChevronDown className={`w-4.5 h-4.5 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 mt-2 w-44 rounded-2xl border shadow-lg p-1.5 z-50 ${
                      isDarkMode ? 'bg-[#1e1f20] border-[#333538] text-neutral-200' : 'bg-white border-[#e0e2ec] text-neutral-800'
                    }`}
                  >
                    <button
                      onClick={openNoticeModal}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                        isDarkMode ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                      }`}
                    >
                      <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>공지사항</span>
                    </button>

                    <button
                      onClick={openPatchModal}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                        isDarkMode ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>업데이트 내역</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 컨테이너 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* 모바일 탭 바 (Material 3 Segmented Buttons) */}
        <div className="flex md:hidden p-1 mb-5 rounded-full bg-neutral-200/70 dark:bg-[#282a2c] sticky top-20 z-40">
          <button
            onClick={() => setActiveTab('meal')}
            className={`flex-1 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'meal'
                ? isDarkMode ? 'bg-[#1e1f20] text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>오늘의 급식</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-2.5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'schedule'
                ? isDarkMode ? 'bg-[#1e1f20] text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>실시간 시간표</span>
          </button>
        </div>

        {/* 2컬럼 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 급식표 Card */}
          <div className={`lg:col-span-7 ${activeTab === 'meal' ? 'block' : 'hidden md:block'}`}>
            <div className={`p-6 sm:p-7 rounded-2xl border shadow-[0_1px_3px_0_rgba(60,64,67,0.06)] flex flex-col justify-between transition-all ${
              isDarkMode ? 'bg-[#1e1f20] border-[#333538]' : 'bg-white border-[#e0e2ec]'
            }`}>
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-[#333538] mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <Utensils className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
                        오늘의 급식
                      </h2>
                      <p className="text-xs text-neutral-500">서울용곡중학교 식단 정보</p>
                    </div>
                  </div>
                </div>

                {/* 날짜 선택 컨트롤 (Google Calendar 스타일) */}
                <div className={`p-3 rounded-xl border mb-4 flex items-center justify-between gap-2 ${
                  isDarkMode ? 'bg-[#131314] border-[#333538]' : 'bg-neutral-50 border-neutral-200'
                }`}>
                  <div 
                    onClick={openDatePicker}
                    className="flex items-center gap-2 cursor-pointer select-none py-1 px-2 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <CalendarIcon className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                      {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 {currentDate.getDate()}일
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
                      {['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()]}요일
                    </span>

                    <input
                      ref={dateInputRef}
                      type="date"
                      value={datePickerValue}
                      onChange={handleDateSelect}
                      className="sr-only"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={resetToToday}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                        isDarkMode 
                          ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                          : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700 bg-white'
                      }`}
                    >
                      오늘
                    </button>
                    <button
                      onClick={() => changeDate(-1)}
                      className={`p-1.5 rounded-full border transition-colors ${
                        isDarkMode 
                          ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                          : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700 bg-white'
                      }`}
                      title="이전 날짜"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => changeDate(1)}
                      className={`p-1.5 rounded-full border transition-colors ${
                        isDarkMode 
                          ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300' 
                          : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700 bg-white'
                      }`}
                      title="다음 날짜"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 총 칼로리 */}
                {meal.calories && !mealLoading && (
                  <div className="flex items-center justify-between px-1 mb-3">
                    <span className="text-xs text-neutral-500 font-medium">
                      총 열량
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      {meal.calories}
                    </span>
                  </div>
                )}

                {/* 메뉴 목록 */}
                {mealLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    <span className="text-sm font-medium text-neutral-500">
                      식단 정보를 불러오는 중입니다...
                    </span>
                  </div>
                ) : meal.menuItems && meal.menuItems.length > 0 ? (
                  <div className="space-y-2">
                    {meal.menuItems.map((dish, idx) => {
                      const category = getDishCategory(dish.name);
                      const badgeClass = getCategoryBadgeStyle(category, isDarkMode);

                      return (
                        <div
                          key={idx}
                          className={`px-4 py-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                            isDarkMode 
                              ? 'bg-[#131314] border-[#333538] hover:border-neutral-600' 
                              : 'bg-neutral-50/70 border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-semibold text-sm sm:text-base text-neutral-900 dark:text-neutral-100">
                              {dish.name}
                            </span>
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${badgeClass}`}>
                              {category}
                            </span>
                          </div>

                          {dish.allergy && (
                            <button
                              onClick={() => setSelectedDishAllergy({ dishName: dish.name, allergyStr: dish.allergy })}
                              className={`text-xs px-2 py-1 rounded-md border transition-colors shrink-0 ${
                                isDarkMode 
                                  ? 'bg-[#1e1f20] border-neutral-700 text-neutral-400 hover:text-neutral-200' 
                                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                              }`}
                              title="알레르기 성분 확인"
                            >
                              알레르기 {dish.allergy}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`p-12 rounded-xl text-center text-sm font-medium ${
                    isDarkMode ? 'bg-[#131314] text-neutral-400' : 'bg-neutral-50 text-neutral-500'
                  }`}>
                    등록된 급식 정보가 없습니다. (휴교일이거나 식단이 등록되지 않았습니다.)
                  </div>
                )}

                {/* 실시간 급식 평가 섹션 */}
                {isWithin7Days && (
                  <div className={`mt-6 p-4 rounded-xl border ${
                    isDarkMode ? 'bg-[#131314] border-[#333538]' : 'bg-neutral-50 border-neutral-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          오늘의 급식 평가
                        </span>
                        {totalVotes > 0 && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                            {totalVotes}명 참여
                          </span>
                        )}
                      </div>

                      {!isToday ? (
                        <span className="text-xs text-neutral-400 font-medium">당일만 참여 가능</span>
                      ) : userVotedRating ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 투표 완료
                        </span>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {RATING_OPTIONS.map((opt) => {
                        const IconComponent = opt.icon;
                        const count = getRatingCount(ratings, opt.label);
                        const isSelected = userVotedRating === opt.label;
                        const isDisabled = !isToday || Boolean(userVotedRating) || isRatingSubmitting;

                        return (
                          <button
                            key={opt.label}
                            onClick={() => handleVoteRating(opt.label)}
                            disabled={isDisabled}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                              isSelected 
                                ? opt.activeClass 
                                : opt.colorClass
                            } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-[1.02]'}`}
                          >
                            <IconComponent className="w-5 h-5 shrink-0" />
                            <span className="text-xs font-semibold leading-tight whitespace-nowrap">
                              {opt.label}
                            </span>
                            <span className="text-[11px] font-bold opacity-80">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 하단 보조 버튼 */}
              <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-[#333538] grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowAllergyModal(true)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium border transition-colors ${
                    isDarkMode 
                      ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700' 
                      : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <Info className="w-4 h-4 text-neutral-500" />
                  <span>전체 알레르기 정보</span>
                </button>

                <button
                  onClick={loadMealData}
                  disabled={mealLoading}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium border transition-colors ${
                    isDarkMode 
                      ? 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700' 
                      : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <RotateCcw className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${mealLoading ? 'animate-spin' : ''}`} />
                  <span>새로고침</span>
                </button>
              </div>
            </div>
          </div>

          {/* 시간표 Card */}
          <div className={`lg:col-span-5 sticky top-20 z-30 self-start ${activeTab === 'schedule' ? 'block' : 'hidden md:block'}`}>
            <div className={`p-6 sm:p-7 rounded-2xl border shadow-[0_1px_3px_0_rgba(60,64,67,0.06)] flex flex-col justify-between transition-all ${
              isDarkMode ? 'bg-[#1e1f20] border-[#333538]' : 'bg-white border-[#e0e2ec]'
            }`}>
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-[#333538] mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
                        실시간 시간표
                      </h2>
                      <p className="text-xs text-neutral-500">컴시간알리미 실시간 연동</p>
                    </div>
                  </div>

                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                    <Monitor className="w-3 h-3" /> 연동됨
                  </span>
                </div>

                {webviewStep === 0 && (
                  <div className={`rounded-xl border p-6 h-[440px] flex flex-col items-center justify-center text-center gap-4 ${
                    isDarkMode ? 'bg-[#131314] border-[#333538]' : 'bg-neutral-50 border-neutral-200'
                  }`}>
                    <div className="p-3.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                        시간표 최초 설정 안내
                      </h3>
                      <p className="text-xs sm:text-sm text-neutral-500 mt-1.5 max-w-[260px] leading-relaxed">
                        처음 1회 학년과 반을 선택하시면 이후 접속 시에도 시간표가 유지됩니다.
                      </p>
                    </div>

                    <button
                      onClick={() => confirmComciStep(isDarkMode ? 1 : 2)}
                      className="text-sm px-6 py-2.5 rounded-full font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white flex items-center gap-1.5 transition-colors shadow-sm mt-2"
                    >
                      <span>시간표 열기</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {webviewStep === 1 && (
                  <div className="rounded-xl border border-neutral-800 bg-[#131314] h-[440px] p-6 flex flex-col items-center justify-center text-center gap-4">
                    <div className="p-3.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/40">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-neutral-200">화면 밝기 안내</h3>
                      <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 max-w-[260px] leading-relaxed">
                        컴시간알리미 외부 서비스는 기본적으로 밝은 배경으로 제공됩니다.
                      </p>
                    </div>

                    <button
                      onClick={() => setWebviewStep(2)}
                      className="text-sm px-6 py-2.5 rounded-full font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white flex items-center gap-1.5 transition-colors shadow-sm mt-2"
                    >
                      <span>시간표 확인</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {webviewStep === 2 && (
                  <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-[#333538] bg-white h-[440px] relative w-full">
                    <AnimatePresence>
                      {isWebviewLoading && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="absolute inset-0 z-20 bg-white/80 dark:bg-[#1e1f20]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5"
                        >
                          <div className="w-7 h-7 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                            시간표를 불러오는 중입니다...
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <iframe
                      src={comciStudentUrl}
                      title="컴시간알리미 시간표"
                      className="w-full h-full border-0"
                      style={{
                        zoom: '0.85',
                        WebkitFontSmoothing: 'antialiased'
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-[#333538] flex items-center justify-between text-xs text-neutral-400">
                <span>제공: 컴시간알리미</span>
              </div>
            </div>
          </div>

        </div>

        {/* 하단 푸터 */}
        <footer className="mt-12 text-center text-xs text-neutral-500 flex items-center justify-center gap-1 font-normal pb-6">
          <Info className="w-3.5 h-3.5 text-neutral-400" />
          <span>YGMhelper · 서울용곡중학교 학생 도우미 (ygmhelper.xyz)</span>
        </footer>
      </main>
    </div>
  );
}