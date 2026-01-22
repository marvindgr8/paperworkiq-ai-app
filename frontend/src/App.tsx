import { Routes, Route, Navigate } from "react-router-dom";
import Homepage from "./pages/Homepage";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Teams from "./pages/Teams";
import AppShellLayout from "./components/app/AppShellLayout";
import ChatHome from "./pages/app/ChatHome";
import InboxHomePage from "./pages/app/InboxHomePage";
import ActionsPage from "./pages/app/ActionsPage";
import OverviewPage from "./pages/app/OverviewPage";
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
        <Route index element={<InboxHomePage />} />
        <Route path="inbox" element={<Navigate to="/app" replace />} />
        <Route path="doc/:id" element={<DocSplitViewPage />} />
        <Route path="chat" element={<ChatHome />} />
        <Route path="actions" element={<ActionsPage />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="dashboard" element={<Navigate to="/app/overview" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
