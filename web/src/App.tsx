import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import LocationPage from "./pages/Location";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-[420px] min-h-screen bg-white shadow-sm flex flex-col [&>*]:flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/location" element={<LocationPage />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
