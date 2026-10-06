/**
 * 운동 챌린지 웹앱 → 구글 시트 쓰기용 Apps Script
 *
 * 설치: 시트 메뉴 [확장 프로그램 → Apps Script] 에 이 파일 내용을 붙여넣고
 *       SECRET 값을 바꾼 뒤 [배포 → 새 배포 → 웹 앱] (실행: 나, 액세스: 모든 사용자)
 *       → 나온 URL과 SECRET을 Vercel 환경변수 SHEET_WEBAPP_URL / SHEET_WEBAPP_SECRET 에 입력
 *
 * ⚠️ 코드 수정 후에는 「새 배포」가 아니라 [배포 → 배포 관리 → ✏️ → 버전: 새 버전 → 배포]
 *    (새 배포를 만들면 URL이 바뀌어 Vercel은 계속 옛 코드를 호출함)
 *    적용 확인: https://<사이트>/api/health 의 「스크립트_버전」이 아래 VERSION 과 같으면 OK
 */

const VERSION = '2026-10-06-미제출'; // 앱 /api/health 에 표시되는 스크립트 버전
const SECRET = '여기에-긴-랜덤-문자열-입력'; // Vercel의 SHEET_WEBAPP_SECRET 과 동일하게
const LOG_SHEET_GID = 1065201099; // 「진행성적」 탭
const SETTINGS_SHEET = '앱설정'; // 없으면 자동 생성
const TZ = 'Asia/Seoul';
const DONE = '완료';
const NOT_DONE = '미제출'; // 드롭다운에 이 값이 없으면 '완료' 외의 다른 선택지, 그것도 없으면 빈칸

/** 버전 확인용 (비밀값·데이터 없음) */
function doGet() {
  return json({ ok: true, version: VERSION });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return json({ ok: false, error: 'unauthorized' });
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      if (body.action === 'saveDaily') saveDaily(body);
      else if (body.action === 'saveSettings') saveSettings(body.settings);
      else return json({ ok: false, error: 'unknown action' });
      SpreadsheetApp.flush(); // 쓰기 오류(드롭다운 검증 등)를 여기서 잡아 JSON으로 응답
    } finally {
      lock.releaseLock();
    }
    return json({ ok: true, version: VERSION });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fmtDate(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return String(v).trim();
}

/** 수식으로 해석되지 않게 */
function safeText(s) {
  s = String(s || '');
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/**
 * 「인증 일자」 헤더 아래 로그(A~G열)에서 해당 날짜·참가자 행을 교체하고 날짜순으로 다시 씀.
 * body = { date, names: [그날 대상 참가자 전체], rows: [{ name, workout, meal1, meal2, penalty, memo }] }
 */
function saveDaily(body) {
  const sh = SpreadsheetApp.getActive().getSheets().find((s) => s.getSheetId() === LOG_SHEET_GID);
  if (!sh) throw new Error('진행성적 탭을 찾을 수 없습니다');

  const colA = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  const head = colA.findIndex((r) => String(r[0]).trim() === '인증 일자');
  if (head < 0) throw new Error('「인증 일자」 헤더를 찾을 수 없습니다');

  const start = head + 2; // 첫 데이터 행 (1부터 시작)
  const count = Math.max(sh.getLastRow() - start + 1, 1);
  const range = sh.getRange(start, 1, count, 7);
  const names = new Set(body.names);

  // 미체크 칸에 쓸 값: 드롭다운 선택지에 맞춤 (검증 거부로 저장이 끊기지 않게)
  let notDone = NOT_DONE;
  const rule = sh.getRange(start, 3).getDataValidation();
  if (rule && rule.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    const options = (rule.getCriteriaValues()[0] || []).map(String);
    if (options.indexOf(NOT_DONE) < 0) notDone = options.find((o) => o !== DONE) || '';
  }

  const rows = range
    .getValues()
    .filter((r) => fmtDate(r[0]) && String(r[1]).trim())
    .map((r) => [fmtDate(r[0]), String(r[1]).trim(), r[2], r[3], r[4], r[5], r[6]])
    .filter((r) => !(r[0] === body.date && names.has(r[1])));

  body.rows.forEach((x) => {
    rows.push([
      body.date,
      x.name,
      x.workout ? DONE : notDone,
      x.meal1 ? DONE : notDone,
      x.meal2 ? DONE : notDone,
      Number(x.penalty) || 0,
      safeText(x.memo),
    ]);
  });
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)); // 같은 날짜 안에서는 순서 유지

  range.clearContent(); // 서식·드롭다운은 유지
  if (rows.length) {
    // 기록이 계속 쌓여 시트 행이 모자라면 늘리고, 첫 데이터 행의 서식·드롭다운을 복사
    const needLast = start + rows.length - 1;
    const maxRows = sh.getMaxRows();
    if (needLast > maxRows) {
      sh.insertRowsAfter(maxRows, needLast - maxRows + 50);
      sh.getRange(start, 1, 1, 7).copyTo(sh.getRange(maxRows + 1, 1, needLast - maxRows + 50, 7), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
      sh.getRange(start, 1, 1, 7).copyTo(sh.getRange(maxRows + 1, 1, needLast - maxRows + 50, 7), SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
    }
    sh.getRange(start, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd');
    sh.getRange(start, 1, rows.length, 7).setValues(rows);
  }
}

/** 「앱설정」 탭에 key / value 로 저장 */
function saveSettings(settings) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SETTINGS_SHEET) || ss.insertSheet(SETTINGS_SHEET);
  const rows = [['key', 'value']].concat(Object.keys(settings).map((k) => [k, String(settings[k])]));
  sh.clearContents();
  sh.getRange(1, 1, rows.length, 2).setNumberFormat('@').setValues(rows);
}
