module.exports = (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "GET 요청만 지원합니다." });
  }

  const mapClientId = process.env.NAVER_MAP_CLIENT_ID;
  const mapClientSecret = process.env.NAVER_MAP_CLIENT_SECRET;
  if (!mapClientId || !mapClientSecret) {
    return res.status(500).json({
      code: "NAVER_MAP_CONFIG_MISSING",
      error: "네이버 지도 API 설정이 완료되지 않았습니다."
    });
  }
  // Web Dynamic Map SDK에는 공개 식별자인 Client ID만 전달합니다.
  return res.status(200).json({ mapClientId });
};
