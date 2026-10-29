module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "GET 요청만 지원합니다." });
  }

  const query = typeof req.query.query === "string" ? req.query.query.trim().slice(0, 100) : "";
  if (!query) return res.status(400).json({ code: "QUERY_MISSING", error: "검색어를 입력해 주세요." });

  const restApiKey = process.env.KAKAO_REST_API_KEY;
  if (!restApiKey) {
    return res.status(500).json({
      code: "KAKAO_KEY_MISSING",
      error: "카카오 장소 검색 API 키가 설정되지 않았습니다."
    });
  }

  try {
    const params = new URLSearchParams({ query, size: "15" });
    const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
      headers: { Authorization: `KakaoAK ${restApiKey}` }
    });

    if (response.status === 429) {
      return res.status(429).json({ code: "KAKAO_RATE_LIMIT", error: "카카오 API 요청 한도를 초과했습니다." });
    }
    if (response.status === 401 || response.status === 403) {
      return res.status(502).json({ code: "KAKAO_KEY_INVALID", error: "카카오 REST API 키를 확인해 주세요." });
    }
    if (!response.ok) {
      return res.status(502).json({ code: "KAKAO_API_ERROR", error: "카카오 장소 검색 API 응답을 받지 못했습니다." });
    }

    const data = await response.json();
    const places = (data.documents || []).map((place) => ({
      name: place.place_name || "상호명 정보 없음",
      category: place.category_name || "음식점 카테고리 정보 없음",
      address: place.road_address_name || place.address_name || "주소 정보 없음",
      kakaoUrl: place.place_url || `https://map.kakao.com/?q=${encodeURIComponent(place.place_name || query)}`
    }));
    return res.status(200).json({ places });
  } catch (error) {
    return res.status(503).json({
      code: "KAKAO_NETWORK_ERROR",
      error: "카카오 장소 검색 서버에 연결하지 못했습니다. 네트워크를 확인해 주세요."
    });
  }
};
