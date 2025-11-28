// /auth-ui.js
// Shared Supabase auth + nav UI + Promoter role helper

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
        fn({ user: state.user, isPromoter: state.isPromoter });
      } catch (err) {
        console.error("[auth-ui] listener error:", err);
      }
    });
  }

  // -----------------------
  // Nav UI wiring
  // -----------------------
  function updateNavUI() {
    // Support both "nav*" IDs and older generic IDs so pages don't break
    const signInBtn = $("navSignInBtn") || $("signinBtn");
    const profileWrap = $("navProfileWrap") || $("profileMenu");
    const chip = $("navProfileChip") || $("profileChip");
    const initialsEl = $("navProfileInitials") || $("profileInitials");
    const dropdown = $("navProfileDropdown") || $("dropdown");
    const signOutBtn = $("navSignOutBtn") || $("signoutBtn");

    const hasNav = signInBtn || profileWrap || chip;
    if (!hasNav) return;

    // Show/hide based on auth state
    if (state.user) {
      if (signInBtn) signInBtn.style.display = "none";
      if (profileWrap) profileWrap.style.display = "flex";

      if (initialsEl) {
        const base = state.user.user_metadata?.full_name || state.user.email || "U";
        initialsEl.textContent = base.trim().charAt(0).toUpperCase();
      }
    } else {
      if (signInBtn) signInBtn.style.display = "inline-flex";
      if (profileWrap) profileWrap.style.display = "none";
      if (dropdown) dropdown.style.display = "none";
    }

    // Only bind click handlers once
    if (state.navBound) return;
    state.navBound = true;

    // Sign in / magic link
    if (signInBtn) {
      signInBtn.addEventListener("click", () => startSignin());
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
  async function startSignin(promptLabel) {
    const label = promptLabel || "Enter your email to sign in:";
    const email = window.prompt(label);
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });

    if (error) {
      alert("Sign-in error: " + error.message);
      return;
    }
    alert("Magic link sent! Check your email.");
  }

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
      const msg = opts.message || "Please sign in first.";
      alert(msg);
    }

    await startSignin(opts.promptLabel);
    // user will still have to reload or wait for onAuthStateChange
    return false;
  }

  /**
   * Ensure the current user is a Promoter.
   * Usage:
   *   const res = await authUI.ensurePromoter({ autoOffer: true });
   *   if (!res.promoter) return; // block
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

    // If not autoOffer, just say "no"
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

    // If unique violation, they're already in; otherwise, we just added them
    await checkPromoter();
    updateNavUI();
    notifyListeners();

    return { promoter: state.isPromoter };
  }

  // -----------------------
  // Supabase auth listener
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
    startSignin,
    signOut,
    refresh() {
      return loadUserAndRole();
    },
    escapeHTML,
  };
})();
