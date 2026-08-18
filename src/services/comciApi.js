import axios from 'axios';
import { fetchNeisTimetable, getFormattedDate } from './neisApi';

const SCHOOL_CODE = '40807'; // 용곡중학교 컴시간 코드

/**
 * 컴시간 및 나이스 교차 시간표 파서
 */
export const fetchComciTimetable = async (grade = 1, classNum = 1, dateObj = new Date()) => {
  const dayOfWeek = dateObj.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      status: 'WEEKEND',
      list: [],
      source: '용곡중 도우미',
      message: '주말에는 수업이 없습니다.'
    };
  }

  const dateStr = getFormattedDate(dateObj);
  const comciUrl = `http://comci.net:3000/35327?${SCHOOL_CODE}_0_1`;
  
  const proxyList = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(comciUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(comciUrl)}`
  ];

  let rawData = null;

  for (const proxy of proxyList) {
    try {
      const response = await axios.get(proxy, {
        responseType: 'arraybuffer',
        timeout: 3500
      });

      const decoder = new TextDecoder('euc-kr');
      let text = decoder.decode(response.data);

      const jsonEnd = text.lastIndexOf('}');
      if (jsonEnd !== -1) {
        text = text.substring(0, jsonEnd + 1);
      }

      rawData = JSON.parse(text);
      if (rawData) break;
    } catch (e) {
      console.warn('컴시간 프록시 연결 대기 중...', proxy);
    }
  }

  // 1. 컴시간 수신 성공 시 컴시간 데이터 파싱
  if (rawData) {
    const subjects = rawData['과목'] || rawData['sb'] || [];
    const teachers = rawData['성명'] || rawData['th'] || [];
    const changedSchedule = rawData['자료2'] || rawData['자료3'] || rawData['자료'] || [];
    const originalSchedule = rawData['자료1'] || rawData['자료'] || [];

    const periodList = [];

    try {
      if (changedSchedule[grade] && changedSchedule[grade][classNum] && changedSchedule[grade][classNum][dayOfWeek]) {
        const daySchedule = changedSchedule[grade][classNum][dayOfWeek];
        const origDaySchedule = originalSchedule[grade]?.[classNum]?.[dayOfWeek] || [];

        for (let period = 1; period <= 8; period++) {
          const val = daySchedule[period];
          if (!val || val === 0) continue;

          let subjectIdx = Math.floor(val / 100);
          let teacherIdx = val % 100;

          if (val >= 10000) {
            subjectIdx = Math.floor(val / 1000);
            teacherIdx = val % 1000;
          }

          const rawSubject = subjects[subjectIdx] || '';
          const rawTeacher = teachers[teacherIdx] || '';

          const subjectName = rawSubject.trim();
          const teacherName = rawTeacher.trim();

          if (!subjectName) continue;

          const origVal = origDaySchedule[period];
          const isChanged = origVal > 0 && origVal !== val;

          let room = `${grade}-${classNum}교실`;
          if (subjectName.includes('과학')) room = '과학실';
          else if (subjectName.includes('체육')) room = '체육관';
          else if (subjectName.includes('음악')) room = '음악실';
          else if (subjectName.includes('미술')) room = '미술실';
          else if (subjectName.includes('기술') || subjectName.includes('가정') || subjectName.includes('기가')) room = '기가실';
          else if (subjectName.includes('정보') || subjectName.includes('컴퓨터')) room = '정보실';

          periodList.push({
            period: period,
            subject: subjectName,
            teacher: teacherName ? `${teacherName} 선생님` : '선생님',
            room: room,
            isChanged: isChanged
          });
        }
      }
    } catch (err) {
      console.error('컴시간 매핑 에러:', err);
    }

    if (periodList.length > 0) {
      return {
        status: 'SUCCESS',
        list: periodList,
        source: '컴시간알리미'
      };
    }
  }

  // 2. 컴시간 교체 실패 시 나이스 공식 API 파이프라인 백업 작동
  const neisResult = await fetchNeisTimetable(dateStr, grade, classNum);
  if (neisResult.status === 'SUCCESS' && neisResult.list.length > 0) {
    return neisResult;
  }

  return {
    status: 'NO_DATA',
    list: [],
    source: '용곡중 도우미',
    message: '수업 시간표 데이터가 없거나 휴일입니다.'
  };
};