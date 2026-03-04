// auth-ui.js  v2
// ─────────────────────────────────────────────────────────────────────────────
// Shared auth + nav UI for ROK Racers JA.
// Requires: supabase-client.js loaded first (sets window.supabase + helpers).
//
// What this file does:
//   • Injects one auth modal (login / signup / forgot password)
//   • Wires nav login/join/signout buttons (supports both id sets across pages)
//   • Exposes window.authUI for page scripts
//   • ONE onAuthStateChange listener — pages must NOT add their own
//
// Pages should:
//   • NOT define their own login/signup modals
//   • NOT call supabase.auth.onAuthStateChange themselves
//   • USE window.authUI.requireLogin(), authUI.getUser(), etc.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  // Guard: don't init twice (e.g. if script tag appears twice)
  if (window.__authUIReady) return;
  window.__authUIReady = true;

  if (!window.supabase) {
    console.error("[auth-ui] supabase client not found. Load supabase-client.js first.");
    return;
  }

  // ── Config ────────────────────────────────────────────────────────────────
  const CFG = {
    profileTable: "profiles",
    resetRedirectTo: location.origin + "/reset-password.html",
    handleMin: 3,
    handleMax: 20,
    adminAllowlist: [],
  };

  // ── State ─────────────────────────────────────────────────────────────────
  const state = {
    user: null,
    role: null,        // from profiles.role
    isPromoter: false,
    isAdmin: false,
    listeners: [],
    navBound: false,
    modalReady: false,
    modalOpen: false,
    loginResolvers: [], // pending requireLogin() promises
  };

  const $ = (id) => document.getElementById(id);

  // ── CSS injection ─────────────────────────────────────────────────────────
  function injectStyles() {
    if ($("__authUiStyles")) return;
    const s = document.createElement("style");
    s.id = "__authUiStyles";
    s.textContent = `
      /* ── Auth modal backdrop ───────────────────────────────── */
      #__authModal{
        position:fixed;inset:0;display:none;align-items:center;
        justify-content:center;background:rgba(0,0,0,.72);z-index:9999;padding:18px;
      }
      #__authModal.open{ display:flex; }
      #__authModalBox{
        width:min(480px,96vw);
        background:rgba(12,12,16,.97);
        border:1px solid rgba(255,255,255,.10);
        border-radius:18px;
        box-shadow:0 40px 120px -30px rgba(0,0,0,.85);
        overflow:hidden;
        backdrop-filter:blur(20px);
        font-family:"Rajdhani",system-ui,sans-serif;
      }
      #__authModalHead{
        display:flex;align-items:center;justify-content:space-between;
        padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);
      }
      #__authModalTitle{
        font-family:"Bebas Neue",system-ui,sans-serif;
        letter-spacing:2px;font-size:26px;margin:0;color:#fff;text-transform:uppercase;
      }
      #__authModalClose{
        border:1px solid rgba(255,255,255,.14);background:transparent;color:#fff;
        border-radius:999px;padding:6px 10px;cursor:pointer;font-size:13px;
        transition:border-color .18s ease,background .18s ease;
      }
      #__authModalClose:hover{ border-color:rgba(255,255,255,.35);background:rgba(255,255,255,.06); }
      #__authModalBody{ padding:16px;display:grid;gap:12px; }

      /* tabs */
      .__auth-tabs{ display:flex;gap:8px; }
      .__auth-tab{
        flex:1;border-radius:999px;padding:10px 12px;
        border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.02);
        color:#bdbdbd;cursor:pointer;
        font-size:12px;letter-spacing:.16em;text-transform:uppercase;
        font-family:"Rajdhani",system-ui,sans-serif;
        transition:color .18s ease,border-color .18s ease,box-shadow .18s ease;
      }
      .__auth-tab.active{
        color:#fff;border-color:rgba(18,139,2,.75);
        box-shadow:0 0 18px rgba(18,139,2,.35);
      }

      /* fields */
      .__auth-field label{ display:block;font-size:12px;color:#bdbdbd;margin-bottom:6px;text-transform:uppercase;letter-spacing:.12em; }
      .__auth-field input,.__auth-field select{
        width:100%;padding:11px 12px;border-radius:12px;
        border:1px solid rgba(255,255,255,.10);
        background:rgba(20,20,24,.9);color:#fff;
        outline:none;font-size:14px;font-family:"Rajdhani",system-ui,sans-serif;
        transition:border-color .18s ease,box-shadow .18s ease;
      }
      .__auth-field input:focus,.__auth-field select:focus{
        border-color:rgba(18,139,2,.65);
        box-shadow:0 0 0 1px rgba(18,139,2,.3);
      }
      .__auth-field .hint{ font-size:11px;color:#888;margin-top:4px;line-height:1.3; }

      /* message */
      .__auth-msg{ font-size:12px;color:#bdbdbd;min-height:16px;line-height:1.4; }
      .__auth-msg.ok{ color:#9affc5; }
      .__auth-msg.bad{ color:#ff9a9a; }

      /* buttons */
      .__auth-btn{
        border-radius:999px;padding:11px 14px;
        font-size:13px;letter-spacing:.16em;text-transform:uppercase;
        cursor:pointer;border:1px solid rgba(255,255,255,.14);
        background:transparent;color:#fff;width:100%;
        font-family:"Rajdhani",system-ui,sans-serif;
        transition:background .18s ease,border-color .18s ease,transform .18s ease,box-shadow .18s ease;
      }
      .__auth-btn:disabled{ opacity:.55;pointer-events:none; }
      .__auth-btn.primary{
        background:radial-gradient(circle at top left,#39ff96,#128b02);
        border-color:rgba(18,139,2,.85);
        box-shadow:0 0 24px rgba(18,139,2,.5);
        color:#fff;
      }
      .__auth-btn.primary:hover{ transform:translateY(-1px);box-shadow:0 0 32px rgba(18,139,2,.7); }
      .__auth-btn.ghost{ border-color:rgba(255,255,255,.12);color:#bdbdbd; }
      .__auth-btn.ghost:hover{ color:#fff;border-color:rgba(255,255,255,.28);background:rgba(255,255,255,.03); }

      .__auth-links{
        display:flex;gap:10px;flex-wrap:wrap;justify-content:center;
        margin-top:-4px;
      }
      .__auth-link{
        font-size:12px;color:#FFD93B;cursor:pointer;
        background:transparent;border:none;padding:0;
        font-family:"Rajdhani",system-ui,sans-serif;
        letter-spacing:.06em;
        transition:opacity .15s ease;
      }
      .__auth-link:hover{ opacity:.75; }

      .__auth-or{
        display:flex;align-items:center;gap:10px;
        color:#555;font-size:11px;text-transform:uppercase;letter-spacing:.14em;
      }
      .__auth-or::before,.__auth-or::after{
        content:"";flex:1;height:1px;background:rgba(255,255,255,.08);
      }
    `;
    document.head.appendChild(s);
  }

  // ── Modal HTML ────────────────────────────────────────────────────────────
  function injectModal() {
    if ($("__authModal")) return;
    const div = document.createElement("div");
    div.id = "__authModal";
    div.setAttribute("role", "dialog");
    div.setAttribute("aria-modal", "true");
    div.setAttribute("aria-labelledby", "__authModalTitle");
    div.innerHTML = `
      <div id="__authModalBox">
        <div id="__authModalHead">
          <h2 id="__authModalTitle">Join the Grid</h2>
          <button id="__authModalClose" type="button" aria-label="Close">✕</button>
        </div>
        <div id="__authModalBody">
          <div class="__auth-tabs">
            <button id="__authTabLogin" class="__auth-tab active" type="button">Log in</button>
            <button id="__authTabSignup" class="__auth-tab" type="button">Sign up</button>
          </div>

          <div class="__auth-field" id="__authRoleWrap" style="display:none">
            <label>Your role</label>
            <select id="__authRole">
              <option value="">Select one…</option>
              <option value="racer">Racer</option>
              <option value="promoter">Team Promoter</option>
            </select>
          </div>

          <div class="__auth-field">
            <label for="__authEmail">Email</label>
            <input id="__authEmail" type="email" autocomplete="email" placeholder="you@email.com"/>
          </div>
          <div class="__auth-field">
            <label for="__authPassword">Password</label>
            <input id="__authPassword" type="password" autocomplete="current-password" placeholder="••••••••"/>
          </div>

          <div id="__authMsg" class="__auth-msg"></div>

          <button id="__authSubmit" class="__auth-btn primary" type="button">Log in</button>

          <div class="__auth-or">or</div>
          <button id="__authGoogle" class="__auth-btn ghost" type="button">Continue with Google</button>

          <div class="__auth-links">
            <button id="__authForgot" class="__auth-link" type="button">Forgot password?</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);

    // ── Bind modal events ──
    $("__authModalClose").onclick = closeModal;
    $("__authModal").addEventListener("click", (e) => { if (e.target === $("__authModal")) closeModal(); });
    $("__authTabLogin").onclick = () => setMode("login");
    $("__authTabSignup").onclick = () => setMode("signup");
    $("__authSubmit").onclick = submitAuth;
    $("__authGoogle").onclick = googleAuth;
    $("__authForgot").onclick = forgotPassword;

    document.addEventListener("keydown", (e) => {
      if (!state.modalOpen) return;
      if (e.key === "Escape") closeModal();
      if (e.key === "Enter") {
        const t = document.activeElement?.id;
        if (["__authEmail","__authPassword","__authRole"].includes(t)) submitAuth();
      }
    });

    state.modalReady = true;
  }

  let _mode = "login";

  function setMode(mode) {
    _mode = mode;
    const isSignup = mode === "signup";

    $("__authTabLogin").classList.toggle("active", !isSignup);
    $("__authTabSignup").classList.toggle("active", isSignup);
    $("__authModalTitle").textContent = isSignup ? "Join the Grid" : "Welcome Back";
    $("__authSubmit").textContent = isSignup ? "Sign up" : "Log in";
    $("__authRoleWrap").style.display = isSignup ? "block" : "none";
    $("__authPassword").setAttribute("autocomplete", isSignup ? "new-password" : "current-password");
    if (!isSignup) { const r = $("__authRole"); if (r) r.value = ""; }
    setMsg("", "");
  }

  function setMsg(text, kind) {
    const el = $("__authMsg");
    if (!el) return;
    el.textContent = text || "";
    el.className = "__auth-msg" + (kind ? " " + kind : "");
  }

  function openModal(mode) {
    injectStyles();
    injectModal();
    setMode(mode || "login");
    $("__authModal").classList.add("open");
    $("__authPassword").value = "";
    setMsg("", "");
    state.modalOpen = true;
    setTimeout(() => $("__authEmail")?.focus(), 50);
  }

  function closeModal() {
    const el = $("__authModal");
    if (el) el.classList.remove("open");
    state.modalOpen = false;
    setMsg("", "");
    // resolve any pending requireLogin promises as false (user closed modal)
    // We'll resolve them on auth state change success instead
  }

  async function submitAuth() {
    const email = ($("__authEmail")?.value || "").trim().toLowerCase();
    const password = $("__authPassword")?.value || "";
    const role = $("__authRole")?.value || "";

    if (!email || !email.includes("@")) return setMsg("Enter a valid email.", "bad");
    if (password.length < 6) return setMsg("Password must be at least 6 characters.", "bad");
    if (_mode === "signup" && !role) return setMsg("Select a role to continue.", "bad");

    $("__authSubmit").disabled = true;
    setMsg("Working…", "");

    try {
      if (_mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return setMsg(error.message || "Login failed.", "bad");
        setMsg("Logged in!", "ok");
        setTimeout(closeModal, 400);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return setMsg(error.message || "Signup failed.", "bad");
        const uid = data?.user?.id;
        if (uid && role) {
          await supabase.from("profiles").upsert(
            { id: uid, role, updated_at: new Date().toISOString() },
            { onConflict: "id" }
          );
        }
        setMsg("Account created! Check your email to confirm.", "ok");
      }
    } catch (err) {
      console.error("[auth-ui] submitAuth:", err);
      setMsg("Something stalled. Try again.", "bad");
    } finally {
      $("__authSubmit").disabled = false;
    }
  }

  async function googleAuth() {
    setMsg("Redirecting to Google…", "");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname + location.search },
    });
    if (error) setMsg(error.message || "Google sign-in failed.", "bad");
  }

  async function forgotPassword() {
    const email = ($("__authEmail")?.value || "").trim().toLowerCase();
    if (!email.includes("@")) return setMsg("Enter your email first.", "bad");
    $("__authForgot").disabled = true;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: CFG.resetRedirectTo,
    });
    $("__authForgot").disabled = false;
    if (error) return setMsg(error.message || "Reset failed.", "bad");
    setMsg("Reset link sent — check your email.", "ok");
  }

  // ── Nav wiring ────────────────────────────────────────────────────────────
  // Supports both nav ID sets used across the site
  function getNavEls() {
    return {
      loginBtn:   $("loginBtn")   || $("navSignInBtn") || $("signinBtn"),
      joinBtn:    $("joinBtn")    || $("navJoinBtn"),
      profileMenu:$("profileMenu")|| $("navProfileWrap"),
      chip:       $("profileChip")|| $("navProfileChip"),
      initials:   $("profileInitials") || $("navProfileInitials"),
      dropdown:   $("dropdown")   || $("navProfileDropdown"),
      signoutBtn: $("signoutBtn") || $("navSignOutBtn"),
      ddEmail:    $("ddEmail")    || $("navDdEmail"),
      myEventsLink: $("myEventsLink"),
    };
  }

  function getInitials(user) {
    const base =
      user?.user_metadata?.handle ||
      user?.user_metadata?.full_name ||
      (user?.email?.split("@")[0]) || "U";
    const cleaned = String(base).replace(/[^a-z0-9]+/gi, " ").trim();
    const parts = cleaned.split(" ").filter(Boolean);
    const raw = parts.length >= 2 ? parts[0][0] + parts[1][0] : cleaned.slice(0, 2) || "U";
    return raw.toUpperCase();
  }

  function updateNavUI() {
    const els = getNavEls();

    if (state.user) {
      els.loginBtn && (els.loginBtn.style.display = "none");
      els.joinBtn && (els.joinBtn.style.display = "none");
      if (els.profileMenu) els.profileMenu.style.display = "flex";
      if (els.initials) els.initials.textContent = getInitials(state.user);
      if (els.ddEmail) els.ddEmail.textContent = state.user.email || "—";

      // Show promoter-only links
      if (els.myEventsLink) {
        els.myEventsLink.style.display =
          (state.role === "promoter" || state.isPromoter) ? "flex" : "none";
      }
    } else {
      els.loginBtn && (els.loginBtn.style.display = "inline-flex");
      els.joinBtn && (els.joinBtn.style.display = "inline-flex");
      if (els.profileMenu) els.profileMenu.style.display = "none";
      // Close dropdown if open
      if (els.dropdown) els.dropdown.classList.remove("open");
    }

    if (state.navBound) return;
    state.navBound = true;

    els.loginBtn?.addEventListener("click", () => openModal("login"));
    els.joinBtn?.addEventListener("click", () => openModal("signup"));

    els.signoutBtn?.addEventListener("click", async () => {
      await supabase.auth.signOut();
      if (els.dropdown) els.dropdown.classList.remove("open");
    });

    // Dropdown toggle
    if (els.chip && els.dropdown) {
      els.chip.addEventListener("click", (e) => {
        e.stopPropagation();
        els.dropdown.classList.toggle("open");
        els.chip.setAttribute("aria-expanded", els.dropdown.classList.contains("open") ? "true" : "false");
      });
      document.addEventListener("click", (e) => {
        if (!els.profileMenu?.contains(e.target)) {
          els.dropdown.classList.remove("open");
          els.chip?.setAttribute("aria-expanded", "false");
        }
      });
      els.dropdown.addEventListener("click", (e) => e.stopPropagation());
    }
  }

  // ── Role loading ──────────────────────────────────────────────────────────
  async function loadRole(userId) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      state.role = data?.role || null;
      state.isPromoter = state.role === "promoter";
    } catch { state.role = null; }
  }

  // ── Auth state ────────────────────────────────────────────────────────────
  let _initDone = false;

  async function init() {
    if (_initDone) return;
    _initDone = true;

    injectStyles();

    const { data: { session } } = await supabase.auth.getSession();
    state.user = session?.user || null;

    if (state.user) await loadRole(state.user.id);

    updateNavUI();
    notifyListeners();
  }

  // Single auth listener for the entire app
  supabase.auth.onAuthStateChange(async (_event, session) => {
    state.user = session?.user || null;

    if (state.user) {
      await loadRole(state.user.id);
      // Resolve any pending requireLogin promises
      while (state.loginResolvers.length) {
        state.loginResolvers.shift()(true);
      }
    } else {
      state.role = null;
      state.isPromoter = false;
    }

    updateNavUI();
    notifyListeners();
  });

  document.addEventListener("DOMContentLoaded", init);

  // ── Notify listeners ──────────────────────────────────────────────────────
  function notifyListeners() {
    state.listeners.forEach((fn) => {
      try { fn({ user: state.user, role: state.role, isPromoter: state.isPromoter }); }
      catch (err) { console.error("[auth-ui] listener error:", err); }
    });
  }

  // ── requireLogin ──────────────────────────────────────────────────────────
  // Returns a Promise<boolean>. Resolves true once the user is logged in,
  // or false if they dismiss the modal.
  async function requireLogin(opts = {}) {
    // Already logged in
    if (state.user) return true;

    // Show toast hint
    if (opts.message) rokToast(opts.message);

    openModal(opts.mode || "login");

    // Return a promise that resolves when auth state changes (login success)
    return new Promise((resolve) => {
      // Resolve true on next successful login (handled in onAuthStateChange)
      state.loginResolvers.push(resolve);

      // If modal is closed without logging in, resolve false
      // We detect this by watching modal close + checking state after a tick
      const observer = new MutationObserver(() => {
        if (!state.modalOpen && !state.user) {
          state.loginResolvers = state.loginResolvers.filter((r) => r !== resolve);
          observer.disconnect();
          resolve(false);
        }
      });
      const el = document.getElementById("__authModal");
      if (el) observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.authUI = {
    // User state
    getUser: () => state.user,
    getRole: () => state.role,
    isPromoter: () => state.isPromoter,
    isAdmin: () => state.isAdmin,

    // Auth actions
    requireLogin,
    signOut: () => supabase.auth.signOut(),

    // Modal control
    open: openModal,
    close: closeModal,

    // Listeners
    onChange: (fn) => { if (typeof fn === "function") state.listeners.push(fn); },

    // Force refresh (e.g. after profile changes)
    refresh: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      state.user = session?.user || null;
      if (state.user) await loadRole(state.user.id);
      updateNavUI();
      notifyListeners();
    },
  };

})();
