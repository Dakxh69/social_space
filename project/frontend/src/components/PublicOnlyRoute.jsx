import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

function PublicOnlyRoute({ children }) {
  const { status, isAuthenticated, user } = useSelector((state) => state.auth);

  if (status === 'idle' || status === 'loading') return null;

  if (isAuthenticated) {
    return <Navigate to={user?.role === "admin" ? "/admin" : "/home"} replace />;
  }

  return children;
}

export default PublicOnlyRoute;