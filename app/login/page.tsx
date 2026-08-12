"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const demos = [
  { role: "operator", title: "Family-office operator", name: "Arjun Mehta", email: "operator@nivesh.demo", initials: "AM", description: "Upload documents, review figures and build statements.", home: "/overview" },
  { role: "principal", title: "Principal (HNI)", name: "Rajiv Malhotra", email: "principal@nivesh.demo", initials: "RM", description: "View wealth, confirm figures and acknowledge alerts.", home: "/balance-sheet" },
  { role: "ca", title: "CA / Advisor", name: "Priya Shah", email: "ca@nivesh.demo", initials: "PS", description: "Review statements and confirm tax observations.", home: "/tax" },
  { role: "admin", title: "Firm admin", name: "Rohan Malhotra", email: "admin@nivesh.demo", initials: "RO", description: "Manage families, users, permissions and access logs.", home: "/families" },
] as const;

export default function Login() {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function login(loginEmail: string, loginPassword: string, role?: string, home = "/overview") {
    setBusy(role || "form");
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      if (role) localStorage.setItem("nivesh-role", role);
      router.push(String(data.home || home));
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    } finally {
      setBusy(null);
    }
  }

  async function chooseDemo(account: (typeof demos)[number]) {
    setSelected(account.role);
    setEmail(account.email);
    setPassword("Nivesh@2026");
    setBusy(account.role);
    setError("");
    try {
      const response = await fetch("/api/auth/demo-seed", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not prepare demo account");
      await login(account.email, "Nivesh@2026", account.role, account.home);
    } catch (demoError) {
      setBusy(null);
      setError(demoError instanceof Error ? demoError.message : "Demo login failed");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signup) return login(email, password);
    setBusy("form");
    setError("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Signup failed");
      localStorage.setItem("nivesh-role", "principal");
      router.push("/balance-sheet");
      router.refresh();
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Signup failed");
    } finally {
      setBusy(null);
    }
  }

  return <main className="auth-page">
    <section className="auth-brand"><i>NI</i><h1>Nivesh</h1><p>Family wealth, clearly.</p><ul><li>Source-linked balance sheets</li><li>Human-confirmed financial figures</li><li>Freshness, obligations and tax observations</li></ul></section>
    <section className="auth-card wide">
      <small>{signup ? "CREATE INDIVIDUAL ACCOUNT" : "CHOOSE A DEMO PORTAL"}</small>
      <h2>{signup ? "Start your family workspace" : "Welcome to Nivesh"}</h2>
      <p>{signup ? "Creates a principal account, family office and first family." : "Choose a role. Its credentials fill below and sign in automatically."}</p>
      {!signup && <div className="demo-grid">{demos.map((account) => <button type="button" className={`demo-account ${account.role} ${selected === account.role ? "selected" : ""}`} key={account.role} disabled={busy !== null} onClick={() => chooseDemo(account)}><i>{account.initials}</i><span><b>{account.title}</b><strong>{account.name}</strong><small>{account.description}</small><em>{account.email}</em></span><u>{busy === account.role ? "Preparing account..." : "Use this account >"}</u></button>)}</div>}
      <div className="auth-divider"><span>{signup ? "ACCOUNT DETAILS" : "SELECTED CREDENTIALS"}</span></div>
      <form onSubmit={submit}>
        {signup && <><label>Full name<input name="name" required minLength={2} /></label><label>Family name<input name="familyName" placeholder="e.g. The Malhotras" /></label></>}
        <label>Email<input name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input name="password" type="text" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <div className="auth-error">{error}</div>}
        <button disabled={busy !== null}>{busy === "form" ? "Please wait..." : signup ? "Create account" : "Sign in"}</button>
      </form>
      <footer>{signup ? "Already registered?" : "Need your own account?"}<button type="button" onClick={() => { setSignup(!signup); setError(""); setSelected(""); }}>{signup ? "Sign in" : "Create individual account"}</button></footer>
      <div className="auth-note">Demo accounts are verified and reset in MongoDB before automatic login.</div>
    </section>
  </main>;
}
