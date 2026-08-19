// 서울용곡중학교 NEIS 공식 식별 코드
const ATPT_OFCDC_SC_CODE = 'B10'; // 서울특별시교육청
const SD_SCHUL_CODE = '7134139'; // 서울용곡중학교 행정표준학교코드

// 날짜 포맷 변환 함수 (YYYYMMDD)
export const getFormattedDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

// NEIS API 급식 데이터 요청 함수
export const fetchMealSchedule = async (ymdStr) => {
  try {
    const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=10&ATPT_OFCDC_SC_CODE=${ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${SD_SCHUL_CODE}&MLSV_YMD=${ymdStr}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.mealServiceDietInfo && data.mealServiceDietInfo[1] && data.mealServiceDietInfo[1].row) {
      const mealData = data.mealServiceDietInfo[1].row[0];
      const rawDishName = mealData.DDISH_NM || '';
      const calories = mealData.CAL_INFO || '';

      // <br/> 태그 분할 및 메뉴/알러지 정밀 파싱
      const rawList = rawDishName.split(/<br\s*\/?>/i);
      const menuItems = rawList.map((item) => {
        let text = item.replace(/<[^>]*>/g, '').trim();
        if (!text) return null;

        // 메뉴명 끝의 알러지 번호(예: 5.6.9.10 또는 (5.6.9.10)) 추출
        const allergyMatch = text.match(/\(?([0-9\.]+)\)?$/);
        let allergy = '';
        let name = text;

        if (allergyMatch) {
          allergy = allergyMatch[1].replace(/\.$/, '');
          name = text.replace(allergyMatch[0], '').trim();
        }

        return { name, allergy };
      }).filter((dish) => dish && dish.name.length > 0);

      return {
        menuItems,
        calories,
        status: 'SUCCESS'
      };
    }

    return { menuItems: [], calories: '', status: 'EMPTY' };
  } catch (error) {
    console.error('서울용곡중학교 급식 정보 수신 중 오류 발생:', error);
    return { menuItems: [], calories: '', status: 'ERROR' };
  }
};