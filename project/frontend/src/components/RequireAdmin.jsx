import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

function RequireAdmin({ children }) {
  const { status, user } = useSelector((state) => state.auth);

  if (status === 'idle' || status === 'loading') return null;

  if (user?.role !== "admin") return <Navigate to="/home" replace />;

  return children;
}

export default RequireAdmin;
