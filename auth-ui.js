// auth-ui.js
// Assumes window.supabase is already created.

function initialsFromEmail(email) {
  if (!email) return "U";
  const name = email.split("@")[0].replace(/[^a-z0-9]+/gi, " ").trim();
  const parts = name.split(" ").filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

async function updateNavAuthUI() {
  const { data: { user } } = await supabase.auth.getUser();

  const signInBtn   = document.getElementById("navSignInBtn");
  const wrap        = document.getElementById("navProfileWrap");
  const chip        = document.getElementById("navProfileChip");
  const initialsEl  = document.getElementById("navProfileInitials");
  const dropdown    = document.getElementById("navProfileDropdown");
  const signOutBtn  = document.getElementById("navSignOutBtn");

  if (!signInBtn || !wrap || !chip || !initialsEl || !dropdown || !signOutBtn) {
    return; // page doesn't have nav auth
  }

  if (user) {
    signInBtn.style.display = "none";
    wrap.style.display = "flex";
    initialsEl.textContent = initialsFromEmail(user.email || "");
  } else {
    signInBtn.style.display = "inline-flex";
    wrap.style.display = "none";
    dropdown.style.display = "none";
  }

  // Sign in
  signInBtn.onclick = async () => {
    const email = prompt("Enter your email to sign in:");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href }
    });
    if (error) alert("Sign-in error: " + error.message);
    else alert("Magic link sent! Check your inbox.");
  };

  // Toggle dropdown
  chip.onclick = (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
  };

  // Click outside
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) dropdown.style.display = "none";
  });

  // Sign out
  signOutBtn.onclick = async () => {
    await supabase.auth.signOut();
    await updateNavAuthUI();
  };
}

// Global helper: guard actions behind login
window.requireLogin = async function (callback) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Please sign in first.");
    const btn = document.getElementById("navSignInBtn");
    if (btn) btn.click();
    return false;
  }
  if (callback) callback(user);
  return true;
};

// Init on load + on auth change
document.addEventListener("DOMContentLoaded", updateNavAuthUI);
supabase.auth.onAuthStateChange(updateNavAuthUI);
