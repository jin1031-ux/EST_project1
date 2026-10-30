function getRestaurantClient() {
  if (!window.menuSupabaseClient) throw new Error("SUPABASE_CLIENT_UNAVAILABLE");
  return window.menuSupabaseClient;
}

async function getCurrentUser() {
  const { data, error } = await getRestaurantClient().auth.getUser();
  if (error) throw error;
  return data.user;
}

function toRestaurant(record) {
  return {
    id: record.id,
    name: record.name,
    address: record.address,
    seatStatus: record.seat_status,
    updatedAt: record.seat_status_updated_at,
    menu: (record.restaurant_menus || []).map((menu) => ({ name: menu.name, price: menu.price }))
  };
}

async function getRestaurant(id) {
  const { data, error } = await getRestaurantClient()
    .from("restaurants")
    .select("id, name, address, seat_status, seat_status_updated_at, restaurant_menus(name, price)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toRestaurant(data) : null;
}

async function getAllRestaurants() {
  const { data, error } = await getRestaurantClient()
    .from("restaurants")
    .select("id, name, address, seat_status, seat_status_updated_at")
    .order("name");
  if (error) throw error;
  return (data || []).map(toRestaurant);
}
function formatTime(value) {
  if (!value) return "갱신 이력 없음";
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
function statusClass(status) { return `status-${status.replace(" ", "-")}`; }
function statusBadge(restaurant) { return `<span class="status-badge ${statusClass(restaurant.seatStatus)}">${restaurant.seatStatus}</span>`; }
function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character])); }
function createSearchError(code, message) { const error = new Error(message); error.code = code; return error; }

function getSearchErrorMessage(code, fallback) {
  const messages = {
    QUERY_MISSING: "메뉴 또는 식당 키워드를 입력해 주세요.",
    SERVER_NOT_RUNNING: "서버 실행 방식 오류입니다. Live Server 대신 `vercel dev`로 실행해 주세요.",
    KAKAO_KEY_MISSING: "카카오 API 키가 설정되지 않았습니다. Vercel 환경 변수 KAKAO_REST_API_KEY를 확인해 주세요.",
    KAKAO_KEY_INVALID: "카카오 REST API 키를 확인해 주세요.",
    KAKAO_RATE_LIMIT: "카카오 API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.",
    KAKAO_NETWORK_ERROR: "네트워크 오류로 카카오 장소 검색 서버에 연결하지 못했습니다.",
    KAKAO_API_ERROR: "카카오 장소 검색 API 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
  };
  return messages[code] || fallback || "장소 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

function initIndex() {
  const form = document.querySelector("#search-form");
  const input = document.querySelector("#menu-search");
  const results = document.querySelector("#results");
  const featuredResults = document.querySelector("#featured-results");
  const featuredSection = document.querySelector("#search-recommendations");
  const generalResultsSection = document.querySelector("#general-results-section");
  const notice = document.querySelector("#search-notice");
  const submitButton = form.querySelector("button[type='submit']");
  const loadMoreArea = document.querySelector("#load-more-area");
  const loadMoreButton = document.querySelector("#load-more-button");
  const paginationNotice = document.querySelector("#pagination-notice");
  const initialTerm = new URLSearchParams(window.location.search).get("q");
  let activeTerm = "";
  let currentPage = 0;
  let isEnd = true;
  let isLoading = false;
  let searchRequestId = 0;

  function resetResultSections() {
    featuredResults.innerHTML = "";
    results.innerHTML = "";
    featuredSection.hidden = true;
    generalResultsSection.hidden = true;
  }

  function placeCards(places, includeSource = true) {
    return places.map((place) => `
      <article class="restaurant-card place-card">
        <div class="card-top"><h3>${escapeHtml(place.name)}</h3>${includeSource ? '<span class="place-source">카카오맵 장소 검색 결과</span>' : ""}</div>
        <p class="place-category">${escapeHtml(place.category)}</p>
        <p class="address">${escapeHtml(place.address)}</p>
        <a class="place-link" href="${escapeHtml(place.kakaoUrl)}" target="_blank" rel="noopener">카카오맵 상세 보기 <span>↗</span></a>
      </article>`).join("");
  }

  function updateLoadMore() {
    if (!activeTerm) {
      loadMoreArea.hidden = true;
      return;
    }
    loadMoreArea.hidden = false;
    loadMoreButton.hidden = isEnd;
    loadMoreButton.disabled = isLoading;
    loadMoreButton.textContent = isLoading ? "불러오는 중…" : "더보기";
    if (!isEnd) paginationNotice.textContent = "";
  }

  async function loadPage(page, append) {
    if (isLoading || page < 1 || page > 45) return;
    const termAtRequest = activeTerm;
    const requestId = searchRequestId;
    isLoading = true;
    submitButton.disabled = true;
    updateLoadMore();
    if (append) notice.textContent = "다음 카카오맵 장소 검색 결과를 불러오고 있어요.";
    try {
      let response;
      try { response = await fetch(`/api/places?query=${encodeURIComponent(`제주 ${termAtRequest}`)}&page=${page}`); }
      catch (error) { throw createSearchError("KAKAO_NETWORK_ERROR"); }
      const payload = await response.json().catch(() => ({}));
      if (response.status === 404) throw createSearchError("SERVER_NOT_RUNNING");
      if (!response.ok) throw createSearchError(payload.code, payload.error);
      if (requestId !== searchRequestId) return;

      const places = Array.isArray(payload.places) ? payload.places : [];
      currentPage = Number(payload.currentPage) || page;
      isEnd = Boolean(payload.isEnd) || currentPage >= 45 || !places.length;
      if (!places.length && !append) {
        notice.textContent = `‘${termAtRequest}’에 대한 카카오맵 장소 검색 결과가 없습니다.`;
        paginationNotice.textContent = "";
        resetResultSections();
        return;
      }
      if (append) {
        results.insertAdjacentHTML("beforeend", placeCards(places));
        if (places.length) generalResultsSection.hidden = false;
      } else {
        const featuredPlaces = places.slice(0, 4);
        const generalPlaces = places.slice(4);
        featuredResults.innerHTML = placeCards(featuredPlaces, false);
        results.innerHTML = placeCards(generalPlaces);
        featuredSection.hidden = featuredPlaces.length === 0;
        generalResultsSection.hidden = generalPlaces.length === 0;
      }

      notice.textContent = `카카오맵 장소 검색 결과 ${featuredResults.children.length + results.children.length}곳을 보고 있어요.`;
      if (isEnd) paginationNotice.textContent = "모든 검색 결과를 확인했어요.";
    } catch (error) {
      if (requestId === searchRequestId) {
        notice.textContent = getSearchErrorMessage(error.code, error.message);
      }
    } finally {
      if (requestId === searchRequestId) {
        isLoading = false;
        submitButton.disabled = false;
        updateLoadMore();
      }
    }
  }

  function submitSearch(term) {
    const cleanTerm = term.trim();
    input.value = term;
    if (!cleanTerm) {
      history.replaceState(null, "", "index.html");
      notice.textContent = getSearchErrorMessage("QUERY_MISSING");
      resetResultSections();
      activeTerm = "";
      currentPage = 0;
      isEnd = true;
      paginationNotice.textContent = "";
      updateLoadMore();
      return;
    }
    history.replaceState(null, "", `index.html?q=${encodeURIComponent(cleanTerm)}`);
    searchRequestId += 1;
    activeTerm = cleanTerm;
    currentPage = 0;
    isEnd = false;
    isLoading = false;
    resetResultSections();
    paginationNotice.textContent = "";
    notice.textContent = `카카오맵에서 ‘${cleanTerm}’ 장소를 찾고 있어요.`;
    updateLoadMore();
    loadPage(1, false);
  }

  form.addEventListener("submit", (event) => { event.preventDefault(); submitSearch(input.value); });
  loadMoreButton.addEventListener("click", () => loadPage(currentPage + 1, true));
  document.querySelectorAll(".category-chip").forEach((chip) => chip.addEventListener("click", () => submitSearch(chip.dataset.category)));
  if (initialTerm) submitSearch(initialTerm);
}

function showDetailEmptyState(page, backUrl, title, message) {
  page.innerHTML = `<section class="empty-state"><p class="eyebrow">${escapeHtml(title)}</p><h1>${escapeHtml(message)}</h1><a class="button" href="${backUrl}">메인으로 돌아가기</a></section>`;
}

async function initDetail() {
  const params = new URLSearchParams(window.location.search);
  const page = document.querySelector("#detail-content");
  const searchTerm = params.get("q");
  const backUrl = searchTerm ? `index.html?q=${encodeURIComponent(searchTerm)}` : "index.html";
  let restaurant;
  try {
    restaurant = await getRestaurant(params.get("id"));
  } catch (error) {
    showDetailEmptyState(page, backUrl, "정보를 불러올 수 없어요", "식당 정보를 불러오지 못했습니다.");
    return;
  }
  if (!restaurant) {
    showDetailEmptyState(page, backUrl, "정보를 찾을 수 없어요", "요청한 식당 정보가 없습니다.");
    return;
  }
  const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(restaurant.address)}`;
  const naverPlaceUrl = `https://map.naver.com/p/search/${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`;
  const menuItems = restaurant.menu.length
    ? restaurant.menu.map((menu) => `<li><span>${escapeHtml(menu.name)}</span><strong>${Number(menu.price).toLocaleString()}원</strong></li>`).join("")
    : "<li><span>등록된 메뉴가 없습니다.</span></li>";
  page.innerHTML = `<a class="back-link" href="${backUrl}">← 검색 결과로 돌아가기</a><section class="detail-hero"><p class="eyebrow">오늘의 식당</p><h1>${escapeHtml(restaurant.name)}</h1><p class="address large-address">${escapeHtml(restaurant.address)}</p><div class="detail-actions"><a class="button" target="_blank" rel="noopener" href="${mapUrl}">길 찾기 <span>↗</span></a><a class="button" target="_blank" rel="noopener" href="${naverPlaceUrl}">네이버 플레이스에서 보기 <span>↗</span></a></div></section><section class="detail-grid"><article class="info-panel"><p class="eyebrow">메뉴와 가격</p><h2>차림 메뉴</h2><ul class="menu-list">${menuItems}</ul></article><article class="info-panel seat-panel"><p class="eyebrow">좌석 현황</p><h2>${statusBadge(restaurant)}</h2><p class="updated">마지막 갱신 · ${formatTime(restaurant.updatedAt)}</p><p class="caution">좌석 정보는 수동 갱신 정보이며 실제와 다를 수 있습니다.</p></article></section>`;
  const reservationPanel = document.createElement("section");
  reservationPanel.className = "reservation-panel";
  reservationPanel.innerHTML = `<div><p class="eyebrow">TABLE RESERVATION</p><h2>방문 인원을 선택해 주세요.</h2><p>예약 요청 후 식당에서 확인 안내를 드립니다.</p></div><form id="reservation-form" class="reservation-form"><label for="party-size">인원</label><select id="party-size" name="party-size">${[1,2,3,4,5,6,7,8].map((count) => `<option value="${count}">${count}명</option>`).join("")}</select><button type="submit">예약하기</button></form><p id="reservation-feedback" class="reservation-feedback" aria-live="polite"></p>`;
  page.append(reservationPanel);
  reservationPanel.querySelector("#reservation-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type='submit']");
    const feedback = reservationPanel.querySelector("#reservation-feedback");
    const count = Number(form.querySelector("#party-size").value);
    button.disabled = true;
    feedback.textContent = "예약 요청을 저장하고 있어요.";
    try {
      const user = await getCurrentUser();
      if (!user || !user.email) {
        feedback.textContent = "로그인 후 예약 요청을 할 수 있습니다.";
        return;
      }
      const { error } = await getRestaurantClient()
        .from("reservation_requests")
        .insert({
          restaurant_id: restaurant.id,
          party_size: count,
          user_id: user.id,
          user_email: user.email
        });
      if (error) throw error;
      feedback.textContent = `${restaurant.name} ${count}명 예약 요청이 접수되었어요. 식당 확인 후 안내해 드릴게요.`;
    } catch (error) {
      feedback.textContent = "예약 요청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    } finally {
      button.disabled = false;
    }
  });
}

function initAdmin() {
  const list = document.querySelector("#admin-list");
  const feedback = document.querySelector("#save-feedback");
  function render(restaurants) {
    if (!restaurants.length) {
      list.innerHTML = '<section class="empty-state"><p class="eyebrow">등록된 식당이 없어요</p><h1>관리할 식당 정보가 없습니다.</h1></section>';
      return;
    }
    list.innerHTML = restaurants.map((restaurant) => `<article class="admin-card" data-id="${escapeHtml(restaurant.id)}"><div><h2>${escapeHtml(restaurant.name)}</h2><p>${escapeHtml(restaurant.address)}</p><p class="updated">마지막 갱신 · ${formatTime(restaurant.updatedAt)}</p></div><div class="admin-controls"><label>좌석 상태 <select aria-label="${escapeHtml(restaurant.name)} 좌석 상태">${seatStatuses.map((status) => `<option value="${status}" ${status === restaurant.seatStatus ? "selected" : ""}>${status}</option>`).join("")}</select></label><button type="button" class="save-button">변경 사항 저장</button></div></article>`).join("");
  }
  async function loadRestaurants() {
    try {
      render(await getAllRestaurants());
    } catch (error) {
      list.innerHTML = '<section class="empty-state"><p class="eyebrow">정보를 불러올 수 없어요</p><h1>식당 정보를 불러오지 못했습니다.</h1></section>';
    }
  }
  list.addEventListener("click", async (event) => {
    if (!event.target.matches(".save-button")) return;
    const card = event.target.closest(".admin-card");
    const button = event.target;
    button.disabled = true;
    try {
      const { error } = await getRestaurantClient()
        .from("restaurants")
        .update({ seat_status: card.querySelector("select").value, seat_status_updated_at: new Date().toISOString() })
        .eq("id", card.dataset.id);
      if (error) throw error;
      feedback.textContent = "변경 사항을 저장했어요. 식당 상세 화면에 반영됩니다.";
      await loadRestaurants();
    } catch (error) {
      feedback.textContent = "변경 사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
      button.disabled = false;
    }
  });
  loadRestaurants();
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "index") initIndex();
  if (page === "detail") initDetail();
  if (page === "admin") initAdmin();
});
