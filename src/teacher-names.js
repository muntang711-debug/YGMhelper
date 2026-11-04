// The temporary name list lives in a Worker Secret, never in public assets.
export function readTeacherNames(value, date, schoolCode) {
  try {
    const data = JSON.parse(value);
    const month = Number(date.slice(4, 6));
    const year = Number(date.slice(0, 4)) - (month < 3 ? 1 : 0);
    const semester = month >= 3 && month <= 7 ? 1 : 2;
    if (data.schoolCode !== schoolCode || data.year !== year || data.semester !== semester) return null;
    return data.teachers && typeof data.teachers === 'object' ? data.teachers : null;
  } catch { return null; }
}

export function teacherDisplayName(masked, teacherId, names) {
  const entry = names?.[teacherId];
  // A changed/reassigned teacher ID must not receive an old name.
  if (!entry || entry.masked !== masked || typeof entry.full !== 'string' ||
      !/^[가-힣]{2,5}$/.test(entry.full) || !masked.includes('*')) return masked;
  const pattern = new RegExp('^' + masked.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.') + '$');
  return pattern.test(entry.full) ? entry.full : masked;
}
