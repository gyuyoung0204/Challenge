/**
 * 운동 챌린지 웹앱 → 구글 시트 쓰기용 Apps Script
 *
 * 설치: 시트 메뉴 [확장 프로그램 → Apps Script] 에 이 파일 내용을 붙여넣고
 *       SECRET 값을 바꾼 뒤 [배포 → 새 배포 → 웹 앱] (실행: 나, 액세스: 모든 사용자)
 *       → 나온 URL과 SECRET을 Vercel 환경변수 SHEET_WEBAPP_URL / SHEET_WEBAPP_SECRET 에 입력
 */

const SECRET = '여기에-긴-랜덤-문자열-입력'; // Vercel의 SHEET_WEBAPP_SECRET 과 동일하게
const LOG_SHEET_GID = 1065201099; // 「진행성적」 탭
const SETTINGS_SHEET = '앱설정'; // 없으면 자동 생성
const TZ = 'Asia/Seoul';
const DONE = '완료';
const NOT_DONE = '미완료';

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
    } finally {
      lock.releaseLock();
    }
    return json({ ok: true });
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

  const rows = range
    .getValues()
    .filter((r) => fmtDate(r[0]) && String(r[1]).trim())
    .map((r) => [fmtDate(r[0]), String(r[1]).trim(), r[2], r[3], r[4], r[5], r[6]])
    .filter((r) => !(r[0] === body.date && names.has(r[1])));

  body.rows.forEach((x) => {
    rows.push([
      body.date,
      x.name,
      x.workout ? DONE : NOT_DONE,
      x.meal1 ? DONE : NOT_DONE,
      x.meal2 ? DONE : NOT_DONE,
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
