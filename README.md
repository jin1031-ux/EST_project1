# 제주 오늘 뭐 먹지?

정적 HTML/CSS/JavaScript와 Vercel Serverless Function으로 구성된 제주 식당 검색 예제입니다. 메인 검색은 **네이버 지역 검색 API**와 **네이버클라우드 Maps Web Dynamic Map**만 사용합니다. 네이버 지도·플레이스 웹페이지를 크롤링하거나, 검색 결과를 DB·파일·`localStorage`에 영구 저장하지 않습니다.

## 동작 구조

- `api/naver-places.js`: 서버에서만 네이버 지역 검색 API를 호출합니다.
- `api/naver-map-config.js`: Web Dynamic Map SDK에 필요한 공개 식별자인 `NAVER_MAP_CLIENT_ID`만 브라우저에 전달합니다. Secret은 전달하지 않습니다.
- 메인 검색 결과: 네이버 API가 제공하는 상호명, 카테고리, 주소, 네이버 원본 링크만 표시합니다. 목업 메뉴 가격, 좌석 상태, 리뷰 정보는 표시하지 않습니다.
- 지도 마커: 지역 검색 API의 WGS84 `mapx`/`mapy` 값을 정규화해 네이버 Maps `LatLng`에 표시합니다.
- `admin.html`: 기존 목업 식당의 좌석 상태와 `localStorage` 동작을 그대로 유지합니다.

## 1. 네이버 지역 검색 API 신청

1. [네이버 개발자센터](https://developers.naver.com/)에 로그인합니다.
2. **Application → 애플리케이션 등록**에서 애플리케이션을 만들고, 사용 API로 **검색**을 선택합니다.
3. 발급된 Client ID와 Client Secret을 확인합니다. 이 값은 아래 환경 변수의 `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET`에 사용합니다.
4. Search API 키는 서버리스 함수에서만 사용합니다. HTML, `app.js`, Git 저장소에 넣지 마세요.

## 2. 네이버클라우드 Maps Web Dynamic Map 설정

1. [네이버클라우드 콘솔](https://console.ncloud.com/)에서 Maps 이용 약관에 동의합니다.
2. **Services → Application Services → Maps → Application**에서 애플리케이션을 등록합니다.
3. 서비스 선택에서 **Web Dynamic Map**을 선택합니다.
4. Web 서비스 URL에 운영 도메인 `https://estproject-weld.vercel.app`을 등록합니다.
5. 로컬 테스트 주소도 사용한다면 `http://127.0.0.1:5500` 또는 실제 `vercel dev`가 표시한 URL을 함께 등록합니다.
6. 발급된 Client ID와 Client Secret을 확인합니다. 각각 `NAVER_MAP_CLIENT_ID`, `NAVER_MAP_CLIENT_SECRET`에 사용합니다.

등록한 Web 서비스 URL과 브라우저 주소가 다르면 지도 SDK 인증이 실패할 수 있습니다.

## 3. 환경 변수

`.env.example`을 참고해 프로젝트 루트에 `.env.local`을 만들고 실제 키를 입력합니다. `.env.local`은 `.gitignore`에 포함되어 Git에 커밋되지 않습니다.

```text
NAVER_SEARCH_CLIENT_ID=네이버_검색_Client_ID
NAVER_SEARCH_CLIENT_SECRET=네이버_검색_Client_Secret
NAVER_MAP_CLIENT_ID=네이버클라우드_Maps_Client_ID
NAVER_MAP_CLIENT_SECRET=네이버클라우드_Maps_Client_Secret
```

## 4. Vercel 환경 변수와 배포

1. Vercel 프로젝트의 **Settings → Environment Variables**에서 위 네 변수를 각각 등록합니다.
2. Development, Preview, Production 환경을 필요에 맞게 선택합니다. 운영 기능에는 Production을 반드시 선택합니다.
3. 변수 추가 또는 변경 후 새 배포를 실행합니다. 이미 배포된 버전에는 새 변수 값이 적용되지 않습니다.
4. Git 저장소를 Vercel에 연결하거나 프로젝트 루트에서 `npx vercel --prod`를 실행합니다.
5. 배포 후 `https://estproject-weld.vercel.app`로 접속해 검색과 지도 마커를 확인합니다.

Vercel은 루트 `api/` 디렉터리의 JavaScript 파일을 Serverless Function으로 자동 인식하므로 별도 `vercel.json`은 필요하지 않습니다.

## 5. 로컬 실행

```bash
npx vercel dev --listen 5500
```

브라우저에서 `http://127.0.0.1:5500`을 엽니다. Live Server는 정적 파일만 제공하므로 `/api/naver-places`, `/api/naver-map-config`를 실행하지 못합니다. 로컬 테스트는 반드시 `vercel dev`로 진행하세요.

## API 결과를 저장하거나 임의로 가공하지 않는 이유

네이버 지역 검색 API 결과는 네이버가 제공하는 최신 검색 데이터입니다. 이 프로젝트는 검색 시점에 필요한 상호명·카테고리·주소·원본 링크·좌표만 화면에 표시하고, 결과를 저장하거나 목업 가격·좌석·리뷰와 결합하지 않습니다. 이렇게 해야 출처와 최신성을 명확히 하고, API 약관 및 데이터 사용 범위를 지킬 수 있습니다.

## 오류 안내

- **검색어 미입력**: 메뉴 또는 식당 키워드를 입력합니다.
- **API 키 미설정**: 네 개의 환경 변수 이름과 값을 확인합니다.
- **지도 API 설정/허용 도메인 오류**: 네이버클라우드 Maps의 Web 서비스 URL을 확인합니다.
- **요청 한도 초과**: 잠시 후 재시도합니다.
- **네트워크 오류**: 인터넷 연결 및 네이버 API 상태를 확인합니다.
- **검색 결과 없음**: 다른 메뉴·식당 키워드로 검색합니다.
