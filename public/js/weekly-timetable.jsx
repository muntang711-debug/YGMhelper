import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';

const weekdays = ['월', '화', '수', '목', '금'];

function Lesson({item}) {
  if (!item) return <span className="no-lesson" aria-label="수업 없음" />;
  return <div className="weekly-lesson">
    <strong>{item.subject || '수업 정보 없음'}</strong>
    {item.classLabel && <span>{item.classLabel}</span>}
    {item.teacher && <span>{String(item.teacher).trim()}</span>}
    {item.location && <span className="weekly-location">
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.5 8c0 4-5.5 8.5-5.5 8.5S4.5 12 4.5 8a5.5 5.5 0 1 1 11 0Z"/><circle cx="10" cy="8" r="1.75"/></svg>
      {item.location}
    </span>}
  </div>;
}

function MembershipGate() {
  return <div className="membership-gate">
    <h3>최신 시간표 확인하기</h3>
    <p>로그인하고 컴시간 시간표를 확인하세요.</p>
    <a className="primary-link" href="/login.html">로그인</a>
    <a href="/signup.html">회원가입</a>
  </div>;
}

function WeeklyTimetable({data, selectedDate, grade, className}) {
  const days = Array.isArray(data.days) ? data.days : [];
  if (data.preview && !days.some(day => day.items?.length)) {
    return <><p className="weekly-message">NEIS 미리보기 자료가 없습니다.</p><MembershipGate /></>;
  }
  if (days.length !== 5) return <p className="weekly-message">주간 시간표가 없습니다.</p>;
  const periods = Math.min(16, Math.max(data.preview ? 7 : 0, ...days.flatMap(day => (day.items || []).map(item => Number(item.period)))));
  if (!periods) {
    return <p className="weekly-message">{data.mode === 'teacher'
      ? '선택한 선생님의 수업이 없습니다.' : '선택한 학급의 주간 시간표가 없습니다.'}</p>;
  }
  const caption = data.mode === 'teacher' ? `${data.teacherName} 교사 주간 시간표` : `${grade}학년 ${className}반 주간 시간표`;
  return <>
    <table className="weekly-table">
      <caption className="sr-only">{caption}</caption>
      <thead><tr>
        <th scope="col">교시</th>
        {days.map((day, index) => <th key={day.date} scope="col" className={day.date === selectedDate ? 'is-selected' : undefined}>
          {weekdays[index]}<span>{Number(day.date.slice(4, 6))}.{Number(day.date.slice(6, 8))}</span>
        </th>)}
      </tr></thead>
      <tbody>{Array.from({length: periods}, (_, index) => {
        const period = index + 1;
        const obscured = data.preview && period > 1;
        return <tr key={period} className={obscured ? 'preview-obscured' : undefined} aria-hidden={obscured || undefined}>
          <th scope="row">{period}</th>
          {days.map(day => {
            const item = day.items?.find(lesson => Number(lesson.period) === period);
            const classes = [day.date === selectedDate && 'is-selected', item?.changed && 'is-changed'].filter(Boolean).join(' ');
            return <td key={day.date} className={classes} aria-label={item?.changed ? '변경된 수업' : undefined}>
              <Lesson item={item} />
            </td>;
          })}
        </tr>;
      })}</tbody>
    </table>
    {data.preview && <MembershipGate />}
  </>;
}

export function mountWeeklyTimetable(container) {
  const root = createRoot(container);
  return function render(props, loading = false) {
    container.classList.toggle('is-preview', !!props?.data.preview);
    flushSync(() => root.render(props ? <WeeklyTimetable {...props} />
      : loading ? <p className="weekly-message" role="status">주간 시간표를 불러오는 중입니다.</p> : null));
  };
}
