function stripHtml(value) {
  return String(value || "").replace(/<[^>]*>/g, "").trim();
}

function normalizeWgs84Coordinate(value) {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) return null;
  // 지역 검색 API의 mapx/mapy는 WGS84 좌표를 정수(1e7)로 반환합니다.
  return Math.abs(coordinate) > 180 ? coordinate / 10000000 : coordinate;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "GET 요청만 지원합니다." });
  }

  const query = typeof req.query.query === "string" ? req.query.query.trim().slice(0, 100) : "";
  if (!query) return res.status(400).json({ code: "QUERY_MISSING", error: "검색어를 입력해 주세요." });

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).json({
      code: "NAVER_SEARCH_KEY_MISSING",
      error: "네이버 검색 API 인증 정보가 설정되지 않았습니다."
    });
  }

  try {
    const searchParams = new URLSearchParams({ query, display: "5", start: "1", sort: "random" });
    const response = await fetch(`https://openapi.naver.com/v1/search/local.json?${searchParams}`, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret
      }
    });

    if (response.status === 429) {
      return res.status(429).json({ code: "NAVER_RATE_LIMIT", error: "네이버 API 요청 한도를 초과했습니다." });
    }
    if (response.status === 401 || response.status === 403) {
      return res.status(502).json({ code: "NAVER_SEARCH_KEY_INVALID", error: "네이버 검색 API 인증 정보를 확인해 주세요." });
    }
    if (!response.ok) {
      return res.status(502).json({ code: "NAVER_API_ERROR", error: "네이버 지역 검색 서비스에서 응답을 받지 못했습니다." });
    }

    const data = await response.json();
    const places = (data.items || []).map((item) => {
      const name = stripHtml(item.title);
      const address = item.address || "";
      return {
        name,
        category: item.category || "",
        address,
        roadAddress: item.roadAddress || "",
        naverUrl: item.link || `https://search.naver.com/search.naver?where=local&query=${encodeURIComponent(`${name} ${address}`)}`,
        longitude: normalizeWgs84Coordinate(item.mapx),
        latitude: normalizeWgs84Coordinate(item.mapy)
      };
    });
    return res.status(200).json({ places });
  } catch (error) {
    return res.status(503).json({
      code: "NAVER_NETWORK_ERROR",
      error: "네이버 지역 검색 서버에 연결하지 못했습니다. 네트워크 연결을 확인해 주세요."
    });
  }
};
