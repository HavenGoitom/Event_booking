import React, { useState } from "react";
import "./Auth.css";

const API_BASE = "https://arifochevents.onrender.com";
const SIGNUP_PATH = "/auth/signup/";
const LOGIN_PATH = "/auth/login/";

// ---------- helpers ----------
function saveTokensAndProfile(data, fallbackProfile = {}) {
  const at =
    data?.accessToken ||
    data?.access_token ||
    (data?.tokens && (data.tokens.access || data.tokens.accessToken));
  const rt =
    data?.refreshToken ||
    data?.refresh_token ||
    (data?.tokens && (data.tokens.refresh || data.tokens.refreshToken));

  if (at) localStorage.setItem("accessToken", at);
  if (rt) localStorage.setItem("refreshToken", rt);

  if (fallbackProfile && Object.keys(fallbackProfile).length) {
    localStorage.setItem("userProfile", JSON.stringify(fallbackProfile));
  }
  if (fallbackProfile?.role) localStorage.setItem("role", fallbackProfile.role);
}

async function jfetch(url, init) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const msg = (json && (json.message || json.error))
      || `HTTP ${res.status} ${res.statusText} — ${text.slice(0, 200)}`;
    throw new Error(msg);
  }
  return json ?? {};
}

function Field({ label, hint, children }) {
  return (
    <>
      <h1 className="personal-infos">{label}</h1>
      {children}
      {hint ? <div className="small">{hint}</div> : null}
    </>
  );
}

// ---------- Sign In ----------
function SignIn({ onBack, userType }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }
    const role = userType || localStorage.getItem("role") || "user";

    setLoading(true);
    try {
      const data = await jfetch(API_BASE + LOGIN_PATH, {
        method: "POST",
        body: JSON.stringify({ role, email: email.trim(), password }),
      });

      saveTokensAndProfile(data, { email: email.trim(), role });
      localStorage.setItem("role", role);

      window.location.href = role === "org" ? "/organizer/home" : "/user/home";
    } catch (e) {
      setError(`Sign in failed: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sign-up-box">
      <button className="back-button" onClick={onBack}>🡐</button>
      <h1 className="title">Sign In</h1>

      <Field label="Email">
        <input
          className="info-input"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label="Password">
        <input
          className="info-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error ? <div className="error">⚠️ {error}</div> : null}

      <div className="next-button-div">
        <button className="next-button" onClick={handleSignIn} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </div>
  );
}

// ---------- User Sign Up ----------
function UserPage({ onBack }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    if (!name || !email || !password || !phone) {
      setError("Please fill in all fields (name, email, password, phone).");
      return;
    }
    const payload = {
      role: "user",
      name: name.trim(),
      email: email.trim(),
      password,
      phone: phone.trim(),
    };

    setLoading(true);
    try {
      const data = await jfetch(API_BASE + SIGNUP_PATH, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      saveTokensAndProfile(data, {
        role: "user",
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      window.location.href = "/user/home";
    } catch (e) {
      setError(`Could not register: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sign-up-box">
      <button className="back-button" onClick={onBack}>🡐</button>
      <h1 className="title">Sign Up</h1>
      <p>(User)</p>

      <Field label="Full Name">
        <input
          className="info-input"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Email">
        <input
          className="info-input"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label="Password">
        <input
          className="info-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      <Field label="Phone">
        <input
          className="info-input"
          type="tel"
          placeholder="251938532839"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>

      {error ? <div className="error">❌ {error}</div> : null}

      <div className="next-button-div">
        <button className="next-button" onClick={handleSubmit} disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>
      </div>

      <p>Already have an account? Sign In</p>
      <p>← Back</p>
    </div>
  );
}

// ---------- Organizer Sign Up ----------
function OrganizerPage({ onBack }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bank, setBank] = useState("");
  const [descriptionAboutCompany, setDesc] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    if (
      !name ||
      !email ||
      !password ||
      !bankAccount ||
      !bank ||
      !descriptionAboutCompany ||
      !merchantId
    ) {
      setError("Please fill in all fields.");
      return;
    }

    const payload = {
      role: "org",
      name: name.trim(),
      email: email.trim(),
      password,
      BankAccount: bankAccount.trim(),
      Bank: bank.trim(),
      DescriptionAboutCompany: descriptionAboutCompany.trim(),
      merchantId: merchantId.trim(),
    };

    setLoading(true);
    try {
      const data = await jfetch(API_BASE + SIGNUP_PATH, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      saveTokensAndProfile(data, {
        role: "org",
        name: name.trim(),
        email: email.trim(),
        bank: bank.trim(),
        bankAccount: bankAccount.trim(),
        merchantId: merchantId.trim(),
      });

      window.location.href = "/organizer/home";
    } catch (e) {
      setError(`Could not register: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sign-up-box">
      <button className="back-button" onClick={onBack}>🡐</button>
      <h1 className="title">Sign Up</h1>
      <p>(Organizer)</p>

      <Field label="Organizer Name">
        <input
          className="info-input"
          placeholder="Company/Organizer Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Email">
        <input
          className="info-input"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label="Password">
        <input
          className="info-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      <Field label="Bank Account Number">
        <input
          className="info-input"
          placeholder="1234 5678 9012"
          value={bankAccount}
          onChange={(e) => setBankAccount(e.target.value)}
        />
      </Field>

      <Field label="Bank Name">
        <input
          className="info-input"
          placeholder="e.g., CBE, Awash, Dashen"
          value={bank}
          onChange={(e) => setBank(e.target.value)}
        />
      </Field>

      <Field label="Description About Company">
        <textarea
          className="discription"
          placeholder="Brief description about your company"
          value={descriptionAboutCompany}
          onChange={(e) => setDesc(e.target.value)}
        />
      </Field>

      <Field label="Merchant ID" hint="Provided by your PSP / gateway.">
        <input
          className="info-input"
          placeholder="MERCH-XXXX"
          value={merchantId}
          onChange={(e) => setMerchantId(e.target.value)}
        />
      </Field>

      {error ? <div className="error">❌ {error}</div> : null}

      <div className="next-button-div">
        <button className="next-button" onClick={handleSubmit} disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>
      </div>
    </div>
  );
}

// ---------- Pickers ----------
function SignUpAs({ onPick }) {
  return (
    <div className="dropdown-signup">
      <button className="sign-up-as" onClick={() => onPick("user")}>
        A User
      </button>
      <button className="sign-up-as" onClick={() => onPick("organizer")}>
        An Event Organizer
      </button>
    </div>
  );
}

function SignInAs({ onPick }) {
  return (
    <div className="dropdown-signin">
      <button className="sign-up-as" onClick={() => onPick("user")}>
        Sign in as User
      </button>
      <button className="sign-up-as" onClick={() => onPick("organizer")}>
        Sign in as Organizer
      </button>
    </div>
  );
}

// ---------- Root ----------
export default function Auth() {
  const [page, setPage] = useState("welcome");
  const [showSignUpAs, setShowSignUpAs] = useState(false);
  const [showSignInAs, setShowSignInAs] = useState(false);

  function handleSignUpPick(type) {
    setShowSignUpAs(false);
    setPage(type === "organizer" ? "organizer" : "user");
  }
  function handleSignInPick(type) {
    setShowSignInAs(false);
    setPage(type === "organizer" ? "signin-organizer" : "signin-user");
  }

  if (page === "user") return <UserPage onBack={() => setPage("welcome")} />;
  if (page === "organizer") return <OrganizerPage onBack={() => setPage("welcome")} />;
  if (page === "signin-user") return <SignIn onBack={() => setPage("welcome")} userType="user" />;
  if (page === "signin-organizer") return <SignIn onBack={() => setPage("welcome")} userType="org" />;

  // Welcome screen styled with your classes
  return (
    <div className="sign-up-box">
      <div className="main">
        <div className="title">
          <h1 className="welcome">Welcome to Event-</h1>
          <h1>Booking</h1>
        </div>
        <hr />
        <p>where organizers connect with audiences</p>
        <p>and users find events worth attending.</p>
        <p>Discover events that inspire, entertain, and</p>
        <p>bring people together.</p>

        <button
          className="sign-in-button"
          onClick={() => setShowSignInAs((v) => !v)}
        >
          Sign-in
        </button>
        {showSignInAs && <SignInAs onPick={handleSignInPick} />}

        <button
          className="sign-up-button"
          onClick={() => setShowSignUpAs((v) => !v)}
        >
          Sign-up
        </button>
        {showSignUpAs && <SignUpAs onPick={handleSignUpPick} />}
      </div>
    </div>
  );
}
