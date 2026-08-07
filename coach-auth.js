import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  getIdTokenResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signOut,
  setPersistence,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";
import { firebaseConfig, functionsRegion } from "./auth-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, functionsRegion);
const GOOGLE_CLIENT_ID = "144270530422-2a27v11915le689usqer1rlqo2qi20um.apps.googleusercontent.com";

const getCoachAccess = httpsCallable(functions, "getCoachAccess");
const getSiteAccess = httpsCallable(functions, "getSiteAccess");
const recordAttendanceCall = httpsCallable(functions, "recordAttendance");
const STANDARD_ACCESS_KEY = "wolfpack-standard-access";
const STANDARD_ACCESS_DAYS = 30;
let currentCoach = null;
let accessCheck = null;
let authGate = null;
let googleIdentityPromise = null;

function authErrorMessage(error) {
  if (error?.code === "auth/unauthorized-domain") return "Google sign-in is not authorized for this website domain.";
  if (error?.code === "functions/permission-denied") return error.message || "That account or access code is not approved.";
  return error?.message || "Authentication could not be completed.";
}

function rememberStandardAccess() {
  const expires = Date.now() + STANDARD_ACCESS_DAYS * 24 * 60 * 60 * 1000;
  try {
    window.localStorage.setItem(STANDARD_ACCESS_KEY, String(expires));
  } catch {}
  if (location.hostname === "wolfpack-xctf.com" || location.hostname.endsWith(".wolfpack-xctf.com")) {
    document.cookie = `${STANDARD_ACCESS_KEY}=${expires}; Max-Age=${STANDARD_ACCESS_DAYS * 86400}; Path=/; Domain=wolfpack-xctf.com; SameSite=Lax; Secure`;
  }
}

function hasRememberedStandardAccess() {
  let expires = 0;
  try {
    expires = Number(window.localStorage.getItem(STANDARD_ACCESS_KEY)) || 0;
  } catch {}
  const cookie = document.cookie.split("; ").find((item) => item.startsWith(`${STANDARD_ACCESS_KEY}=`));
  expires = Math.max(expires, Number(cookie?.split("=")[1]) || 0);
  return expires > Date.now();
}

function forgetStandardAccess() {
  try {
    window.localStorage.removeItem(STANDARD_ACCESS_KEY);
  } catch {}
  document.cookie = `${STANDARD_ACCESS_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
  if (location.hostname === "wolfpack-xctf.com" || location.hostname.endsWith(".wolfpack-xctf.com")) {
    document.cookie = `${STANDARD_ACCESS_KEY}=; Max-Age=0; Path=/; Domain=wolfpack-xctf.com; SameSite=Lax; Secure`;
  }
}

async function verifyCoach(user, force = false) {
  if (!user || user.isAnonymous) return null;
  if (!force && accessCheck?.uid === user.uid) return accessCheck.promise;
  const promise = getCoachAccess().then(({ data }) => {
    if (!data?.authorized) throw new Error("This Google account is not on the approved coach list.");
    currentCoach = { uid: user.uid, email: user.email, name: user.displayName || user.email };
    return currentCoach;
  });
  accessCheck = { uid: user.uid, promise };
  return promise;
}

async function hasStandardAccess(user, forceRefresh = false) {
  if (!user?.isAnonymous) return false;
  const token = await getIdTokenResult(user, forceRefresh);
  return token.claims.siteAccess === true && token.claims.role === "standard";
}

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (googleIdentityPromise) return googleIdentityPromise;
  googleIdentityPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Google sign-in could not be loaded. Check your connection and try again."));
    document.head.append(script);
  });
  return googleIdentityPromise;
}

async function renderCoachSignIn(gate) {
  const container = gate.querySelector("[data-google-coach-button]");
  if (!container || container.dataset.rendered) return;
  container.dataset.rendered = "true";
  try {
    const google = await loadGoogleIdentity();
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      hd: "ignatius.org",
      auto_select: false,
      cancel_on_tap_outside: false,
      callback: async ({ credential }) => {
        showGateMessage(gate, "Checking your coach account…");
        try {
          const firebaseCredential = GoogleAuthProvider.credential(credential);
          const result = await signInWithCredential(auth, firebaseCredential);
          await verifyCoach(result.user, true);
          revealSite("coach");
        } catch (error) {
          if (auth.currentUser && !auth.currentUser.isAnonymous) await signOut(auth);
          showGateMessage(gate, authErrorMessage(error));
        }
      },
    });
    google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: Math.min(400, Math.max(240, container.clientWidth || 320)),
    });
  } catch (error) {
    container.dataset.rendered = "";
    showGateMessage(gate, authErrorMessage(error));
  }
}

async function standardSignIn(accessCode) {
  let user = auth.currentUser;
  if (!user?.isAnonymous) {
    await signOut(auth);
    user = null;
  }
  if (!user) user = (await signInAnonymously(auth)).user;
  try {
    const { data } = await getSiteAccess({ accessCode });
    if (!data?.authorized) throw new Error("That access code is not valid.");
    await user.getIdToken(true);
    rememberStandardAccess();
    return user;
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}

function createHeaderControl(header) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "site-auth-control";
  button.textContent = "Log Out";
  button.setAttribute("aria-label", "Log out of Wolfpack XC");
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      forgetStandardAccess();
      currentCoach = null;
      accessCheck = null;
      if (auth.currentUser) await signOut(auth);
      window.location.href = "index.html";
    } catch (error) {
      window.alert(authErrorMessage(error));
    } finally {
      button.disabled = false;
    }
  });
  header.append(button);
  return button;
}

function createSiteGate() {
  const gate = document.createElement("section");
  gate.className = "site-auth-gate";
  gate.setAttribute("role", "dialog");
  gate.setAttribute("aria-modal", "true");
  gate.setAttribute("aria-labelledby", "site-login-title");
  gate.innerHTML = `
    <div class="site-auth-card">
      <div class="site-auth-brand"><span class="brand-mark">W</span><span>Wolfpack XC</span></div>
      <p class="eyebrow">Team access</p>
      <h1 id="site-login-title">Welcome to the Pack</h1>
      <p class="site-auth-intro">Coaches can continue with Google. Athletes and families can enter the team access code.</p>
      <div class="google-coach-button" data-google-coach-button aria-label="Coach sign-in with Google"></div>
      <div class="site-auth-divider"><span>or</span></div>
      <form class="site-code-form" data-access-form>
        <label for="site-access-code">Team access code</label>
        <div><input id="site-access-code" name="accessCode" type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="12" required /><button type="submit">Enter site <span>→</span></button></div>
      </form>
      <p class="site-auth-status" data-auth-message role="status"></p>
    </div>`;
  document.body.append(gate);
  return gate;
}

function createCoachGate() {
  const gate = document.createElement("section");
  gate.className = "coach-auth-gate";
  gate.setAttribute("role", "region");
  gate.setAttribute("aria-live", "polite");
  gate.innerHTML = `
    <div class="coach-auth-card">
      <p class="eyebrow">Restricted access</p>
      <h1>Coach Login</h1>
      <p data-auth-message>Sign in with an approved coach Google account to continue.</p>
      <div class="google-coach-button" data-google-coach-button aria-label="Coach sign-in with Google"></div>
      <a href="index.html">Return home</a>
    </div>`;
  document.querySelector(".site-header")?.after(gate);
  return gate;
}

function showGateMessage(gate, message) {
  const element = gate?.querySelector("[data-auth-message]");
  if (element) element.textContent = message;
}

function revealSite(role) {
  document.body.classList.remove("site-auth-pending", "coach-auth-pending", "site-standard", "site-coach");
  document.body.classList.add(role === "coach" ? "site-coach" : "site-standard");
  authGate?.remove();
  authGate = null;
}

function showSiteGate(message = "") {
  document.body.classList.add("site-auth-pending");
  if (!authGate?.isConnected || !authGate.classList.contains("site-auth-gate")) authGate = createSiteGate();
  showGateMessage(authGate, message);
  wireGateActions(authGate);
}

function wireGateActions(gate) {
  if (gate.dataset.wired) return;
  gate.dataset.wired = "true";
  const accessForm = gate.querySelector("[data-access-form]");
  renderCoachSignIn(gate);
  accessForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = accessForm.querySelector("button[type=submit]");
    const code = new FormData(accessForm).get("accessCode");
    submit.disabled = true;
    showGateMessage(gate, "Checking the team access code…");
    try {
      await standardSignIn(code);
      revealSite("standard");
    } catch (error) {
      showGateMessage(gate, authErrorMessage(error));
      accessForm.querySelector("input")?.focus();
    } finally {
      submit.disabled = false;
    }
  });
}

async function initializeSiteAuthentication() {
  const coachOnly = document.body.hasAttribute("data-coach-only");
  document.body.classList.add("site-auth-pending");
  const header = document.querySelector(".site-header");
  const headerButton = header ? createHeaderControl(header) : null;
  const rememberedStandardAccess = hasRememberedStandardAccess();

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    showSiteGate("Your browser could not save the login session. Allow site storage and try again.");
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    currentCoach = null;
    if (!user) {
      if (headerButton) headerButton.textContent = "Log Out";
      if (rememberedStandardAccess) {
        if (coachOnly) {
          document.body.classList.remove("site-auth-pending");
          authGate?.remove();
          authGate = createCoachGate();
          wireGateActions(authGate);
        } else {
          revealSite("standard");
        }
        return;
      }
      showSiteGate();
      return;
    }
    try {
      if (!user.isAnonymous) {
        const coach = await verifyCoach(user);
        if (!coach) throw new Error("This Google account is not approved for Coach Utilities.");
        if (headerButton) {
          headerButton.textContent = "Coach Logout";
          headerButton.title = coach.email;
        }
        revealSite("coach");
        return;
      }
      if (!(await hasStandardAccess(user))) {
        if (rememberedStandardAccess && !coachOnly) {
          revealSite("standard");
          return;
        }
        await signOut(auth);
        return;
      }
      rememberStandardAccess();
      if (coachOnly) {
        document.body.classList.remove("site-auth-pending");
        authGate?.remove();
        authGate = createCoachGate();
        wireGateActions(authGate);
        return;
      }
      if (headerButton) headerButton.textContent = "Log Out";
      revealSite("standard");
    } catch (error) {
      if (!user.isAnonymous) await signOut(auth);
      showSiteGate(authErrorMessage(error));
    }
  });
}

window.WOLFPACK_AUTH = {
  get coach() {
    return currentCoach;
  },
  async requireCoach() {
    if (!auth.currentUser || auth.currentUser.isAnonymous) throw new Error("Please sign in with an approved coach account.");
    return verifyCoach(auth.currentUser);
  },
  async recordAttendance(payload) {
    await this.requireCoach();
    const { data } = await recordAttendanceCall(payload);
    return data;
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSiteAuthentication, { once: true });
} else {
  initializeSiteAuthentication();
}
