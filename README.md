# 제주 오늘 뭐 먹지?

정적 HTML/CSS/JavaScript와 Vercel Serverless Function으로 구성된 제주 식당 검색 예제입니다. 메인 검색은 카카오 로컬 API의 **키워드로 장소 검색**과 카카오 지도 SDK를 사용합니다. 카카오·네이버 웹페이지를 크롤링하거나 장소 정보를 저장하지 않습니다.

## 동작 구조

- `api/places.js`: 서버에서만 `KAKAO_REST_API_KEY`로 카카오 장소 검색 API를 호출합니다.
- `api/kakao-config.js`: 지도 SDK에만 사용할 공개 JavaScript 키를 반환합니다.
- 메인 화면: 실제 장소명, 카테고리, 주소, 카카오맵 상세 링크와 지도 마커만 표시합니다. 목업 메뉴 가격과 좌석 상태는 표시하지 않습니다.
- `admin.html`: 기존 목업 식당의 좌석 상태와 `localStorage` 동작을 그대로 유지합니다.

## 1. 카카오 디벨로퍼스 설정

1. [카카오 디벨로퍼스](https://developers.kakao.com/)에 로그인한 뒤 **내 애플리케이션 → 애플리케이션 추가하기**에서 앱을 생성합니다.
2. 생성한 앱의 **앱 → 플랫폼 키**에서 `REST API 키`와 `JavaScript 키`를 각각 확인합니다.
3. 같은 화면에서 **JavaScript 키 → JavaScript SDK 도메인**에 아래 중 실제 사용할 주소를 등록합니다.
   - Live Server를 계속 열어둔 주소가 아니라, `vercel dev --listen 5500`으로 실행한 경우: `http://127.0.0.1:5500`
   - 기본 Vercel 개발 주소를 사용하는 경우: 터미널에 표시된 주소(보통 `http://localhost:3000`)
   - 운영 배포 주소: 예) `https://your-project.vercel.app`
4. 저장합니다. JavaScript 키는 등록된 도메인에서만 지도 SDK를 불러올 수 있습니다.

## 2. 환경 변수 설정

`.env.example`을 참고해 프로젝트 루트에 `.env.local`을 만들고 실제 키를 입력합니다. `.env.local`은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.

```text
KAKAO_REST_API_KEY=발급받은_REST_API_키
KAKAO_JAVASCRIPT_KEY=발급받은_JavaScript_키
```

`KAKAO_REST_API_KEY`는 서버리스 함수에서만 `Authorization: KakaoAK ...` 헤더로 사용합니다. HTML이나 `app.js`에 넣지 마세요. `KAKAO_JAVASCRIPT_KEY`는 지도 SDK 로드에만 쓰이는 공개 키입니다.

### Vercel 대시보드에서 등록

1. Vercel 프로젝트를 열고 **Settings → Environment Variables**로 이동합니다.
2. `KAKAO_REST_API_KEY`, `KAKAO_JAVASCRIPT_KEY`를 각각 추가합니다.
3. Development, Preview, Production 중 필요한 환경을 선택합니다. 일반적으로 세 환경 모두에 등록합니다.
4. 환경 변수를 추가하거나 변경한 뒤에는 새 배포를 실행합니다.

## 3. 로컬 실행

```bash
npx vercel dev --listen 5500
```

브라우저에서 `http://127.0.0.1:5500`을 엽니다. 처음 사용하는 경우 Vercel 로그인 또는 프로젝트 연결이 필요할 수 있습니다.

Live Server는 정적 파일만 제공하므로 Vercel Serverless Function인 `/api/places`, `/api/kakao-config`를 실행하지 못합니다. 따라서 Live Server 주소에서 발생하는 `/api/places` 404는 API 코드 문제가 아니라 서버 실행 방식 문제입니다. 반드시 `vercel dev`로 실행하세요.

## 4. Vercel 배포

1. 이 프로젝트를 Git 저장소에 push하고 Vercel에서 **Add New → Project**로 가져오거나, 프로젝트 루트에서 `npx vercel`을 실행합니다.
2. Vercel 대시보드에서 두 환경 변수를 등록합니다.
3. 배포 후 생성된 `https://...vercel.app` 주소를 카카오 디벨로퍼스의 **JavaScript SDK 도메인**에 추가합니다.
4. 새로 배포합니다. `api/` 디렉터리의 JavaScript 파일은 Vercel에서 자동으로 Serverless Function으로 인식되므로 별도 `vercel.json`은 필요하지 않습니다.

## 오류 안내

- **서버 실행 방식 오류**: Live Server에서 실행 중입니다. `vercel dev`로 전환하세요.
- **API 키 미설정/오류**: `.env.local` 또는 Vercel 환경 변수의 두 키 이름과 값을 확인하세요.
- **네트워크 오류**: 카카오 API 서버에 연결할 수 없는 상태입니다. 인터넷 연결과 카카오 API 상태를 확인한 뒤 재시도하세요.
