import { useEffect, useState } from "react";
import { getAllUsers } from "../services/authService";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getAllUsers()
      .then((data) => {
        if (mounted) setUsers(data || []);
      })
      .catch((err) => {
        console.error(err);
        if (mounted) setError("Failed to fetch users");
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="soft-card p-6 text-slate-600">Loading users...</div>;

  if (error) return <div className="soft-card p-6 text-rose-500">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="soft-card premium-outline relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.12),transparent_24%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-500">Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">All registered users in a clean blue interface.</p>
      </div>

      <div className="soft-card overflow-hidden">
        <div className="border-b border-sky-100/80 px-6 py-4">
          <p className="text-sm font-semibold text-slate-700">All registered users</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-sky-50/80 text-xs uppercase tracking-[0.25em] text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100 bg-white/60">
              {users.map((u) => (
                <tr key={u.id} className="transition hover:bg-sky-50/60">
                  <td className="px-6 py-4 text-sm text-slate-600">{u.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{u.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{u.role || "user"}</td>
                  <td className="px-6 py-4">
                {u.profile_image ? (
                  <img src={u.profile_image} alt="profile" className="h-10 w-10 rounded-full border-2 border-sky-100 object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-200 to-cyan-200" />
                )}
              </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
