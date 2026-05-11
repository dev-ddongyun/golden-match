import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    path: req.url,
    node: process.version,
    env: {
      hasGroq: !!process.env.GROQ_API_KEY,
      hasKakao: !!process.env.KAKAO_REST_API_KEY,
      hasData: !!process.env.DATA_GO_KR_SERVICE_KEY,
      hasViteKakao: !!process.env.VITE_KAKAO_JS_KEY,
    },
  });
}
