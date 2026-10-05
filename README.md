# 운동 챌린지 (모바일 웹)

2026 하반기 운동 챌린지 진행 현황을 휴대폰으로 보고, 관리자가 일일 인증을 기록하는 웹앱.
원본: 구글 시트 「참가자 정보 / 진행성적 / 최종결과」 3개 탭을 화면으로 옮김.

- **누구나(로그인 없음)**: 종합 랭킹, 루틴 진행성적, 인바디 채점표, 참가자별 상세
- **관리자(PIN)**: 일일 인증 입력, 챌린지 설정, JSON 백업

## 데이터 출처

- **참가자·인바디** → 구글 시트 「참가자 정보」 탭(`참가자` 헤더 행 아래 ~ `합계` 행 전)을 CSV로 읽음. 1분 캐시.
  시트는 「링크가 있는 모든 사용자 보기 가능」이어야 함. 이름이 기록의 키이므로 이름 변경 시 기존 기록과 연결이 끊김.
  시트에서 빠진 참가자의 인증 기록은 지우지 않고 숨김(다시 추가하면 복원).
- **일일 인증 기록·설정** → 앱 저장소(Redis / 로컬 파일)

## 화면

| 경로 | 내용 |
|---|---|
| `/` | D-day, 평균 점수/달성률, 1위, 종합 랭킹, 공식 룰 |
| `/routine` | 참가자별 운동·식단·패널티 집계 + 일별 로그 |
| `/inbody` | 시작→최종 체중/골격근, 점수 |
| `/p/[id]` | 참가자 상세 (점수, 86일 인증 히트맵, 기록) |
| `/admin` | PIN 입력 → 관리 메뉴 / 설정 |
| `/admin/daily?date=YYYY-MM-DD` | 날짜별 전원 인증 일괄 입력 |
| `/admin/participants` | 구글 시트에서 읽은 참가자·인바디 확인, 즉시 새로고침 |

## 채점 규칙 (`lib/scoring.ts`)

- 인바디: 체중 1kg당 1점(컷팅=감량, 벌크=증량 방향, 반대면 감점), 골격근 증량 1kg당 2점
- 루틴: 인증 1건(운동/식단1/식단2)당 1점 − 패널티
- 달성률: 인증 건수 ÷ (오늘까지 경과일 × 주 6회/7 × 3건)
- 종합 = 인바디 + 루틴, 동점은 같은 순위

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # ADMIN_PIN 입력
npm run dev
```

http://localhost:3000 — 저장소 설정이 없으면 `.data/db.json`에 저장되며, 처음 실행 시 시트 데이터로 초기화됩니다.

## 환경변수 (`.env.example` 참고)

| 이름 | 설명 |
|---|---|
| `SHEET_ID` / `SHEET_GID` | 참가자 시트 (기본값: 현재 챌린지 시트, gid 0) |
| `ADMIN_PIN` | 관리자 PIN (필수). 미설정 시 관리자 기능 잠김 |
| `SESSION_SECRET` | 관리자 쿠키 서명용 임의 문자열 (배포 시 필수) |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis. 설정되면 Redis에 저장 |

## 배포 (GitHub + Vercel)

1. GitHub에 저장소 생성 후 push
2. Vercel에서 해당 저장소 Import (Framework: Next.js 자동 인식)
3. Vercel 프로젝트 → **Storage → Upstash for Redis** 연결 → `KV_REST_API_URL`, `KV_REST_API_TOKEN` 자동 주입
   (Vercel은 파일시스템이 읽기 전용이라 Redis 없이는 저장이 실패합니다)
4. Settings → Environment Variables에 `ADMIN_PIN`, `SESSION_SECRET` 추가 후 Redeploy

전체 데이터는 Redis 키 `challenge:db` 하나에 JSON으로 저장됩니다. 관리 화면의 「데이터 백업」으로 수시로 내려받아 두세요.
