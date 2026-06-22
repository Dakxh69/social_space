import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function MainLayout() {
  return (
    <div className="flex min-h-screen text-slate-900">
      <Sidebar />

      <div className="min-h-screen flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <Outlet />
      </div>
    </div>
  );
}

export default MainLayout;