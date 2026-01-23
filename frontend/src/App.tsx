import { Routes, Route, Navigate } from "react-router-dom";
import Homepage from "./pages/Homepage";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Teams from "./pages/Teams";
import AppShellLayout from "./components/app/AppShellLayout";
import ChatHome from "./pages/app/ChatHome";
import HomePage from "./pages/app/HomePage";
import ActionsPage from "./pages/app/ActionsPage";
import SettingsPage from "./pages/app/SettingsPage";
import DocSplitViewPage from "./pages/app/DocSplitViewPage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/app" element={<AppShellLayout />}>
        <Route index element={<Navigate to="/app/home" replace />} />
        <Route path="home" element={<HomePage />} />
        <Route path="inbox" element={<Navigate to="/app/home" replace />} />
        <Route path="doc/:id" element={<DocSplitViewPage />} />
        <Route path="chat" element={<ChatHome />} />
        <Route path="actions" element={<ActionsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="dashboard" element={<Navigate to="/app/home" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
