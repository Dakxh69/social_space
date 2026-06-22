import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";

import { loginUser, getCurrentUser } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { fetchCurrentUser } from "../store/slices/authSlice";

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then(() => {
        if (mounted) navigate("/home");
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  setSuccess("");
  setError("");

  try {
    const response = await loginUser({
      identifier: formData.identifier,
      password: formData.password,
    });

    console.log(response);

    const currentUser = await dispatch(fetchCurrentUser()).unwrap();

    setSuccess("Login Successful 🎉");

    setTimeout(() => {
      navigate(currentUser?.role === "admin" ? "/admin" : "/home");
    }, 2000);

  } catch (err) {
    console.log(err);

    setError(
      err?.response?.data?.detail ||
      "Login Failed"
    );
  }
};

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="soft-card premium-outline w-full max-w-md p-6 sm:p-8">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-500">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Login</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue your clean blue workspace.</p>
        </div>

        {success && (
          <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="identifier"
            placeholder="Email or Username"
            value={formData.identifier}
            onChange={handleChange}
            className="input-field"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Enter Password"
            value={formData.password}
            onChange={handleChange}
            className="input-field"
            required
          />

          <button
            type="submit"
            className="primary-btn w-full"
          >
            Login
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Don't have an account?
          <span
            onClick={() => navigate("/register")}
            className="text-sky-600 ml-1 cursor-pointer font-medium hover:underline"
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;