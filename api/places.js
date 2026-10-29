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
      code: "REST_KEY_MISSING",
      error: "카카오 REST API 키가 설정되지 않았습니다. Vercel 환경 변수 또는 .env.local을 확인해 주세요."
    });
  }

  try {
    const searchParams = new URLSearchParams({ query, size: "15" });
    const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${searchParams}`, {
      headers: { Authorization: `KakaoAK ${restApiKey}` }
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({
          code: "REST_KEY_INVALID",
          error: "카카오 REST API 키를 확인해 주세요."
        });
      }
      return res.status(502).json({
        code: "KAKAO_API_ERROR",
        error: "카카오 장소 검색 서비스에서 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요."
      });
    }

    const data = await response.json();
    const places = (data.documents || []).map((place) => ({
      id: place.id,
      name: place.place_name,
      category: place.category_name,
      roadAddress: place.road_address_name,
      address: place.address_name,
      placeUrl: place.place_url,
      x: place.x,
      y: place.y
    }));
    return res.status(200).json({ places });
  } catch (error) {
    return res.status(503).json({
      code: "KAKAO_NETWORK_ERROR",
      error: "카카오 장소 검색 서버에 연결하지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요."
    });
  }
};
