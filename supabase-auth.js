(function initializeSupabaseAuth() {
  const authClient = window.menuSupabaseClient;
  const isAuthPage = document.body.dataset.page === "auth";
  const isAdminPage = document.body.dataset.page === "admin";
  if (!authClient) return;

  const goToMain = () => window.location.replace("index.html");
  const goToAuth = () => window.location.replace("auth.html");

  function errorMessage(error) {
    const code = error && error.code;
    if (code === "invalid_credentials") return "이메일 또는 비밀번호가 올바르지 않습니다.";
    if (code === "email_not_confirmed") return "이메일 인증을 완료한 뒤 로그인해 주세요.";
    if (code === "user_already_exists" || code === "email_exists") return "이미 가입된 이메일입니다. 로그인해 주세요.";
    if (code === "weak_password") return "비밀번호는 6자 이상으로 입력해 주세요.";
    if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit") return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    return "인증 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
  }

  function setFeedback(message, type) {
    const feedback = document.getElementById("auth-feedback");
    if (!feedback) return;
    feedback.textContent = message || "";
    feedback.className = `auth-feedback${type ? ` is-${type}` : ""}`;
  }

  function getControls() {
    let controls = document.getElementById("auth-controls");
    if (!controls && !isAuthPage) {
      controls = document.createElement("div");
      controls.id = "auth-controls";
      controls.className = "auth-controls";
      document.body.appendChild(controls);
    }
    return controls;
  }

  async function getUserRole(user) {
    const { data, error } = await authClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !data) return "user";
    return data.role === "admin" ? "admin" : "user";
  }

  function renderControls(user, role) {
    const controls = getControls();
    if (!controls || !user) return;
    const email = document.createElement("span");
    email.className = "auth-user";
    email.textContent = user.email || "로그인 사용자";
    const adminLink = document.createElement("a");
    adminLink.className = "admin-menu-link";
    adminLink.href = "admin.html";
    adminLink.textContent = "관리자페이지";
    const button = document.createElement("button");
    button.className = "logout-button";
    button.type = "button";
    button.textContent = "로그아웃";
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "로그아웃 중...";
      const { error } = await authClient.auth.signOut();
      if (error) {
        button.disabled = false;
        button.textContent = "로그아웃";
        window.alert("로그아웃하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.");
      }
    });
    controls.replaceChildren(email, ...(role === "admin" ? [adminLink] : []), button);
  }

  let accessCheckId = 0;

  async function applyAccess(session) {
    const checkId = ++accessCheckId;
    if (isAuthPage) {
      if (session) goToMain();
      return;
    }
    if (!session) {
      goToAuth();
      return;
    }
    const role = await getUserRole(session.user);
    if (checkId !== accessCheckId) return;
    if (isAdminPage && role !== "admin") {
      goToMain();
      return;
    }
    if (isAdminPage) document.body.classList.remove("access-pending");
    renderControls(session.user, role);
  }

  function showTab(name) {
    const login = name === "login";
    document.getElementById("login-form").hidden = !login;
    document.getElementById("signup-form").hidden = login;
    document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
      const active = tab.dataset.authTab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    setFeedback("");
  }

  function setSubmitting(form, value) {
    form.querySelector("button[type='submit']").disabled = value;
  }

  async function login(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    if (!email || !password) return setFeedback("이메일과 비밀번호를 모두 입력해 주세요.", "error");
    setSubmitting(form, true);
    setFeedback("로그인 중입니다.", "info");
    const { error } = await authClient.auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitting(form, false);
      return setFeedback(errorMessage(error), "error");
    }
    setFeedback("로그인되었습니다. 메인 화면으로 이동합니다.", "success");
    goToMain();
  }

  async function signUp(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    if (!email || !password) return setFeedback("이메일과 비밀번호를 모두 입력해 주세요.", "error");
    if (password.length < 6) return setFeedback("비밀번호는 6자 이상으로 입력해 주세요.", "error");
    setSubmitting(form, true);
    setFeedback("회원가입 중입니다.", "info");
    const { data, error } = await authClient.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/index.html` } });
    if (error) {
      setSubmitting(form, false);
      return setFeedback(errorMessage(error), "error");
    }
    if (data.session) {
      setFeedback("회원가입이 완료되었습니다. 메인 화면으로 이동합니다.", "success");
      return goToMain();
    }
    setSubmitting(form, false);
    setFeedback("가입 확인 이메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.", "success");
  }

  let isAuthPageSetup = false;

  function setupAuthPage() {
    if (isAuthPageSetup) return;
    isAuthPageSetup = true;
    showTab("login");
    document.querySelectorAll("[data-auth-tab]").forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.authTab)));
    document.getElementById("login-form").addEventListener("submit", login);
    document.getElementById("signup-form").addEventListener("submit", signUp);
  }

  if (isAuthPage) setupAuthPage();

  authClient.auth.onAuthStateChange((_event, session) => {
    applyAccess(session);
  });

  authClient.auth.getSession().then(({ data, error }) => {
    if (error) {
      if (isAuthPage) setFeedback("로그인 상태를 확인하지 못했습니다. 네트워크를 확인해 주세요.", "error");
      return;
    }
    if (isAuthPage && !data.session) {
      setupAuthPage();
      return;
    }
    applyAccess(data.session);
  });
})();
