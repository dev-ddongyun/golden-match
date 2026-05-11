import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Escalate from "./pages/Escalate";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/escalate" element={<Escalate />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
