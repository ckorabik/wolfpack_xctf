import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js";
import { firebaseConfig, functionsRegion } from "./auth-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, functionsRegion);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ hd: "ignatius.org", prompt: "select_account" });

const getCoachAccess = httpsCallable(functions, "getCoachAccess");
const recordAttendanceCall = httpsCallable(functions, "recordAttendance");
let currentCoach = null;
let accessCheck = null;

function signInErrorMessage(error) {
  if (error?.code === "auth/popup-closed-by-user") return "Google sign-in was closed before it finished.";
  if (error?.code === "auth/popup-blocked") return "Your browser blocked the Google sign-in window. Allow popups and try again.";
  return error?.message || "Google sign-in could not be completed.";
}

async function verifyCoach(user, force = false) {
  if (!user) return null;
  if (!force && accessCheck?.uid === user.uid) return accessCheck.promise;
  const promise = getCoachAccess().then(({ data }) => {
    if (!data?.authorized) throw new Error("This Google account is not on the approved coach list.");
    currentCoach = { uid: user.uid, email: user.email, name: user.displayName || user.email };
    return currentCoach;
  });
  accessCheck = { uid: user.uid, promise };
  return promise;
}

async function coachSignIn() {
  const result = await signInWithPopup(auth, provider);
  return verifyCoach(result.user, true);
}

function createHeaderControl(header) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "coach-auth-control";
  button.textContent = "Coach Login";
  button.setAttribute("aria-label", "Sign in to Coach Utilities");
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      if (currentCoach) {
        await signOut(auth);
        window.location.href = "index.html";
      } else {
        await coachSignIn();
        window.location.href = "coach-tools.html";
      }
    } catch (error) {
      window.alert(signInErrorMessage(error));
    } finally {
      button.disabled = false;
    }
  });
  header.append(button);
  return button;
}

function createGate() {
  const gate = document.createElement("section");
  gate.className = "coach-auth-gate";
  gate.setAttribute("role", "region");
  gate.setAttribute("aria-live", "polite");
  gate.innerHTML = `
    <div class="coach-auth-card">
      <p class="eyebrow">Restricted access</p>
      <h1>Coach Login</h1>
      <p data-auth-message>Sign in with an approved coach Google account to continue.</p>
      <button class="primary-button" type="button" data-auth-sign-in>Continue with Google <span>→</span></button>
      <a href="index.html">Return home</a>
    </div>`;
  document.querySelector(".site-header")?.after(gate);
  return gate;
}

function revealCoachPage(gate) {
  document.body.classList.remove("coach-auth-pending");
  document.body.classList.add("coach-auth-approved");
  gate?.remove();
}

function showGateMessage(gate, message) {
  const element = gate?.querySelector("[data-auth-message]");
  if (element) element.textContent = message;
}

async function initializeCoachPage() {
  const coachOnly = document.body.hasAttribute("data-coach-only");
  const header = document.querySelector(".site-header");
  const headerButton = header ? createHeaderControl(header) : null;
  const gate = coachOnly ? createGate() : null;
  const gateButton = gate?.querySelector("[data-auth-sign-in]");

  gateButton?.addEventListener("click", async () => {
    gateButton.disabled = true;
    showGateMessage(gate, "Checking your Google account…");
    try {
      await coachSignIn();
      revealCoachPage(gate);
    } catch (error) {
      showGateMessage(gate, signInErrorMessage(error));
    } finally {
      gateButton.disabled = false;
    }
  });

  onAuthStateChanged(auth, async (user) => {
    currentCoach = null;
    if (!user) {
      if (headerButton) headerButton.textContent = "Coach Login";
      if (coachOnly) showGateMessage(gate, "Sign in with an approved coach Google account to continue.");
      return;
    }
    try {
      const coach = await verifyCoach(user);
      if (headerButton) {
        headerButton.textContent = "Coach Logout";
        headerButton.title = coach.email;
      }
      if (coachOnly) revealCoachPage(gate);
    } catch (error) {
      if (headerButton) headerButton.textContent = "Coach Login";
      if (coachOnly) showGateMessage(gate, "This Google account is not on the approved coach list.");
    }
  });
}

window.WOLFPACK_AUTH = {
  get coach() {
    return currentCoach;
  },
  async requireCoach() {
    if (!auth.currentUser) throw new Error("Please sign in with an approved coach account.");
    return verifyCoach(auth.currentUser);
  },
  async recordAttendance(payload) {
    await this.requireCoach();
    const { data } = await recordAttendanceCall(payload);
    return data;
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCoachPage, { once: true });
} else {
  initializeCoachPage();
}
