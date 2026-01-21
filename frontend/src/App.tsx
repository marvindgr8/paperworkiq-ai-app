import { Routes, Route, Navigate } from "react-router-dom";
import Homepage from "./pages/Homepage";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Teams from "./pages/Teams";
import AppShellLayout from "./components/app/AppShellLayout";
import ChatHome from "./pages/app/ChatHome";
import InboxPage from "./pages/app/InboxPage";
import ActionsPage from "./pages/app/ActionsPage";
import OverviewPage from "./pages/app/OverviewPage";
import SettingsPage from "./pages/app/SettingsPage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/app" element={<AppShellLayout />}>
        <Route index element={<ChatHome />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="actions" element={<ActionsPage />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="dashboard" element={<Navigate to="/app/overview" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
