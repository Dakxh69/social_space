import { Routes, Route,Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Home from "../pages/Home";
import Chat from "../pages/Chat";
import Search from "../pages/search";
import Profile from "../pages/Profile";
import AdminDashboard from "../pages/AdminDashboard";

import MainLayout from "../layouts/MainLayout";
import RequireAuth from "../components/RequireAuth";
import RequireAdmin from "../components/RequireAdmin";
import AuthRedirector from "../components/AuthRedirector";
import PublicOnlyRoute from "../components/PublicOnlyRoute";

function AppRoutes() {
  return (
    <Routes>

      {/* Root -> redirect based on auth/role */}
      <Route path="/" element={<AuthRedirector />} />

      {/* Public Routes */}
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

      {/* Protected Layout Routes */}
      <Route element={<RequireAuth><MainLayout /></RequireAuth>}>

        <Route path="/home" element={<Home />} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/profile/:userId" element={<Profile />} />

        <Route path="/chat" element={<Chat />} />

        <Route path="/search" element={<Search />} />

      </Route>

      <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />

    </Routes>
  );
}

export default AppRoutes;