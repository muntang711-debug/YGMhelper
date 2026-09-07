// NEIS 오픈 API 기반 급식 정보 추출 서비스
const NEIS_API_KEY = ''; // 필요시 발급받은 NEIS API KEY 입력
const ATPT_OFCDC_SC_CODE = 'B10'; // 서울특별시교육청
const SD_SCHUL_CODE = '7010537'; // YGM 학교 코드

export const getFormattedDate = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

export const fetchMealSchedule = async (ymd) => {
  try {
    const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?Type=json&pIndex=1&pSize=100&ATPT_OFCDC_SC_CODE=${ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${SD_SCHUL_CODE}&MLSV_YMD=${ymd}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('NEIS API 호출 실패');
    }

    const data = await response.json();

    if (data.mealServiceDietInfo && data.mealServiceDietInfo[1]?.row?.length > 0) {
      const mealData = data.mealServiceDietInfo[1].row[0];
      const rawMenu = mealData.DDISH_NM || '';
      const calories = mealData.CAL_INFO || '';

      // 메뉴 파싱 (알러지 번호 분리 처리)
      const menuLines = rawMenu.split('<br/>').map((line) => line.trim()).filter(Boolean);

      const menuItems = menuLines.map((line) => {
        const allergyMatch = line.match(/\(([\d.]+)\)/);
        const allergy = allergyMatch ? allergyMatch[1] : null;
        const name = line.replace(/\([\d.]+\)/g, '').trim();

        return { name, allergy };
      });

      return {
        menuItems,
        calories,
        status: 'SUCCESS'
      };
    }

    return {
      menuItems: [],
      calories: '',
      status: 'EMPTY'
    };
  } catch (error) {
    console.error('Meal fetch error:', error);
    return {
      menuItems: [],
      calories: '',
      status: 'ERROR'
    };
  }
};