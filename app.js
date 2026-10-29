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

function initIndex() {
  const form = document.querySelector("#search-form");
  const input = document.querySelector("#menu-search");
  const results = document.querySelector("#results");
  const notice = document.querySelector("#search-notice");
  const params = new URLSearchParams(window.location.search);
  const initialTerm = params.get("q");

  function render(term) {
    const cleanTerm = term.trim();
    results.innerHTML = "";
    if (!cleanTerm) {
      notice.textContent = "먹고 싶은 메뉴를 입력해 보세요.";
      return;
    }
    const matches = searchRestaurants(cleanTerm);
    if (!matches.length) {
      notice.textContent = `‘${cleanTerm}’ 메뉴를 판매하는 식당을 찾지 못했어요.`;
      return;
    }
    notice.textContent = `‘${cleanTerm}’ 메뉴를 판매하는 식당 ${matches.length}곳이에요.`;
    results.innerHTML = matches.map(({ restaurant, menu }) => `
      <a class="restaurant-card" href="detail.html?id=${encodeURIComponent(restaurant.id)}&q=${encodeURIComponent(cleanTerm)}">
        <div class="card-top"><h3>${restaurant.name}</h3>${statusBadge(restaurant)}</div>
        <p class="matched-menu"><span>찾는 메뉴</span>${menu.name} <strong>${menu.price.toLocaleString()}원</strong></p>
        <p class="address">${restaurant.address}</p>
        <p class="updated">좌석 정보 · ${formatTime(restaurant.updatedAt)}</p>
      </a>`).join("");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const term = input.value.trim();
    if (!term) {
      notice.textContent = "검색어를 입력해 주세요.";
      results.innerHTML = "";
      input.focus();
      return;
    }
    history.replaceState(null, "", `index.html?q=${encodeURIComponent(term)}`);
    render(term);
  });
  if (initialTerm) { input.value = initialTerm; render(initialTerm); }
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
  page.innerHTML = `
    <a class="back-link" href="${backUrl}">← 검색 결과로 돌아가기</a>
    <section class="detail-hero">
      <p class="eyebrow">오늘의 식당</p><h1>${restaurant.name}</h1><p class="address large-address">${restaurant.address}</p>
      <a class="button" target="_blank" rel="noopener" href="${mapUrl}">길 찾기 <span>↗</span></a>
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
