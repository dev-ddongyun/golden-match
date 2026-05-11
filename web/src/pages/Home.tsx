import { useNavigate } from "react-router-dom";
import Disclaimer from "../components/Disclaimer";

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-full flex flex-col px-6 pb-20 bg-white">
      <header className="flex items-center justify-between h-12 -mx-2 pt-safe box-content">
        <span className="px-2 text-base font-extrabold tracking-tight text-red-600">
          골든매치
        </span>
        <a
          href="https://github.com/dev-ddongyun/golden-match"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub repository"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
        >
          <i className="bi bi-github text-xl" aria-hidden="true" />
        </a>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center w-32 h-32 rounded-full bg-red-50 ring-8 ring-red-100/60">
          <i className="bi bi-heart-pulse-fill text-red-600 text-6xl" aria-hidden="true" />
        </div>
        <h2 className="mt-8 text-2xl font-extrabold tracking-tight text-gray-900">
          지금 갈 수 있는 응급실
        </h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          기다리지 말고, 바로 출발하세요.<br />
          AI가 가장 빠른 응급실을 찾아드립니다.
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate("/location")}
        className="w-full py-5 rounded-xl bg-red-600 text-white text-2xl font-bold active:bg-red-700 active:translate-y-px transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
      >
        응급 시작
      </button>

      <Disclaimer />
    </div>
  );
}
