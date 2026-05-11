import { DISCLAIMER } from "../schema";

export default function Disclaimer() {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white/90 backdrop-blur border-t border-gray-200 text-[11px] text-gray-500 text-center py-2 px-3 leading-snug">
      {DISCLAIMER}
    </div>
  );
}
