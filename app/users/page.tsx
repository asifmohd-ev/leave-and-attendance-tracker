"use client";

import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db, app } from "@/lib/firebase";
import { ShieldAlert, Trash2, UserPlus, Shield, Loader2 } from "lucide-react";

type SystemUser = {
  uid: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function UsersPage() {
  const { user } = useStore();
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setMounted(true);
    const unsub = onSnapshot(collection(db, "system_users"), (snapshot) => {
      setSystemUsers(snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as SystemUser)));
    });
    return () => unsub();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Use secondary app trick to create a user without signing out the current admin
      const secondaryApp = initializeApp(app.options, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
        // Save to firestore for listing
        await setDoc(doc(db, "system_users", userCredential.user.uid), {
          name,
          email,
          role: "admin",
          createdAt: new Date().toISOString()
        });
      }

      await secondaryAuth.signOut();
      
      setName("");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm("Remove this user? Notice: This deletes their database profile but cannot physically delete their Firebase Auth credential without an Admin SDK.")) return;
    
    try {
      await deleteDoc(doc(db, "system_users", uid));
    } catch (err: any) {
      alert("Error removing user: " + err.message);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-5xl mx-auto pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1 text-base">Control access and system administrators.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 border border-slate-200 bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <UserPlus className="text-teal-600 w-5 h-5" />
            <h2 className="text-lg font-bold text-slate-800">Add New Admin</h2>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-5">
            {error && (
              <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-xs flex items-center gap-2 border border-rose-100">
                <ShieldAlert size={14} className="shrink-0" />
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-sm" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                <input required value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-sm" placeholder="jane@company.com" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                <input required value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} type="password" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-500 outline-none text-sm" placeholder="Min 6 characters" />
              </div>
            </div>

            <button disabled={loading} type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-sm transition-all disabled:opacity-70 flex justify-center items-center gap-2 text-sm mt-6">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {systemUsers.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm font-medium">
              No registered user profiles found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {systemUsers.map((su) => (
                    <tr key={su.uid} className="hover:bg-slate-50 group transition-all duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 border-2 border-white bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm rounded-full shadow-sm">
                            {su.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-sm text-slate-800">{su.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-500">{su.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-100 text-teal-700 text-[10px] font-bold uppercase tracking-wider rounded-md">
                          <Shield size={12} strokeWidth={3} /> {su.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {su.uid !== user?.uid && (
                          <button 
                            onClick={() => handleDeleteUser(su.uid)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete User"
                          >
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        )}
                        {su.uid === user?.uid && (
                          <span className="text-[10px] uppercase font-bold text-slate-300">Current</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}