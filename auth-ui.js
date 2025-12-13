// /auth-ui.js
// Shared Supabase auth + nav UI (email+password modal) + promoter role helper
// Supports BOTH nav id sets used across your site:
// - navSignInBtn / navJoinBtn / navProfileWrap / navProfileChip / navProfileInitials / navProfileDropdown / signoutBtn
// - loginBtn / joinBtn / profileMenu / profileChip / profileInitials / dropdown / signoutBtn
// - signinBtn (legacy) also supported

(function () {
  if (!window.supabase) {
    console.warn("[auth-ui] Supabase client not found. Make sure you createClient BEFORE including auth-ui.js.");
    return;
  }

  // --------- Optional config (safe defaults) ----------
  const AUTH_UI_CONFIG = {
    // Where Supabase should send password reset links
    // IMPORTANT: make sure this URL exists on your site
    resetRedirectTo: (location.origin + "/reset-password.html"),

    // If you have a profiles table and you want to store a username/handle, set these.
    // If the table doesn't exist, we fail silently (won't break login/signup).
    profileTable: "profiles",
    profileIdColumn: "id",
    profileHandleColumn: "handle",

    // Basic handle rules (your preference)
    handleMin: 3,
    handleMax: 20,
  };

  const state = {
    user: null,
    isPromoter: false,
    listeners: [],
    navBound: false,
    modalBound: false,
    modalOpen: false,
  };

  const $ = (id) => document.getElementById(id);

  function escapeHTML(s) {
    return (s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[m]));
  }

  function clampStr(s, max) {
    s = (s || "").trim();
    return s.length > max ? s.slice(0, max) : s;
  }

  function normalizeHandle(raw) {
    const s = (raw || "").trim().toLowerCase();
    // allow letters, numbers, underscore, dot
    const cleaned = s.replace(/[^a-z0-9._]/g, "");
    return cleaned;
  }

  // -----------------------
  // Core: load user + role
  // -----------------------
  async function loadUserAndRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      state.user = user || null;
      await checkPromoter(); // ignore errors quietly
      updateNavUI();
      notifyListeners();
    } catch (err) {
      console.error("[auth-ui] loadUserAndRole error:", err);
    }
  }

  async function checkPromoter() {
    state.isPromoter = false;
    if (!state.user?.email) return;

    try {
      const { data, error } = await supabase
        .from("event_admins")
        .select("id")
        .eq("email", state.user.email.toLowerCase())
        .maybeSingle();

      if (error) {
        console.warn("[auth-ui] checkPromoter error (non-fatal):", error);
        return;
      }

      state.isPromoter = !!data;
    } catch (err) {
      console.warn("[auth-ui] checkPromoter thrown error (non-fatal):", err);
    }
  }

  function notifyListeners() {
    state.listeners.forEach((fn) => {
      try {
        fn({ user: state.user, isPromoter: state.isPromoter });
      } catch (err) {
        console.error("[auth-ui] listener error:", err);
      }
    });
  }

  // -----------------------
  // Modal UI (injected)
  // -----------------------
  function ensureAuthModal() {
    if (state.modalBound) return;

    const style = document.createElement("style");
    style.id = "authUiStyle";
    style.textContent = `
      .authui-backdrop{
        position:fixed; inset:0;
        display:none; align-items:center; justify-content:center;
        background:rgba(0,0,0,.68);
        z-index:9999;
        padding:18px;
      }
      .authui-modal{
        width:min(480px, 96vw);
        background:rgba(12,12,16,.96);
        border:1px solid rgba(255,255,255,.10);
        border-radius:18px;
        box-shadow:0 40px 120px -30px rgba(0,0,0,.8);
        overflow:hidden;
        backdrop-filter: blur(16px);
      }
      .authui-head{
        display:flex; align-items:center; justify-content:space-between;
        padding:14px 16px;
        border-bottom:1px solid rgba(255,255,255,.08);
      }
      .authui-title{
        font-family: "Bebas Neue", system-ui, sans-serif;
        letter-spacing:2px;
        font-size:26px;
        margin:0;
        color:#fff;
        text-transform:uppercase;
      }
      .authui-close{
        border:1px solid rgba(255,255,255,.14);
        background:transparent;
        color:#fff;
        border-radius:999px;
        padding:6px 10px;
        cursor:pointer;
      }
      .authui-body{ padding:16px; display:grid; gap:10px; }
      .authui-tabs{ display:flex; gap:8px; }
      .authui-tab{
        flex:1;
        border-radius:999px;
        padding:10px 12px;
        border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.02);
        color:#bdbdbd;
        cursor:pointer;
        font-size:12px;
        letter-spacing:.16em;
        text-transform:uppercase;
      }
      .authui-tab.active{
        color:#fff;
        border-color: rgba(255,217,59,.55);
        box-shadow: 0 0 0 1px rgba(255,217,59,.28);
      }
      .authui-field label{
        display:block;
        font-size:12px;
        color:#bdbdbd;
        margin:6px 0 6px;
      }
      .authui-field input{
        width:100%;
        padding:11px 12px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.10);
        background:rgba(20,20,24,.9);
        color:#fff;
        outline:none;
        font-size:14px;
        font-family:inherit;
      }
      .authui-field input:focus{
        border-color: rgba(255,217,59,.55);
        box-shadow: 0 0 0 1px rgba(255,217,59,.25);
      }
      .authui-help{
        font-size:12px;
        color:#bdbdbd;
        line-height:1.3;
      }
      .authui-actions{
        display:flex; gap:10px; align-items:center; justify-content:space-between;
        margin-top:6px;
      }
      .authui-btn{
        border-radius:999px;
        padding:10px 14px;
        font-size:12px;
        letter-spacing:.16em;
        text-transform:uppercase;
        cursor:pointer;
        border:1px solid rgba(255,255,255,.14);
        background:transparent;
        color:#fff;
      }
      .authui-btn.primary{
        border-color: rgba(229,9,20,.9);
        background: radial-gradient(circle at top left,#ff4d4d,#e50914);
        box-shadow: 0 0 18px rgba(229,9,20,.55);
      }
      .authui-btn[disabled]{opacity:.6;pointer-events:none}
      .authui-links{
        display:flex; gap:10px; flex-wrap:wrap;
        justify-content:flex-end;
      }
      .authui-link{
        font-size:12px;
        color:#ffd93b;
        cursor:pointer;
        text-decoration:none;
        background:transparent;
        border:none;
        padding:0;
      }
      .authui-msg{
        font-size:12px;
        color:#bdbdbd;
        min-height:16px;
      }
      .authui-msg.ok{ color:#9affc5; }
      .authui-msg.bad{ color:#ff9090; }
    `;
    document.head.appendChild(style);

    const wrap = document.createElement("div");
    wrap.id = "authUiBackdrop";
    wrap.className = "authui-backdrop";
    wrap.innerHTML = `
      <div class="authui-modal" role="dialog" aria-modal="true" aria-labelledby="authUiTitle">
        <div class="authui-head">
          <h2 id="authUiTitle" class="authui-title">Join the grid</h2>
          <button class="authui-close" type="button" aria-label="Close">✕</button>
        </div>

        <div class="authui-body">
          <div class="authui-tabs">
            <button id="authUiTabLogin" class="authui-tab active" type="button">Log in</button>
            <button id="authUiTabSignup" class="authui-tab" type="button">Sign up</button>
          </div>

          <div class="authui-field">
            <label for="authUiEmail">Email</label>
            <input id="authUiEmail" type="email" autocomplete="email" placeholder="you@email.com" />
          </div>

          <div class="authui-field">
            <label for="authUiPassword">Password</label>
            <input id="authUiPassword" type="password" autocomplete="current-password" placeholder="••••••••" />
          </div>

          <div id="authUiHandleWrap" class="authui-field" style="display:none">
            <label for="authUiHandle">Username (optional)</label>
            <input id="authUiHandle" type="text" autocomplete="username" placeholder="e.g. rrxngdriver" />
            <div class="authui-help">Used for @handles across the site (if profiles table exists).</div>
          </div>

          <div id="authUiMsg" class="authui-msg"></div>

          <div class="authui-actions">
            <button id="authUiSubmit" class="authui-btn primary" type="button">Log in</button>

            <div class="authui-links">
              <button id="authUiForgot" class="authui-link" type="button">Forgot password</button>
            </div>
          </div>

          <div class="authui-help">
            By continuing, you agree to behave like you’re on the island’s grid (no nonsense).
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    // Bind modal events
    const closeBtn = wrap.querySelector(".authui-close");
    closeBtn.addEventListener("click", closeAuthModal);
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) closeAuthModal();
    });

    $("authUiTabLogin").addEventListener("click", () => setAuthMode("login"));
    $("authUiTabSignup").addEventListener("click", () => setAuthMode("signup"));
    $("authUiSubmit").addEventListener("click", submitAuth);
    $("authUiForgot").addEventListener("click", forgotPasswordFlow);

    document.addEventListener("keydown", (e) => {
      if (!state.modalOpen) return;
      if (e.key === "Escape") closeAuthModal();
      if (e.key === "Enter") {
        const active = document.activeElement;
        if (active && (active.id === "authUiEmail" || active.id === "authUiPassword" || active.id === "authUiHandle")) {
          submitAuth();
        }
      }
    });

    state.modalBound = true;
    setAuthMode("login");
  }

  let authMode = "login";

  function setAuthMode(mode) {
    authMode = mode === "signup" ? "signup" : "login";

    const tabLogin = $("authUiTabLogin");
    const tabSignup = $("authUiTabSignup");
    const title = $("authUiTitle");
    const submit = $("authUiSubmit");
    const handleWrap = $("authUiHandleWrap");
    const pwd = $("authUiPassword");

    tabLogin.classList.toggle("active", authMode === "login");
    tabSignup.classList.toggle("active", authMode === "signup");

    if (authMode === "login") {
      title.textContent = "Welcome back";
      submit.textContent = "Log in";
      handleWrap.style.display = "none";
      pwd.setAttribute("autocomplete", "current-password");
    } else {
      title.textContent = "Join the grid";
      submit.textContent = "Sign up";
      handleWrap.style.display = "block";
      pwd.setAttribute("autocomplete", "new-password");
    }

    setMsg("");
  }

  function setMsg(text, kind) {
    const el = $("authUiMsg");
    if (!el) return;
    el.textContent = text || "";
    el.className = "authui-msg" + (kind ? (" " + kind) : "");
  }

  function openAuthModal(mode) {
    ensureAuthModal();
    setAuthMode(mode || "login");

    const wrap = $("authUiBackdrop");
    wrap.style.display = "flex";
    state.modalOpen = true;

    // Clear password each open
    $("authUiPassword").value = "";
    setMsg("");

    // Focus
    setTimeout(() => {
      $("authUiEmail")?.focus();
    }, 0);
  }

  function closeAuthModal() {
    const wrap = $("authUiBackdrop");
    if (wrap) wrap.style.display = "none";
    state.modalOpen = false;
  }

  async function submitAuth() {
    const email = clampStr($("authUiEmail")?.value, 240).toLowerCase();
    const password = $("authUiPassword")?.value || "";
    const handleRaw = $("authUiHandle")?.value || "";

    if (!email || !email.includes("@")) {
      setMsg("Enter a valid email.", "bad");
      return;
    }
    if (!password || password.length < 6) {
      setMsg("Password must be at least 6 characters.", "bad");
      return;
    }

    $("authUiSubmit").disabled = true;

    try {
      if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMsg(error.message || "Login failed.", "bad");
          return;
        }
        state.user = data?.user || null;
        closeAuthModal();
        await loadUserAndRole();
        return;
      }

      // signup
      const handle = normalizeHandle(handleRaw);
      if (handle && (handle.length < AUTH_UI_CONFIG.handleMin || handle.length > AUTH_UI_CONFIG.handleMax)) {
        setMsg(`Username must be ${AUTH_UI_CONFIG.handleMin}-${AUTH_UI_CONFIG.handleMax} chars.`, "bad");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: location.href,
          data: handle ? { handle } : {},
        },
      });

      if (error) {
        setMsg(error.message || "Signup failed.", "bad");
        return;
      }

      // Some projects require email confirmation; user may be null until confirmed.
      // We still try to store handle (non-fatal if table missing).
      const newUser = data?.user || null;
      if (newUser && handle) {
        await upsertProfileHandle(newUser.id, handle);
      }

      setMsg("Signup complete. Check your email if confirmation is required.", "ok");
      // keep modal open so they can read it
      await loadUserAndRole();
    } catch (err) {
      console.error(err);
      setMsg("Something stalled. Try again.", "bad");
    } finally {
      $("authUiSubmit").disabled = false;
    }
  }

  async function forgotPasswordFlow() {
    const email = clampStr($("authUiEmail")?.value, 240).toLowerCase();
    if (!email || !email.includes("@")) {
      setMsg("Type your email first, then tap Forgot password.", "bad");
      return;
    }

    $("authUiForgot").disabled = true;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: AUTH_UI_CONFIG.resetRedirectTo,
      });

      if (error) {
        setMsg(error.message || "Could not send reset email.", "bad");
        return;
      }

      setMsg("Reset link sent. Check your email.", "ok");
    } catch (err) {
      console.error(err);
      setMsg("Reset stalled. Try again.", "bad");
    } finally {
      $("authUiForgot").disabled = false;
    }
  }

  async function upsertProfileHandle(userId, handle) {
    try {
      const payload = {
        [AUTH_UI_CONFIG.profileIdColumn]: userId,
        [AUTH_UI_CONFIG.profileHandleColumn]: handle,
      };

      // Upsert (non-fatal if table/columns don't exist)
      const { error } = await supabase
        .from(AUTH_UI_CONFIG.profileTable)
        .upsert(payload, { onConflict: AUTH_UI_CONFIG.profileIdColumn });

      if (error) {
        // fail silently (do NOT break auth)
        console.warn("[auth-ui] profile handle upsert failed (non-fatal):", error.message);
      }
    } catch (err) {
      console.warn("[auth-ui] profile handle upsert threw (non-fatal):", err);
    }
  }

  // -----------------------
  // Nav UI wiring
  // -----------------------
  function getNavEls() {
    // Newer
    const navSignInBtn = $("navSignInBtn");
    const navJoinBtn = $("navJoinBtn");
    const navProfileWrap = $("navProfileWrap");
    const navProfileChip = $("navProfileChip");
    const navProfileInitials = $("navProfileInitials");
    const navProfileDropdown = $("navProfileDropdown");

    // Index variants
    const loginBtn = $("loginBtn") || $("signinBtn");
    const joinBtn = $("joinBtn");
    const profileMenu = $("profileMenu");
    const profileChip = $("profileChip");
    const profileInitials = $("profileInitials");
    const dropdown = $("dropdown");

    // Shared
    const signOutBtn = $("navSignOutBtn") || $("signoutBtn");

    return {
      signInBtn: navSignInBtn || loginBtn,
      joinBtn: navJoinBtn || joinBtn,
      profileWrap: navProfileWrap || profileMenu,
      chip: navProfileChip || profileChip,
      initialsEl: navProfileInitials || profileInitials,
      dropdown: navProfileDropdown || dropdown,
      signOutBtn,
    };
  }

  function updateNavUI() {
    const els = getNavEls();
    const hasNav = els.signInBtn || els.profileWrap || els.chip;
    if (!hasNav) return;

    if (state.user) {
      if (els.signInBtn) els.signInBtn.style.display = "none";
      if (els.joinBtn) els.joinBtn.style.display = "none";
      if (els.profileWrap) els.profileWrap.style.display = "flex";

      if (els.initialsEl) {
        const base =
          state.user.user_metadata?.handle ||
          state.user.user_metadata?.full_name ||
          (state.user.email ? state.user.email.split("@")[0] : "U") ||
          "U";

        // nice initials
        const cleaned = String(base).replace(/[^a-z0-9]+/gi, " ").trim();
        const parts = cleaned.split(" ").filter(Boolean);
        let initials = "";
        if (parts.length >= 2) initials = (parts[0][0] + parts[1][0]);
        else initials = cleaned.slice(0, 2) || "U";
        els.initialsEl.textContent = initials.toUpperCase();
      }
    } else {
      if (els.signInBtn) els.signInBtn.style.display = "inline-flex";
      if (els.joinBtn) els.joinBtn.style.display = "inline-flex";
      if (els.profileWrap) els.profileWrap.style.display = "none";
      if (els.dropdown) els.dropdown.style.display = "none";
    }

    if (state.navBound) return;
    state.navBound = true;

    // Sign in / join (modal)
    if (els.signInBtn) {
      els.signInBtn.addEventListener("click", () => openAuthModal("login"));
    }
    if (els.joinBtn) {
      els.joinBtn.addEventListener("click", () => openAuthModal("signup"));
    }

    // Profile dropdown
    if (els.chip && els.dropdown && els.profileWrap) {
      els.chip.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = els.dropdown.style.display === "block";
        els.dropdown.style.display = isOpen ? "none" : "block";
        els.chip.setAttribute("aria-expanded", isOpen ? "false" : "true");
      });

      document.addEventListener("click", (e) => {
        if (!els.profileWrap.contains(e.target)) {
          els.dropdown.style.display = "none";
          els.chip.setAttribute("aria-expanded", "false");
        }
      });
    }

    // Sign out
    if (els.signOutBtn) {
      els.signOutBtn.addEventListener("click", async () => {
        await signOut();
      });
    }
  }

  // -----------------------
  // Sign out helper
  // -----------------------
  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[auth-ui] signOut error:", err);
    } finally {
      state.user = null;
      state.isPromoter = false;
      updateNavUI();
      notifyListeners();
    }
  }

  // -----------------------
  // Guards
  // -----------------------
  async function requireLogin(callback, opts = {}) {
    if (state.user) {
      if (callback) callback(state.user);
      return true;
    }

    if (!opts.silent) {
      alert(opts.message || "Please sign in first.");
    }

    openAuthModal("login");
    return false;
  }

  async function ensurePromoter(opts = {}) {
    const { autoOffer = false, signInMessage, confirmText } = opts;

    const ok = await requireLogin(null, {
      message: signInMessage || "Please sign in to manage events.",
    });
    if (!ok) return { promoter: false };

    await checkPromoter();
    updateNavUI();
    notifyListeners();

    if (state.isPromoter) return { promoter: true };
    if (!autoOffer) return { promoter: false };

    const text = confirmText || "Turn this account into an event promoter?";
    const accept = window.confirm(text);
    if (!accept) return { promoter: false, declined: true };

    const email = state.user.email.toLowerCase();
    const { error } = await supabase.from("event_admins").insert({ email });

    if (error && error.code !== "23505") {
      console.error("[auth-ui] ensurePromoter insert error:", error);
      alert("Could not register as promoter: " + error.message);
      return { promoter: false, error };
    }

    await checkPromoter();
    updateNavUI();
    notifyListeners();

    return { promoter: state.isPromoter };
  }

  // -----------------------
  // Auth listener
  // -----------------------
  supabase.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;
    loadUserAndRole();
  });

  document.addEventListener("DOMContentLoaded", () => {
    updateNavUI();
    loadUserAndRole();
  });

  // -----------------------
  // Public API
  // -----------------------
  window.authUI = {
    getUser() {
      return state.user;
    },
    isPromoter() {
      return state.isPromoter;
    },
    onChange(fn) {
      if (typeof fn === "function") state.listeners.push(fn);
    },
    requireLogin,
    ensurePromoter,
    startSignin() {
      // Back-compat: opens modal login
      openAuthModal("login");
    },
    startSignup() {
      openAuthModal("signup");
    },
    openAuthModal,
    closeAuthModal,
    signOut,
    refresh() {
      return loadUserAndRole();
    },
    escapeHTML,
  };
})();
