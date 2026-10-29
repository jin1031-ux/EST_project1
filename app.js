const STORAGE_KEY = "today-menu-seat-statuses";

function getSavedStatuses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function getRestaurant(id) {
  const restaurant = restaurants.find((item) => item.id === id);
  if (!restaurant) return null;
  const saved = getSavedStatuses()[id];
  return saved ? { ...restaurant, seatStatus: saved.status, updatedAt: saved.updatedAt } : restaurant;
}

function getAllRestaurants() {
  return restaurants.map((restaurant) => getRestaurant(restaurant.id));
}

function formatTime(value) {
  if (!value) return "갱신 이력 없음";
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
  }).format(date);
}

function statusClass(status) {
  return `status-${status.replace(" ", "-")}`;
}

function statusBadge(restaurant) {
  return `<span class="status-badge ${statusClass(restaurant.seatStatus)}">${restaurant.seatStatus}</span>`;
}

function findMatchedMenu(restaurant, term) {
  return restaurant.menu.find((menu) => menu.name.toLowerCase().includes(term.toLowerCase()));
}

function searchRestaurants(term) {
  return getAllRestaurants().map((restaurant) => ({ restaurant, menu: findMatchedMenu(restaurant, term) })).filter((result) => result.menu);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function createSearchError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getSearchErrorMessage(code, fallback) {
  const messages = {
    SERVER_NOT_RUNNING: "서버 실행 방식 오류예요. Live Server가 아닌 `vercel dev`로 프로젝트를 실행해 주세요.",
    REST_KEY_MISSING: "API 키 미설정: KAKAO_REST_API_KEY를 Vercel 환경 변수 또는 .env.local에 설정해 주세요.",
    REST_KEY_INVALID: "API 키 오류: 카카오 REST API 키가 올바른지 확인해 주세요.",
    JAVASCRIPT_KEY_MISSING: "API 키 미설정: KAKAO_JAVASCRIPT_KEY를 Vercel 환경 변수 또는 .env.local에 설정해 주세요.",
    KAKAO_NETWORK_ERROR: "네트워크 오류: 카카오 장소 검색 서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.",
    KAKAO_API_ERROR: "카카오 장소 검색 서비스 오류예요. 잠시 후 다시 시도해 주세요."
  };
  return messages[code] || fallback || "장소 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

let kakaoMap;
let kakaoMarkers = [];
let kakaoMapPromise;

async function loadKakaoMapSdk() {
  if (window.kakao?.maps) return window.kakao;
  if (kakaoMapPromise) return kakaoMapPromise;

  kakaoMapPromise = (async () => {
    let response;
    try {
      response = await fetch("/api/kakao-config");
    } catch (error) {
      throw createSearchError("KAKAO_NETWORK_ERROR", "카카오 지도 설정 서버에 연결하지 못했습니다.");
    }
    const payload = await response.json().catch(() => ({}));
    if (response.status === 404) throw createSearchError("SERVER_NOT_RUNNING");
    if (!response.ok) throw createSearchError(payload.code, payload.error || "카카오 지도 설정을 불러오지 못했습니다.");
    const { javascriptKey } = payload;
    if (!javascriptKey) throw new Error("카카오 JavaScript 키가 설정되지 않았습니다.");

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(javascriptKey)}&autoload=false`;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));
      document.head.append(script);
    });
    await new Promise((resolve) => window.kakao.maps.load(resolve));
    return window.kakao;
  })();

  return kakaoMapPromise;
}

async function ensureKakaoMap() {
  const kakao = await loadKakaoMapSdk();
  if (!kakaoMap) {
    kakaoMap = new kakao.maps.Map(document.querySelector("#kakao-map"), {
      center: new kakao.maps.LatLng(33.4996, 126.5312),
      level: 9
    });
  }
  return kakao;
}

function clearKakaoMarkers() {
  kakaoMarkers.forEach((marker) => marker.setMap(null));
  kakaoMarkers = [];
}

function drawKakaoPlaces(kakao, places) {
  clearKakaoMarkers();
  const bounds = new kakao.maps.LatLngBounds();
  places.forEach((place) => {
    const latitude = Number(place.y);
    const longitude = Number(place.x);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const position = new kakao.maps.LatLng(latitude, longitude);
    const marker = new kakao.maps.Marker({ position, map: kakaoMap, title: place.name });
    const infoWindow = new kakao.maps.InfoWindow({ content: `<div class="map-info-window">${escapeHtml(place.name)}</div>` });
    kakao.maps.event.addListener(marker, "click", () => infoWindow.open(kakaoMap, marker));
    kakaoMarkers.push(marker);
    bounds.extend(position);
  });
  if (kakaoMarkers.length) kakaoMap.setBounds(bounds);
}

function initIndex() {
  const form = document.querySelector("#search-form");
  const input = document.querySelector("#menu-search");
  const results = document.querySelector("#results");
  const notice = document.querySelector("#search-notice");
  const mapStatus = document.querySelector("#map-status");
  const submitButton = form.querySelector("button[type='submit']");
  const params = new URLSearchParams(window.location.search);
  const initialTerm = params.get("q");

  function renderPlaces(places) {
    results.innerHTML = places.map((place) => `
      <article class="restaurant-card place-card">
        <div class="card-top"><h3>${escapeHtml(place.name)}</h3><span class="place-source">카카오맵</span></div>
        <p class="place-category">${escapeHtml(place.category || "카테고리 정보 없음")}</p>
        <p class="address">${escapeHtml(place.roadAddress || place.address || "주소 정보 없음")}</p>
        <a class="place-link" href="${escapeHtml(place.placeUrl)}" target="_blank" rel="noopener">카카오맵에서 상세 보기 <span>↗</span></a>
      </article>`).join("");
  }

  async function submitSearch(term) {
    input.value = term;
    history.replaceState(null, "", `index.html?q=${encodeURIComponent(term)}`);
    const cleanTerm = term.trim();
    results.innerHTML = "";
    if (!cleanTerm) {
      notice.textContent = "메뉴 또는 식당 키워드를 입력해 주세요.";
      mapStatus.textContent = "검색어를 입력하면 지도와 마커가 표시됩니다.";
      return;
    }
    submitButton.disabled = true;
    notice.textContent = `‘${cleanTerm}’ 장소를 카카오맵에서 검색 중이에요.`;
    mapStatus.textContent = "지도를 준비하고 있어요.";
    try {
      let placeResponse;
      try {
        placeResponse = await fetch(`/api/places?query=${encodeURIComponent(`제주 ${cleanTerm}`)}`);
      } catch (error) {
        throw createSearchError("KAKAO_NETWORK_ERROR");
      }
      const payload = await placeResponse.json().catch(() => ({}));
      if (placeResponse.status === 404) throw createSearchError("SERVER_NOT_RUNNING");
      if (!placeResponse.ok) throw createSearchError(payload.code, payload.error || "장소 검색에 실패했습니다.");
      const kakao = await ensureKakaoMap();
      const places = Array.isArray(payload.places) ? payload.places : [];
      if (!places.length) {
        notice.textContent = `‘${cleanTerm}’에 대한 카카오맵 장소 검색 결과가 없어요.`;
        mapStatus.textContent = "표시할 장소 마커가 없습니다.";
        clearKakaoMarkers();
        return;
      }
      renderPlaces(places);
      drawKakaoPlaces(kakao, places);
      notice.textContent = `카카오맵에서 찾은 ‘${cleanTerm}’ 장소 ${places.length}곳이에요.`;
      mapStatus.textContent = "마커를 선택하면 장소 이름을 확인할 수 있어요.";
    } catch (error) {
      notice.textContent = getSearchErrorMessage(error.code, error.message);
      mapStatus.textContent = error.code === "SERVER_NOT_RUNNING"
        ? "정적 Live Server에서는 /api 함수가 실행되지 않습니다."
        : "카카오 지도 설정 또는 네트워크 연결을 확인해 주세요.";
      results.innerHTML = "";
    } finally {
      submitButton.disabled = false;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitSearch(input.value);
  });
  document.querySelectorAll(".category-chip").forEach((chip) => {
    chip.addEventListener("click", () => submitSearch(chip.dataset.category));
  });
  document.querySelectorAll(".recommendation-button").forEach((button) => {
    button.addEventListener("click", () => submitSearch(button.dataset.recommendation));
  });
  if (initialTerm) submitSearch(initialTerm);
}

function initDetail() {
  const params = new URLSearchParams(window.location.search);
  const restaurant = getRestaurant(params.get("id"));
  const page = document.querySelector("#detail-content");
  const searchTerm = params.get("q");
  const backUrl = searchTerm ? `index.html?q=${encodeURIComponent(searchTerm)}` : "index.html";
  if (!restaurant) {
    page.innerHTML = `<section class="empty-state"><p class="eyebrow">정보를 찾을 수 없어요</p><h1>요청한 식당 정보가 없습니다.</h1><a class="button" href="${backUrl}">메인으로 돌아가기</a></section>`;
    return;
  }
  const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(restaurant.address)}`;
  const naverPlaceUrl = `https://map.naver.com/p/search/${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`;
  page.innerHTML = `
    <a class="back-link" href="${backUrl}">← 검색 결과로 돌아가기</a>
    <section class="detail-hero">
      <p class="eyebrow">오늘의 식당</p><h1>${restaurant.name}</h1><p class="address large-address">${restaurant.address}</p>
      <div class="detail-actions">
        <a class="button" target="_blank" rel="noopener" href="${mapUrl}">길 찾기 <span>↗</span></a>
        <a class="button" target="_blank" rel="noopener" href="${naverPlaceUrl}">네이버 플레이스에서 보기 <span>↗</span></a>
      </div>
    </section>
    <section class="detail-grid">
      <article class="info-panel"><p class="eyebrow">메뉴와 가격</p><h2>판매 메뉴</h2>
        <ul class="menu-list">${restaurant.menu.map((menu) => `<li><span>${menu.name}</span><strong>${menu.price.toLocaleString()}원</strong></li>`).join("")}</ul>
      </article>
      <article class="info-panel seat-panel"><p class="eyebrow">좌석 현황</p><h2>${statusBadge(restaurant)}</h2>
        <p class="updated">마지막 갱신 · ${formatTime(restaurant.updatedAt)}</p>
        <p class="caution">좌석 정보는 수동 갱신 정보이며 실제와 다를 수 있습니다.</p>
      </article>
    </section>`;

  const reservationPanel = document.createElement("section");
  reservationPanel.className = "reservation-panel";
  reservationPanel.innerHTML = `
    <div><p class="eyebrow">TABLE RESERVATION</p><h2>방문 인원을 선택해 주세요</h2><p>예약 요청 후 식당에서 확인 안내를 드립니다.</p></div>
    <form id="reservation-form" class="reservation-form">
      <label for="party-size">인원</label>
      <select id="party-size" name="party-size">${[1, 2, 3, 4, 5, 6, 7, 8].map((count) => `<option value="${count}">${count}명</option>`).join("")}</select>
      <button type="submit">예약하기</button>
    </form>
    <p id="reservation-feedback" class="reservation-feedback" aria-live="polite"></p>`;
  page.append(reservationPanel);
  reservationPanel.querySelector("#reservation-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const count = reservationPanel.querySelector("#party-size").value;
    reservationPanel.querySelector("#reservation-feedback").textContent = `${restaurant.name} ${count}명 예약 요청이 접수됐어요. 식당 확인 후 안내해 드릴게요.`;
  });
}

function initAdmin() {
  const list = document.querySelector("#admin-list");
  const feedback = document.querySelector("#save-feedback");
  function render() {
    list.innerHTML = getAllRestaurants().map((restaurant) => `
      <article class="admin-card" data-id="${restaurant.id}">
        <div><h2>${restaurant.name}</h2><p>${restaurant.address}</p><p class="updated">마지막 갱신 · ${formatTime(restaurant.updatedAt)}</p></div>
        <div class="admin-controls"><label>좌석 상태 <select aria-label="${restaurant.name} 좌석 상태">${seatStatuses.map((status) => `<option value="${status}" ${status === restaurant.seatStatus ? "selected" : ""}>${status}</option>`).join("")}</select></label><button type="button" class="save-button">변경 사항 저장</button></div>
      </article>`).join("");
  }
  list.addEventListener("click", (event) => {
    if (!event.target.matches(".save-button")) return;
    const card = event.target.closest(".admin-card");
    const saved = getSavedStatuses();
    saved[card.dataset.id] = { status: card.querySelector("select").value, updatedAt: new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (error) { /* Mock data remains usable if storage is unavailable. */ }
    render();
    feedback.textContent = "변경 사항을 저장했어요. 같은 브라우저의 메인과 상세 화면에 반영됩니다.";
  });
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "index") initIndex();
  if (page === "detail") initDetail();
  if (page === "admin") initAdmin();
});
