module.exports = (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "GET 요청만 지원합니다." });
  }
  const javascriptKey = process.env.KAKAO_JAVASCRIPT_KEY;
  if (!javascriptKey) {
    return res.status(500).json({
      code: "JAVASCRIPT_KEY_MISSING",
      error: "카카오 JavaScript 키가 설정되지 않았습니다. Vercel 환경 변수 또는 .env.local을 확인해 주세요."
    });
  }
  return res.status(200).json({ javascriptKey });
};
