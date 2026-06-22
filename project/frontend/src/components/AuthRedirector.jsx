import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

function AuthRedirector() {
  const navigate = useNavigate();
  const { status, isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (status === 'idle' || status === 'loading') {
      return;
    }

    if (!isAuthenticated) {
      navigate("/register", { replace: true });
      return;
    }

    if (user?.role === "admin") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/home", { replace: true });
    }
  }, [navigate, status, isAuthenticated, user]);

  return null;
}

export default AuthRedirector;
