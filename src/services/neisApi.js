import axios from 'axios';

const NEIS_BASE_URL = 'https://open.neis.go.kr/hub';
const ATPT_OFCDC_SC_CODE = 'B10'; // 서울특별시교육청
const SD_SCHUL_CODE = '7091393';   // 용곡중학교

// 전달해주신 나이스 정식 API KEY
const API_KEY = '0e63108664b64083ad86d34278cdcebe'; 

export const getFormattedDate = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * 용곡중학교 급식 정보 및 메뉴별 알레르기 정보 파싱
 */
export const fetchMealSchedule = async (dateStr) => {
  try {
    const response = await axios.get(`${NEIS_BASE_URL}/mealServiceDietInfo`, {
      params: {
        KEY: API_KEY,
        Type: 'json',
        pIndex: 1,
        pSize: 10,
        ATPT_OFCDC_SC_CODE: ATPT_OFCDC_SC_CODE,
        SD_SCHUL_CODE: SD_SCHUL_CODE,
        MLSV_YMD: dateStr,
      },
    });

    const data = response.data;

    if (data.mealServiceDietInfo) {
      const mealData = data.mealServiceDietInfo[1].row[0];
      const rawLines = mealData.DDISH_NM.split('<br/>');

      const parsedMenuItems = rawLines.map((line) => {
        const trimmed = line.trim();
        const allergyMatch = trimmed.match(/\(([0-9.]+)\)/);
        const allergyNumbers = allergyMatch ? allergyMatch[1] : null;
        const name = trimmed.replace(/\([0-9.]+\)/g, '').trim();

        return {
          name: name,
          allergy: allergyNumbers,
        };
      }).filter((item) => item.name.length > 0);

      return {
        status: 'SUCCESS',
        menuItems: parsedMenuItems,
        calories: mealData.CAL_INFO,
      };
    }

    return {
      status: 'NO_DATA',
      menuItems: [],
      calories: '',
    };
  } catch (error) {
    console.error('급식 정보 API 요청 에러:', error);
    return {
      status: 'ERROR',
      menuItems: [],
      calories: '',
    };
  }
};