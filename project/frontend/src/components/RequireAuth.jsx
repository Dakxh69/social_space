import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";


function RequireAuth({ children }) {
  const { status, isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') return null;

  if (!isAuthenticated) {
    return <Navigate to="/register" state={{ from: location }} replace />;
  }

  return children;
}

export default RequireAuth;
