import { useNavigate } from "react-router-dom";
import Disclaimer from "../components/Disclaimer";

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 pb-20 bg-white">
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-5xl font-black tracking-tight text-red-600">
          골든매치
        </h1>
        <p className="text-base text-gray-700 mt-2">
          기다리지 말고, 바로 출발하세요
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate("/chat")}
        className="w-full max-w-md py-5 rounded-2xl bg-red-600 text-white text-2xl font-bold shadow-lg active:bg-red-700 mb-10"
      >
        응급 시작
      </button>

      <Disclaimer />
    </div>
  );
}
