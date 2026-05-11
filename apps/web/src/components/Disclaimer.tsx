import { DISCLAIMER } from "@goldenmatch/schema";

export default function Disclaimer() {
  return (
    <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-gray-200 text-[11px] text-gray-500 text-center py-2 px-3 leading-snug">
      {DISCLAIMER}
    </div>
  );
}
