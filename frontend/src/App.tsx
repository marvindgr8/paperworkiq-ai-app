import { Routes, Route } from "react-router-dom";
import Homepage from "./pages/Homepage";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Teams from "./pages/Teams";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/teams" element={<Teams />} />
      <Route path="/app" element={<Dashboard />} />
      <Route path="/app/dashboard" element={<Dashboard />} />
    </Routes>
  );
};

export default App;
