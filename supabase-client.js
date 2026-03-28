// supabase-client.js
// Single source of truth for the Supabase client.
// Include ONCE per page, BEFORE auth-ui.js and any page scripts.

(function () {
  if (window.__rokSupabaseReady) return; // prevent double-init
  window.__rokSupabaseReady = true;

  // These values are intentionally public — the anon key is designed to be
  // embedded in browser code. Supabase security is enforced by Row Level
  // Security (RLS) policies, not by hiding this key. See .env for reference.
  // The SUPABASE_SERVICE_ROLE_KEY (the real secret) is only used server-side
  // in create-checkout-session.js and stripe-webhook.js via process.env.
  const SUPABASE_URL = "https://dtgnvzjtojdqmujzokgh.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Z252emp0b2pkcW11anpva2doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMTkwMDAsImV4cCI6MjA3Nzc5NTAwMH0.r8LBQ14sxABB0mIw0exPlmv19W1fx0-iKLyefPhh8d8";

 const supabaseLib = window.supabase;
 window.supabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  // ─── Shared helpers ───────────────────────────────────────────────

  /**
   * Get the current user (from persisted session — fast, no network).
   */
  window.rokGetUser = async function () {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  };

  /**
   * safeSelect: retries a Supabase query with fallback column lists.
   * Use when you're not sure which columns exist on a table/view.
   *
   * @param {string} table  - table or view name
   * @param {string[]} columnSets - ordered list of column strings to try
   * @param {function} buildQuery - receives a SupabaseQueryBuilder, returns it
   * @returns {{ data, error }}
   */
  window.rokSafeSelect = async function (table, columnSets, buildQuery) {
    let lastErr = null;
    for (const cols of columnSets) {
      const q = buildQuery(supabase.from(table).select(cols));
      const res = await q;
      if (!res.error) return res;
      lastErr = res.error;
      const msg = (res.error.message || "").toLowerCase();
      // only retry on column/schema errors
      if (!msg.includes("column") && !msg.includes("does not exist") && !msg.includes("relation")) break;
    }
    return { data: null, error: lastErr };
  };

  /**
   * Get a public URL from Supabase Storage.
   * Falls back to the passed url as-is if it already looks like a full URL.
   */
  window.rokStorageUrl = function (bucket, path) {
    if (!path) return null;
    if (path.startsWith("http")) return path; // already absolute
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  };

  /**
   * Escape HTML for safe DOM insertion.
   */
  window.rokEsc = function (s) {
    return String(s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[m]));
  };

  /**
   * Format a date string nicely.
   */
  window.rokDate = function (iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("en-JM", {
        month: "short", day: "numeric", year: "numeric",
      });
    } catch { return ""; }
  };

  /**
   * Tiny toast notification.
   */
  window.rokToast = function (message, kind = "info") {
    let el = document.getElementById("__rokToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "__rokToast";
      Object.assign(el.style, {
        position: "fixed", left: "50%", bottom: "24px",
        transform: "translateX(-50%)",
        background: "rgba(10,10,14,0.94)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#fff", padding: "10px 18px", borderRadius: "999px",
        fontSize: "13px", letterSpacing: "0.02em",
        zIndex: "99999", boxShadow: "0 18px 40px rgba(0,0,0,0.6)",
        backdropFilter: "blur(14px)", opacity: "0",
        transition: "opacity 0.18s ease, transform 0.18s ease",
        pointerEvents: "none", maxWidth: "min(520px,92vw)",
        textAlign: "center", fontFamily: "Rajdhani, system-ui, sans-serif",
      });
      document.body.appendChild(el);
    }
    const colors = { ok: "#9affc5", bad: "#ff9a9a", info: "#fff" };
    el.style.color = colors[kind] || "#fff";
    el.textContent = message;
    el.style.opacity = "1";
    el.style.transform = "translateX(-50%) translateY(-2px)";
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(-50%) translateY(6px)";
    }, 2800);
  };

})();
