const SUPABASE_URL = "https://ccxzjjsxggrxiaaehxxu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Qbn3NBaKGonv84Ud-KDszQ_owgaWLSl";

const views = {
  loading: document.querySelector("#loading-state"),
  welcome: document.querySelector("#welcome-state"),
  error: document.querySelector("#error-state"),
  success: document.querySelector("#success-state"),
  recovery: document.querySelector("#recovery-form"),
  recoverySuccess: document.querySelector("#recovery-success-state"),
};

const showView = (viewName) => {
  for (const [name, element] of Object.entries(views)) {
    element.hidden = name !== viewName;
  }
};

function showError(message) {
  document.querySelector("#error-message").textContent = message;
  showView("error");
}

function isNetworkError(error) {
  return error instanceof TypeError ||
    /failed to fetch|network|timed? ?out|load failed/i.test(error?.message ?? "");
}

function errorMessage(error) {
  if (isNetworkError(error)) {
    return "We couldn’t reach LUMINHAW accounts. Check your internet connection and try the link again.";
  }
  const code = String(error?.code ?? error?.name ?? "").toLowerCase();
  if (/expired|invalid|used|otp|token|access_denied/.test(code)) {
    return "This link is invalid, expired, or has already been used. Request a new email from the LUMINHAW app and open its latest link.";
  }
  return "We couldn’t complete this account request. The link may be invalid, expired, or already used. Request a new email from the LUMINHAW app.";
}

function clearSensitiveUrl() {
  window.history.replaceState(null, "", window.location.pathname);
}

async function loadSupabaseClient() {
  const { createClient } = await import(
    "https://esm.sh/@supabase/supabase-js@2.119.0"
  );
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function verifyEmail(client, tokenHash, type) {
  const { data, error } = await client.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  if (error) throw error;
  if (!data.user) throw new Error("verification_user_missing");
  showView("success");
}

async function verifyRecovery(client, tokenHash) {
  const { data, error } = await client.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });
  if (error) throw error;
  if (!data.user || !data.session?.access_token) {
    throw new Error("recovery_session_missing");
  }
  showView("recovery");
}

async function exchangeCode(client, code, flow) {
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error) throw error;
  if (!data.user) throw new Error("verification_user_missing");
  if (flow === "recovery") {
    if (!data.session?.access_token) throw new Error("recovery_session_missing");
    showView("recovery");
    return;
  }
  showView("success");
}

function setupPasswordForm(client) {
  const form = document.querySelector("#recovery-form");
  const password = document.querySelector("#new-password");
  const confirmation = document.querySelector("#confirm-password");
  const passwordError = document.querySelector("#password-error");
  const confirmationError = document.querySelector("#confirm-error");
  const submit = document.querySelector("#submit-password");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;

    passwordError.textContent = "";
    confirmationError.textContent = "";
    password.removeAttribute("aria-invalid");
    confirmation.removeAttribute("aria-invalid");

    if (password.value.length === 0 || password.value.length < 8) {
      passwordError.textContent = password.value.length === 0
        ? "Enter a new password."
        : "Use at least 8 characters.";
      password.setAttribute("aria-invalid", "true");
      password.focus();
      return;
    }
    if (confirmation.value.length === 0) {
      confirmationError.textContent = "Confirm your new password.";
      confirmation.setAttribute("aria-invalid", "true");
      confirmation.focus();
      return;
    }
    if (password.value !== confirmation.value) {
      confirmationError.textContent = "The passwords do not match.";
      confirmation.setAttribute("aria-invalid", "true");
      confirmation.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = "Updating password…";
    try {
      const { data, error } = await client.auth.updateUser({
        password: password.value,
      });
      if (error) throw error;
      if (!data.user) throw new Error("password_update_unconfirmed");
      password.value = "";
      confirmation.value = "";
      showView("recoverySuccess");
    } catch (error) {
      if (isNetworkError(error)) {
        passwordError.textContent = "We couldn’t reach LUMINHAW accounts. Check your connection and try again.";
      } else {
        passwordError.textContent = "Your password was not changed. The recovery link may have expired; request a new one and try again.";
      }
    } finally {
      submit.disabled = false;
      submit.textContent = "Update password";
    }
  });
}

async function start() {
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get("token_hash");
  const type = params.get("type") ?? params.get("flow");
  const code = params.get("code");
  const authError = params.get("error_description") ??
    params.get("error_code") ??
    params.get("error");

  clearSensitiveUrl();
  if (authError) {
    showError(errorMessage({ code: authError }));
    return;
  }
  if (!tokenHash && !code) {
    showView("welcome");
    return;
  }

  try {
    const client = await loadSupabaseClient();
    setupPasswordForm(client);
    if (tokenHash) {
      if (type === "recovery") {
        await verifyRecovery(client, tokenHash);
      } else if (type === "signup") {
        await verifyEmail(client, tokenHash, "signup");
      } else {
        throw new Error("unsupported_token_type");
      }
      return;
    }
    if (code) {
      await exchangeCode(client, code, type);
    }
  } catch (error) {
    showError(errorMessage(error));
  }
}

start().catch((error) => {
  showError(errorMessage(error));
});
