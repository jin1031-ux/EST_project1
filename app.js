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
    NAVER_SEARCH_KEY_MISSING: "API 키 미설정: NAVER_SEARCH_CLIENT_ID와 NAVER_SEARCH_CLIENT_SECRET을 Vercel 환경 변수 또는 .env.local에 설정해 주세요.",
    NAVER_SEARCH_KEY_INVALID: "네이버 검색 API 인증 정보를 확인해 주세요.",
    NAVER_MAP_CONFIG_MISSING: "네이버 지도 API 설정이 필요합니다. NAVER_MAP_CLIENT_ID와 NAVER_MAP_CLIENT_SECRET을 확인해 주세요.",
    NAVER_MAP_DOMAIN_ERROR: "네이버 지도 API 설정 또는 허용 도메인 오류예요. 네이버클라우드 Maps의 Web 서비스 URL을 확인해 주세요.",
    NAVER_RATE_LIMIT: "네이버 API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.",
    NAVER_NETWORK_ERROR: "네트워크 오류: 네이버 API 서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.",
    NAVER_API_ERROR: "네이버 지역 검색 서비스 오류예요. 잠시 후 다시 시도해 주세요."
  };
  return messages[code] || fallback || "장소 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

let naverMap;
let naverMarkers = [];
let naverMapPromise;

async function loadNaverMapSdk() {
  if (window.naver?.maps) return window.naver;
  if (naverMapPromise) return naverMapPromise;

  naverMapPromise = (async () => {
    let response;
    try {
      response = await fetch("/api/naver-map-config");
    } catch (error) {
      throw createSearchError("NAVER_NETWORK_ERROR", "네이버 지도 설정 서버에 연결하지 못했습니다.");
    }
    const payload = await response.json().catch(() => ({}));
    if (response.status === 404) throw createSearchError("SERVER_NOT_RUNNING");
    if (!response.ok) throw createSearchError(payload.code, payload.error || "네이버 지도 설정을 불러오지 못했습니다.");
    const { mapClientId } = payload;
    if (!mapClientId) throw createSearchError("NAVER_MAP_CONFIG_MISSING");

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${encodeURIComponent(mapClientId)}`;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(createSearchError("NAVER_MAP_DOMAIN_ERROR"));
      document.head.append(script);
    });
    return window.naver;
  })();

  return naverMapPromise;
}

async function ensureNaverMap() {
  const naver = await loadNaverMapSdk();
  if (!naverMap) {
    try {
      naverMap = new naver.maps.Map(document.querySelector("#naver-map"), {
        center: new naver.maps.LatLng(33.4996, 126.5312),
        zoom: 9
      });
    } catch (error) {
      throw createSearchError("NAVER_MAP_DOMAIN_ERROR");
    }
  }
  return naver;
}

function clearNaverMarkers() {
  naverMarkers.forEach(({ marker, infoWindow }) => {
    infoWindow.close();
    marker.setMap(null);
  });
  naverMarkers = [];
}

function drawNaverPlaces(naver, places) {
  clearNaverMarkers();
  const bounds = new naver.maps.LatLngBounds();
  places.forEach((place) => {
    const latitude = Number(place.latitude);
    const longitude = Number(place.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const position = new naver.maps.LatLng(latitude, longitude);
    const marker = new naver.maps.Marker({ position, map: naverMap, title: place.name });
    const infoWindow = new naver.maps.InfoWindow({ content: `<div class="map-info-window">${escapeHtml(place.name)}</div>`, borderWidth: 0, backgroundColor: "transparent", disableAnchor: true });
    naver.maps.Event.addListener(marker, "click", () => infoWindow.open(naverMap, marker));
    naverMarkers.push({ marker, infoWindow });
    bounds.extend(position);
  });
  if (naverMarkers.length) naverMap.fitBounds(bounds);
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
        <div class="card-top"><h3>${escapeHtml(place.name)}</h3><span class="place-source">네이버 지역 검색</span></div>
        <p class="place-category">${escapeHtml(place.category || "카테고리 정보 없음")}</p>
        <p class="address">${escapeHtml(place.roadAddress || place.address || "주소 정보 없음")}</p>
        <a class="place-link" href="${escapeHtml(place.naverUrl)}" target="_blank" rel="noopener">네이버 원본 보기 <span>↗</span></a>
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
    notice.textContent = `‘${cleanTerm}’ 장소를 네이버 지역 검색에서 찾고 있어요.`;
    mapStatus.textContent = "지도를 준비하고 있어요.";
    try {
      let placeResponse;
      try {
        placeResponse = await fetch(`/api/naver-places?query=${encodeURIComponent(`제주 ${cleanTerm}`)}`);
      } catch (error) {
        throw createSearchError("NAVER_NETWORK_ERROR");
      }
      const payload = await placeResponse.json().catch(() => ({}));
      if (placeResponse.status === 404) throw createSearchError("SERVER_NOT_RUNNING");
      if (!placeResponse.ok) throw createSearchError(payload.code, payload.error || "장소 검색에 실패했습니다.");
      const places = Array.isArray(payload.places) ? payload.places : [];
      if (!places.length) {
        notice.textContent = `‘${cleanTerm}’에 대한 네이버 지역 검색 결과가 없어요.`;
        mapStatus.textContent = "표시할 장소 마커가 없습니다.";
        clearNaverMarkers();
        return;
      }
      renderPlaces(places);
      const naver = await ensureNaverMap();
      drawNaverPlaces(naver, places);
      notice.textContent = `네이버 지역 검색에서 찾은 ‘${cleanTerm}’ 장소 ${places.length}곳이에요.`;
      mapStatus.textContent = "마커를 선택하면 장소 이름을 확인할 수 있어요.";
    } catch (error) {
      notice.textContent = getSearchErrorMessage(error.code, error.message);
      mapStatus.textContent = error.code === "SERVER_NOT_RUNNING"
        ? "정적 Live Server에서는 /api 함수가 실행되지 않습니다."
        : "네이버 지도 설정 또는 네트워크 연결을 확인해 주세요.";
      if (!results.children.length) results.innerHTML = "";
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
