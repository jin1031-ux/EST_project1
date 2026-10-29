# 제주 오늘 뭐 먹지?

제주 식당을 찾는 정적 HTML/CSS/JavaScript 웹사이트입니다. 메인 검색은 Vercel Serverless Function을 통해 **카카오 로컬 장소 검색 REST API**만 호출하며, 지도 SDK·마커·웹페이지 크롤링은 사용하지 않습니다.

## 동작 구조

- 브라우저는 `/api/places`만 호출합니다.
- `api/places.js`는 서버 환경 변수 `KAKAO_REST_API_KEY`로 카카오 공식 장소 검색 REST API를 요청합니다.
- 검색 결과에는 카카오 API가 제공하는 상호명, 음식 카테고리, 도로명 주소(없으면 지번 주소), 카카오맵 상세 링크만 표시합니다.
- 결과는 저장하지 않으며, 기존 목업 식당의 좌석 상태는 관리자 화면의 localStorage 기능에만 사용됩니다.

## Vercel 환경 변수 설정 및 재배포

1. 카카오 디벨로퍼스에서 앱을 만들고 **REST API 키**를 확인합니다.
2. Vercel 프로젝트의 **Settings → Environment Variables**로 이동합니다.
3. 다음 이름으로 REST API 키를 등록합니다.

   ```text
   KAKAO_REST_API_KEY=발급받은_카카오_REST_API_키
   ```

4. Production 환경을 포함해 필요한 Development·Preview 환경을 선택해 저장합니다.
5. 환경 변수를 추가하거나 변경한 뒤에는 **Deployments → Redeploy**로 새 배포를 실행합니다. 기존 배포에는 새 값이 적용되지 않습니다.

`.env.example`에는 변수 이름만 제공됩니다. 실제 키는 Git에 커밋하거나 HTML·`app.js`에 작성하지 마세요.

## 로컬 실행

Vercel Serverless Function을 함께 실행하려면 Live Server가 아닌 아래 명령을 사용합니다.

```bash
npx vercel dev --listen 5500
```

프로젝트 루트의 `.env.local`에 `KAKAO_REST_API_KEY`를 설정한 뒤 `http://127.0.0.1:5500`에서 테스트할 수 있습니다.
