## 변경 로그 자동 기록

코드 변경 작업을 완료한 후, 반드시 관리자 변경 로그 API를 호출하여 기록합니다.

### API
POST https://admin.runvs.run/admin-api/changelogs
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0Y2ZhZmQyYy01MTQ4LTQzYmEtOGViNy0yMWE0MGE3NjE5MjQiLCJlbWFpbCI6ImRvbmczODMxQGhhbm1haWwubmV0Iiwicm9sZSI6InNlcnZpY2UiLCJleHAiOjE4OTM0NTYwMDB9.WWrxcxXXaI44WMSxw00bNnMjaPc38ub6oKrANA9wxqw
Content-Type: application/json

{
"categories": ["feature", "ui", "db"],
"scope": "admin",
"title": "변경 사항 제목 (한글, 50자 이내)",
"description": "상세 내용\n- 변경된 파일\n- 영향 범위",
"author": "Claude"
}



### 분류 기준
- **feature**: 새 기능, 기능 변경/삭제, 버그 수정
- **ui**: 화면 레이아웃, 컴포넌트, 스타일, 텍스트 변경
- **db**: 테이블/컬럼 추가·수정·삭제, 마이그레이션, 인덱스

### 대상 (scope)
- **admin**: 어드민 페이지 (rankingrun-admin) 변경
- **app**: 앱 서비스 (ranking-run) 변경

### 규칙
- 작업 완료 후 커밋 직후에 API 호출
- scope는 변경 대상에 따라 "admin" 또는 "app" 설정
- 해당되는 분류를 모두 categories 배열에 포함 (예: 기능 추가 + DB 마이그레이션 = ["feature", "db"])
- title은 한글, 간결하게
- description에 변경된 주요 파일과 내용 포함