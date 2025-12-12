// /auth-ui.js
// Shared Supabase auth + nav UI + Promoter role helper
// P2 upgrade: modal email/password auth + signup + reset password + username/handle capture
// Backwards compatible with your existing pages and IDs.

(function () {
  if (!window.supabase) {
    console.warn("[auth-ui] Supabase client not found. Make sure you createClient BEFORE including auth-ui.js.");
    return;
  }

  const state = {
    user: null,
    isPromoter: false,
    listeners: [],
    navBound: false,
    modalBound: false,
    // profile-ish
    handle: null,
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

  // -----------------------
  // Handle helpers
  // -----------------------
  function normalizeHandle(raw) {
    const v = (raw || "").trim().toLowerCase();
    // allow letters, numbers, underscore
    const cleaned = v.replace(/[^a-z0-9_]/g, "");
    return cleaned;
  }

  function validateHandle(handle) {
    if (!handle) return "Username is required.";
    if (handle.length < 3) return "Username must be at least 3 characters.";
    if (handle.length > 20) return "Username must be 20 characters or less.";
    if (!/^[a-z0-9_]+$/.test(handle)) return "Username can only use letters, numbers, and underscore.";
    return null;
  }

  async function upsertProfileForUser(user, extra = {}) {
    // We *try* to upsert into profiles table.
    // If you don't have profiles table yet, we fail silently and still let auth work.
    if (!user) return { ok: false };

    const email = user.email || null;
    const handle = extra.handle ? normalizeHandle(extra.handle) : null;

    const payload = {
      id: user.id, // typical profiles schema uses id = auth.users.id
      email,
      ...(handle ? { handle } : {}),
    };

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        // non-fatal
        console.warn("[auth-ui] profiles upsert error (non-fatal):", error);
        return { ok: false, error };
      }
      return { ok: true };
    } catch (e) {
      console.warn("[auth-ui] profiles upsert threw (non-fatal):", e);
      return { ok: false, error: e };
    }
  }

  async function loadProfileHandle() {
    state.handle = null;
    if (!state.user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("handle")
        .eq("id", state.user.id)
        .maybeSingle();

      if (error) {
        // non-fatal
        return;
      }
      state.handle = data?.handle || null;
    } catch (_e) {
      // ignore
    }
  }

  // -----------------------
  // Core: load user + role
  // -----------------------
  async function loadUserAndRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      state.user = user || null;

      await Promise.allSettled([
        checkPromoter(),
        loadProfileHandle(),
      ]);

      updateNavUI();
      notifyListeners();
    } catch (err) {
      console.error("[auth-ui] loadUserAndRole error:", err);
    }
  }

  async function checkPromoter() {
    state.isPromoter = false;

    if (!state.user || !state.user.email) return;

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
        fn({ user: state.user, isPromoter: state.isPromoter, handle: state.handle });
      } catch (err) {
        console.error("[auth-ui] listener error:", err);
      }
    });
  }

  // -----------------------
  // Modal UI (email/password auth)
  // -----------------------
  function ensureAuthModal() {
    if (state.modalBound) return;
    state.modalBound = true;

    // Inject styles + markup once
    const style = document.createElement("style");
    style.textContent = `
      .auth-backdrop{
        position:fixed;inset:0;background:rgba(0,0,0,.68);
        display:none;align-items:center;justify-content:center;z-index:9999;
      }
      .auth-modal{
        width:min(560px,92vw);
        background:#121212;border:1px solid rgba(255,255,255,.10);
        border-radius:18px;box-shadow:0 40px 120px -30px rgba(0,0,0,.8);
        overflow:hidden;color:#fff;font-family:inherit;
      }
      .auth-hd{
        display:flex;align-items:center;justify-content:space-between;
        padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.10);
      }
      .auth-title{
        font-family:"Bebas Neue",system-ui,sans-serif;
        letter-spacing:2px;font-size:28px;margin:0;
      }
      .auth-x{
        display:inline-flex;align-items:center;justify-content:center;
        width:36px;height:36px;border-radius:999px;
        border:1px solid rgba(255,255,255,.10);
        background:transparent;color:#fff;cursor:pointer;
      }
      .auth-bd{padding:18px;display:grid;gap:12px}
      .auth-tabs{display:flex;gap:10px;flex-wrap:wrap}
      .auth-tab{
        display:inline-flex;align-items:center;gap:8px;
        padding:8px 12px;border-radius:999px;
        border:1px solid rgba(255,255,255,.10);
        background:rgba(255,255,255,.03);color:#fff;cursor:pointer;
        font-size:13px;
      }
      .auth-tab[aria-selected="true"]{
        border-color:rgba(255,217,59,.70);
        box-shadow:0 0 0 1px rgba(255,217,59,.35);
      }
      .auth-row{display:grid;gap:6px}
      .auth-row label{font-size:12px;color:#bdbdbd}
      .auth-input{
        width:100%;
        background:#1b1b1b;border:1px solid rgba(255,255,255,.10);
        color:#fff;padding:10px 12px;border-radius:12px;outline:none;
        font-size:14px;font-family:inherit;
      }
      .auth-input:focus{
        border-color:rgba(255,217,59,.70);
        box-shadow:0 0 0 1px rgba(255,217,59,.35);
      }
      .auth-actions{display:flex;gap:10px;justify-content:flex-end;align-items:center;margin-top:6px;flex-wrap:wrap}
      .auth-btn{
        display:inline-flex;align-items:center;gap:8px;
        padding:9px 14px;border-radius:999px;
        border:1px solid rgba(255,255,255,.10);
        background:transparent;color:#fff;cursor:pointer;font-size:13px;
      }
      .auth-btn.primary{
        background:radial-gradient(circle at top left,#ff4d4d,#e50914);
        border-color:rgba(229,9,20,.9);
        box-shadow:0 0 18px rgba(229,9,20,.5);
      }
      .auth-help{font-size:12px;color:#bdbdbd;line-height:1.35}
      .auth-error{font-size:12px;color:#ffb4b4}
      .auth-success{font-size:12px;color:#FFD93B}
      .auth-link{
        background:transparent;border:none;color:#FFD93B;cursor:pointer;
        padding:0;font:inherit;font-size:12px;text-decoration:underline;
      }
      .auth-mini{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}
    `;
    document.head.appendChild(style);

    const wrap = document.createElement("div");
    wrap.id = "authBackdrop";
    wrap.className = "auth-backdrop";
    wrap.innerHTML = `
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
        <div class="auth-hd">
          <h3 class="auth-title" id="authTitle">Log in</h3>
          <button class="auth-x" id="authClose" aria-label="Close">✕</button>
        </div>

        <div class="auth-bd">
          <div class="auth-tabs" role="tablist" aria-label="Auth tabs">
            <button class="auth-tab" id="authTabLogin" role="tab" aria-selected="true" type="button">Log in</button>
            <button class="auth-tab" id="authTabSignup" role="tab" aria-selected="false" type="button">Sign up</button>
            <button class="auth-tab" id="authTabReset" role="tab" aria-selected="false" type="button">Forgot password</button>
          </div>

          <div id="authMsg" class="auth-help"></div>
          <div id="authErr" class="auth-error" style="display:none"></div>
          <div id="authOk" class="auth-success" style="display:none"></div>

          <!-- Login -->
          <div id="authPanelLogin">
            <div class="auth-row">
              <label>Email</label>
              <input class="auth-input" id="authEmail" type="email" autocomplete="email" placeholder="you@email.com">
            </div>
            <div class="auth-row">
              <label>Password</label>
              <input class="auth-input" id="authPassword" type="password" autocomplete="current-password" placeholder="••••••••">
            </div>

            <div class="auth-mini">
              <div class="auth-help">No account? <button class="auth-link" id="authGoSignup" type="button">Sign up</button></div>
              <div class="auth-help"><button class="auth-link" id="authGoReset" type="button">Forgot password?</button></div>
            </div>

            <div class="auth-actions">
              <button class="auth-btn" id="authLoginOtp" type="button" title="Email a magic link instead">Use magic link</button>
              <button class="auth-btn primary" id="authLoginBtn" type="button">Log in</button>
            </div>
          </div>

          <!-- Signup -->
          <div id="authPanelSignup" style="display:none">
            <div class="auth-row">
              <label>Username</label>
              <input class="auth-input" id="authHandle" type="text" autocomplete="username" placeholder="rokdriver">
              <div class="auth-help">Lowercase. 3–20 chars. Letters, numbers, underscore.</div>
            </div>
            <div class="auth-row">
              <label>Email</label>
              <input class="auth-input" id="authEmail2" type="email" autocomplete="email" placeholder="you@email.com">
            </div>
            <div class="auth-row">
              <label>Password</label>
              <input class="auth-input" id="authPassword2" type="password" autocomplete="new-password" placeholder="••••••••">
              <div class="auth-help">Use at least (8+) characters.</div>
            </div>

            <div class="auth-mini">
              <div class="auth-help">Already have an account? <button class="auth-link" id="authGoLogin" type="button">Log in</button></div>
              <div></div>
            </div>

            <div class="auth-actions">
              <button class="auth-btn primary" id="authSignupBtn" type="button">Create account</button>
            </div>
          </div>

          <!-- Reset -->
          <div id="authPanelReset" style="display:none">
            <div class="auth-row">
              <label>Email</label>
              <input class="auth-input" id="authResetEmail" type="email" autocomplete="email" placeholder="you@email.com">
            </div>
            <div class="auth-help">
              We’ll email you a reset link. It opens <b>/reset-password.html</b> so you can set a new password.
            </div>
            <div class="auth-actions">
              <button class="auth-btn" id="authResetBack" type="button">Back</button>
              <button class="auth-btn primary" id="authResetBtn" type="button">Send reset link</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    // bindings
    const backdrop = $("authBackdrop");
    const closeBtn = $("authClose");

    function showErr(msg) {
      const el = $("authErr");
      const ok = $("authOk");
      if (ok) ok.style.display = "none";
      if (el) {
        el.textContent = msg || "";
        el.style.display = msg ? "block" : "none";
      }
    }

    function showOk(msg) {
      const el = $("authOk");
      const err = $("authErr");
      if (err) err.style.display = "none";
      if (el) {
        el.textContent = msg || "";
        el.style.display = msg ? "block" : "none";
      }
    }

    function setMsg(msg) {
      const el = $("authMsg");
      if (el) el.innerHTML = msg || "";
    }

    function selectTab(tab) {
      const tLogin = $("authTabLogin");
      const tSignup = $("authTabSignup");
      const tReset = $("authTabReset");
      const pLogin = $("authPanelLogin");
      const pSignup = $("authPanelSignup");
      const pReset = $("authPanelReset");

      const title = $("authTitle");

      // reset msgs
      showErr("");
      showOk("");

      const setSelected = (btn, on) => btn && btn.setAttribute("aria-selected", on ? "true" : "false");

      if (tab === "login") {
        if (title) title.textContent = "Log in";
        setSelected(tLogin, true); setSelected(tSignup, false); setSelected(tReset, false);
        if (pLogin) pLogin.style.display = "block";
        if (pSignup) pSignup.style.display = "none";
        if (pReset) pReset.style.display = "none";
        setMsg("Log in with email + password, or use a magic link.");
      } else if (tab === "signup") {
        if (title) title.textContent = "Sign up";
        setSelected(tLogin, false); setSelected(tSignup, true); setSelected(tReset, false);
        if (pLogin) pLogin.style.display = "none";
        if (pSignup) pSignup.style.display = "block";
        if (pReset) pReset.style.display = "none";
        setMsg("Create an account with a username. You can still browse without logging in.");
      } else if (tab === "reset") {
        if (title) title.textContent = "Reset password";
        setSelected(tLogin, false); setSelected(tSignup, false); setSelected(tReset, true);
        if (pLogin) pLogin.style.display = "none";
        if (pSignup) pSignup.style.display = "none";
        if (pReset) pReset.style.display = "block";
        setMsg("Enter your email and we’ll send a reset link.");
      }
    }

    function open(tab = "login", preset = {}) {
      backdrop.style.display = "flex";
      backdrop.setAttribute("aria-hidden", "false");
      selectTab(tab);

      // preset email
      if (preset.email) {
        const e1 = $("authEmail"); const e2 = $("authEmail2"); const e3 = $("authResetEmail");
        if (e1) e1.value = preset.email;
        if (e2) e2.value = preset.email;
        if (e3) e3.value = preset.email;
      }

      // small quality-of-life focus
      setTimeout(() => {
        const target = tab === "signup" ? $("authHandle") : (tab === "reset" ? $("authResetEmail") : $("authEmail"));
        target?.focus?.();
      }, 50);
    }

    function close() {
      backdrop.style.display = "none";
      backdrop.setAttribute("aria-hidden", "true");
      showErr("");
      showOk("");
    }

    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });

    // tab buttons
    $("authTabLogin")?.addEventListener("click", () => selectTab("login"));
    $("authTabSignup")?.addEventListener("click", () => selectTab("signup"));
    $("authTabReset")?.addEventListener("click", () => selectTab("reset"));
    $("authGoSignup")?.addEventListener("click", () => selectTab("signup"));
    $("authGoLogin")?.addEventListener("click", () => selectTab("login"));
    $("authGoReset")?.addEventListener("click", () => selectTab("reset"));
    $("authResetBack")?.addEventListener("click", () => selectTab("login"));

    // actions
    $("authLoginBtn")?.addEventListener("click", async () => {
      showErr(""); showOk("");
      const email = ($("authEmail")?.value || "").trim();
      const password = $("authPassword")?.value || "";
      if (!email || !password) return showErr("Email and password are required.");

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return showErr(error.message);

      showOk("Logged in.");
      close();
      await loadUserAndRole();
    });

    $("authLoginOtp")?.addEventListener("click", async () => {
      showErr(""); showOk("");
      const email = ($("authEmail")?.value || "").trim();
      if (!email) return showErr("Enter your email first.");

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href },
      });
      if (error) return showErr(error.message);

      showOk("Magic link sent. Check your email.");
    });

    $("authSignupBtn")?.addEventListener("click", async () => {
      showErr(""); showOk("");

      const handleRaw = $("authHandle")?.value || "";
      const handle = normalizeHandle(handleRaw);
      const errHandle = validateHandle(handle);
      if (errHandle) return showErr(errHandle);

      const email = ($("authEmail2")?.value || "").trim();
      const password = $("authPassword2")?.value || "";
      if (!email || !password) return showErr("Email and password are required.");

      // Attempt signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { handle }, // also keep in user_metadata
          emailRedirectTo: window.location.href,
        },
      });

      if (error) return showErr(error.message);

      // If session exists immediately, we can upsert profile right now.
      // If email confirmation required, user may be null-ish; we still show message.
      const createdUser = data?.user || null;
      if (createdUser) {
        await upsertProfileForUser(createdUser, { handle });
      }

      showOk("Account created. If email confirmation is enabled, check your inbox to verify.");
      // keep modal open so they can read it, but also switch to login
      setTimeout(() => selectTab("login"), 900);
    });

    $("authResetBtn")?.addEventListener("click", async () => {
      showErr(""); showOk("");
      const email = ($("authResetEmail")?.value || "").trim();
      if (!email) return showErr("Enter your email.");

      const resetUrl = `${window.location.origin}/reset-password.html`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl,
      });
      if (error) return showErr(error.message);

      showOk("Reset link sent. Check your email.");
    });

    // Expose modal controls
    state.modal = { open, close, selectTab };
  }

  function openAuthModal(mode = "login", preset = {}) {
    ensureAuthModal();
    state.modal.open(mode, preset);
  }

  // -----------------------
  // Nav UI wiring
  // -----------------------
  function updateNavUI() {
    // Support both "nav*" IDs and older generic IDs so pages don't break
    const signInBtn = $("navSignInBtn") || $("signinBtn");
    const joinBtn = $("navJoinBtn") || $("joinBtn");
    const profileWrap = $("navProfileWrap") || $("profileMenu");
    const chip = $("navProfileChip") || $("profileChip");
    const initialsEl = $("navProfileInitials") || $("profileInitials");
    const dropdown = $("navProfileDropdown") || $("dropdown");
    const signOutBtn = $("navSignOutBtn") || $("signoutBtn");

    const hasNav = signInBtn || profileWrap || chip || joinBtn;
    if (!hasNav) return;

    // Show/hide based on auth state
    if (state.user) {
      if (signInBtn) signInBtn.style.display = "none";
      if (joinBtn) joinBtn.style.display = "none";
      if (profileWrap) profileWrap.style.display = "flex";

      if (initialsEl) {
        const base =
          state.handle ||
          state.user.user_metadata?.handle ||
          state.user.user_metadata?.full_name ||
          state.user.email ||
          "U";
        initialsEl.textContent = String(base).trim().charAt(0).toUpperCase();
      }
    } else {
      if (signInBtn) signInBtn.style.display = "inline-flex";
      if (joinBtn) joinBtn.style.display = "inline-flex";
      if (profileWrap) profileWrap.style.display = "none";
      if (dropdown) dropdown.style.display = "none";
    }

    // Only bind click handlers once
    if (state.navBound) return;
    state.navBound = true;

    // Ensure modal exists so clicks are instant
    document.addEventListener("DOMContentLoaded", ensureAuthModal, { once: true });

    // Sign in
    if (signInBtn) {
      signInBtn.addEventListener("click", () => openAuthModal("login"));
    }
    // Join -> signup
    if (joinBtn) {
      joinBtn.addEventListener("click", () => openAuthModal("signup"));
    }

    // Profile chip + dropdown
    if (chip && dropdown && profileWrap) {
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = dropdown.style.display === "block";
        dropdown.style.display = isOpen ? "none" : "block";
        chip.setAttribute("aria-expanded", isOpen ? "false" : "true");
      });

      document.addEventListener("click", (e) => {
        if (!profileWrap.contains(e.target)) {
          dropdown.style.display = "none";
          chip.setAttribute("aria-expanded", "false");
        }
      });
    }

    // Sign out
    if (signOutBtn) {
      signOutBtn.addEventListener("click", async () => {
        await signOut();
      });
    }
  }

  // -----------------------
  // Sign in / out helpers
  // -----------------------
  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[auth-ui] signOut error:", err);
    } finally {
      state.user = null;
      state.isPromoter = false;
      state.handle = null;
      updateNavUI();
      notifyListeners();
    }
  }

  // -----------------------
  // Guards (backwards compatible)
  // -----------------------
  async function requireLogin(callback, opts = {}) {
    if (state.user) {
      if (callback) callback(state.user);
      return true;
    }

    if (!opts.silent) {
      const msg = opts.message || "Please sign in first.";
      // keep your old behavior, but we now use modal instead of prompt
      console.info("[auth-ui] requireLogin:", msg);
    }

    openAuthModal("login", { email: opts.prefillEmail || "" });
    return false;
  }

  /**
   * Ensure the current user is a Promoter.
   * Usage:
   *   const res = await authUI.ensurePromoter({ autoOffer: true });
   *   if (!res.promoter) return;
   */
  async function ensurePromoter(opts = {}) {
    const { autoOffer = false, signInMessage, confirmText } = opts;

    const ok = await requireLogin(null, {
      message: signInMessage || "Please sign in to manage events.",
    });
    if (!ok) return { promoter: false };

    // Refresh role
    await checkPromoter();
    updateNavUI();
    notifyListeners();

    if (state.isPromoter) return { promoter: true };

    if (!autoOffer) return { promoter: false };

    const text = confirmText || "Turn this account into an event promoter?";
    const accept = window.confirm(text);
    if (!accept) return { promoter: false, declined: true };

    const email = state.user.email.toLowerCase();
    const { error } = await supabase
      .from("event_admins")
      .insert({ email });

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

  // Backwards: keep old startSignin name but route to modal
  async function startSignin() {
    openAuthModal("login");
  }

  // -----------------------
  // Supabase auth listener
  // -----------------------
  supabase.auth.onAuthStateChange(async (_event, session) => {
    state.user = session?.user || null;

    // If we just logged in and there is a handle in user_metadata but profile missing, try upsert
    if (state.user) {
      const metaHandle = state.user.user_metadata?.handle || null;
      if (metaHandle) {
        await upsertProfileForUser(state.user, { handle: metaHandle });
      }
    }

    await loadUserAndRole();
  });

  document.addEventListener("DOMContentLoaded", () => {
    ensureAuthModal();
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
    getHandle() {
      return state.handle;
    },
    isPromoter() {
      return state.isPromoter;
    },
    onChange(fn) {
      if (typeof fn === "function") state.listeners.push(fn);
    },
    requireLogin,
    ensurePromoter,
    startSignin, // kept
    signOut,
    refresh() {
      return loadUserAndRole();
    },
    openAuthModal, // new
    escapeHTML,
  };
})();
