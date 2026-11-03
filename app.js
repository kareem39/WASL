
const SUPABASE_URL = "https://rpvzcotaktgcokpvyywo.supabase.co";
const SUPABASE_KEY = "sb_publishable_GcErdM5K3YHHYdwfyb7rjg_Ys9wLhYB";

let db = null;
let currentUser = null;
let requestedRole = "rider";

const $ = id => document.getElementById(id);

const accountOverlay = $("accountOverlay");
const joinOverlay = $("joinOverlay");

function showOverlay(overlay) {
  overlay?.classList.add("show");
  document.body.classList.add("wasl-locked");
}

function hideOverlay(overlay) {
  overlay?.classList.remove("show");

  if (
    !accountOverlay?.classList.contains("show") &&
    !joinOverlay?.classList.contains("show")
  ) {
    document.body.classList.remove("wasl-locked");
  }
}

function showMessage(id, message, isError = false) {
  const box = $(id);
  if (!box) return;

  box.textContent = message;
  box.classList.add("show");
  box.classList.toggle("error", isError);
}

function clearMessage(id) {
  const box = $(id);
  if (!box) return;

  box.textContent = "";
  box.classList.remove("show", "error");
}

function setLoading(form, loading) {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;

  button.disabled = loading;
  button.style.opacity = loading ? ".6" : "1";
  button.textContent = loading
    ? "جاري التنفيذ..."
    : button.dataset.originalText;
}

function prepareForms() {
  document.querySelectorAll("form").forEach(form => {
    const button = form.querySelector('button[type="submit"]');
    if (button) button.dataset.originalText = button.textContent;
  });
}

function openAccount() {
  clearMessage("accountMessage");
  showOverlay(accountOverlay);
  displayAccount();
}

function displayPanel(name) {
  ["loginPanel", "signupPanel", "profilePanel"].forEach(id => {
    $(id)?.classList.toggle("wasl-hidden", id !== name);
  });
}

async function displayAccount() {
  try {
    const { data, error } = await db.auth.getSession();
    if (error) throw error;

    currentUser = data.session?.user || null;

    if (!currentUser) {
      displayPanel("loginPanel");
      return;
    }

    displayPanel("profilePanel");
    $("profileEmail").textContent = currentUser.email || "";

    const { data: requests, error: requestError } = await db
      .from("join_requests")
      .select("requested_role,status")
      .eq("user_id", currentUser.id);

    if (requestError) throw requestError;

    let statusText = "حسابك مفعل كعميل.";

    if (requests?.length) {
      const names = {
        store_owner: "تاجر",
        rider: "مندوب"
      };

      const statuses = {
        pending: "قيد المراجعة",
        approved: "تمت الموافقة",
        rejected: "مرفوض"
      };

      statusText = requests.map(request =>
        `طلب ${names[request.requested_role]}: ${statuses[request.status]}`
      ).join("\n");
    }

    $("profileStatus").textContent = statusText;

  } catch (error) {
    console.error(error);
    showMessage(
      "accountMessage",
      "حصل خطأ أثناء تحميل حسابك: " + error.message,
      true
    );
  }
}

async function signIn(event) {
  event.preventDefault();

  const form = event.currentTarget;
  clearMessage("accountMessage");
  setLoading(form, true);

  try {
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    currentUser = data.user;
    form.reset();

    showMessage("accountMessage", "تم تسجيل الدخول بنجاح.");
    await displayAccount();

  } catch (error) {
    showMessage(
      "accountMessage",
      error.message || "تعذر تسجيل الدخول.",
      true
    );
  } finally {
    setLoading(form, false);
  }
}

async function signUp(event) {
  event.preventDefault();

  const form = event.currentTarget;
  clearMessage("accountMessage");
  setLoading(form, true);

  try {
    const fullName = $("signupName").value.trim();
    const phone = $("signupPhone").value.trim();
    const email = $("signupEmail").value.trim();
    const password = $("signupPassword").value;

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
        data: {
          full_name: fullName,
          phone: phone
        }
      }
    });

    if (error) throw error;

    if (data.session && data.user) {
      currentUser = data.user;

      const { error: profileError } = await db
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone
        })
        .eq("user_id", currentUser.id);

      if (profileError) throw profileError;

      form.reset();
      showMessage("accountMessage", "تم إنشاء حسابك بنجاح.");
      await displayAccount();

    } else {
      form.reset();
      displayPanel("loginPanel");
      showMessage(
        "accountMessage",
        "تم إنشاء الحساب. افتح بريدك الإلكتروني واضغط رابط التأكيد، وبعدها سجل دخولك."
      );
    }

  } catch (error) {
    showMessage(
      "accountMessage",
      error.message || "تعذر إنشاء الحساب.",
      true
    );
  } finally {
    setLoading(form, false);
  }
}

async function startJoin(role) {
  clearMessage("accountMessage");

  const { data, error } = await db.auth.getSession();
  if (error) throw error;

  currentUser = data.session?.user || null;

  if (!currentUser) {
    displayPanel("loginPanel");
    showMessage(
      "accountMessage",
      "سجل دخولك أولاً علشان تقدم طلب الانضمام."
    );
    return;
  }

  requestedRole = role;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("full_name,phone")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (profileError) throw profileError;

  $("joinName").value = profile?.full_name || "";
  $("joinPhone").value = profile?.phone || "";

  $("joinTitle").textContent =
    role === "store_owner" ? "طلب انضمام كتاجر" : "طلب انضمام كمندوب";

  clearMessage("joinMessage");
  showOverlay(joinOverlay);
}

async function submitJoin(event) {
  event.preventDefault();

  const form = event.currentTarget;
  clearMessage("joinMessage");
  setLoading(form, true);

  try {
    const fullName = $("joinName").value.trim();
    const phone = $("joinPhone").value.trim();

    if (!fullName || !phone) {
      throw new Error("اكتب الاسم ورقم الهاتف.");
    }

    const { data, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;

    currentUser = data.session?.user || null;

    if (!currentUser) {
      throw new Error("انتهت جلسة الدخول. سجل دخولك مرة أخرى.");
    }

    const { error: profileError } = await db
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone
      })
      .eq("user_id", currentUser.id);

    if (profileError) throw profileError;

    const { data: existing, error: existingError } = await db
      .from("join_requests")
      .select("id,status")
      .eq("user_id", currentUser.id)
      .eq("requested_role", requestedRole)
      .eq("status", "pending");

    if (existingError) throw existingError;

    if (existing?.length) {
      throw new Error("لديك طلب سابق قيد المراجعة.");
    }

    const { error: insertError } = await db
      .from("join_requests")
      .insert({
        user_id: currentUser.id,
        requested_role: requestedRole,
        full_name: fullName,
        phone: phone,
        status: "pending"
      });

    if (insertError) throw insertError;

    form.reset();
    hideOverlay(joinOverlay);

    showMessage(
      "accountMessage",
      "تم إرسال طلبك بنجاح. طلبك الآن قيد المراجعة من إدارة وَصْل."
    );

    await displayAccount();

  } catch (error) {
    showMessage(
      "joinMessage",
      error.message || "تعذر إرسال الطلب.",
      true
    );
  } finally {
    setLoading(form, false);
  }
}

async function logout() {
  clearMessage("accountMessage");

  try {
    const { error } = await db.auth.signOut();
    if (error) throw error;

    currentUser = null;
    displayPanel("loginPanel");

    showMessage("accountMessage", "تم تسجيل الخروج بنجاح.");

  } catch (error) {
    showMessage(
      "accountMessage",
      error.message || "تعذر تسجيل الخروج.",
      true
    );
  }
}

// البحث
function filterShops() {
  const search = $("searchInput")?.value.trim().toLowerCase() || "";
  const activeButton = document.querySelector(".category.active");
  const category = activeButton?.dataset.category || "الكل";

  let visible = 0;

  document.querySelectorAll(".shop-card").forEach(card => {
    const matchesCategory =
      category === "الكل" || card.dataset.category === category;

    const matchesSearch =
      !search ||
      (card.dataset.name || "").toLowerCase().includes(search) ||
      card.textContent.toLowerCase().includes(search);

    const show = matchesCategory && matchesSearch;

    card.classList.toggle("hidden", !show);
    if (show) visible++;
  });

  $("emptyState")?.classList.toggle("hidden", visible > 0);
}

function initializeCategories() {
  document.querySelectorAll(".category").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".category").forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");
      filterShops();
    });
  });

  $("searchInput")?.addEventListener("input", filterShops);
}

// تشغيل الموقع
async function initializeWASL() {
  try {
    const { createClient } = window.supabase;

    db = createClient(SUPABASE_URL, SUPABASE_KEY);

    prepareForms();
    initializeCategories();

    $("accountBtn")?.addEventListener("click", event => {
      event.preventDefault();
      openAccount();
    });

    $("closeAccount")?.addEventListener("click", () => {
      hideOverlay(accountOverlay);
    });

    $("closeJoin")?.addEventListener("click", () => {
      hideOverlay(joinOverlay);
    });

    $("cancelJoin")?.addEventListener("click", () => {
      hideOverlay(joinOverlay);
    });

    $("showSignup")?.addEventListener("click", () => {
      clearMessage("accountMessage");
      displayPanel("signupPanel");
    });

    $("showLogin")?.addEventListener("click", () => {
      clearMessage("accountMessage");
      displayPanel("loginPanel");
    });

    $("loginForm")?.addEventListener("submit", signIn);
    $("signupForm")?.addEventListener("submit", signUp);
    $("joinForm")?.addEventListener("submit", submitJoin);

    $("storeAction")?.addEventListener("click", async () => {
      try {
        await startJoin("store_owner");
      } catch (error) {
        showMessage("accountMessage", error.message, true);
      }
    });

    $("riderAction")?.addEventListener("click", async () => {
      try {
        await startJoin("rider");
      } catch (error) {
        showMessage("accountMessage", error.message, true);
      }
    });

    $("customerAction")?.addEventListener("click", () => {
      hideOverlay(accountOverlay);
    });

    $("riderBtn")?.addEventListener("click", async event => {
      event.preventDefault();

      try {
        openAccount();
        await startJoin("rider");
      } catch (error) {
        showMessage("accountMessage", error.message, true);
      }
    });

    $("logoutBtn")?.addEventListener("click", logout);

    $("favoritesBtn")?.addEventListener("click", event => {
      event.preventDefault();
      showMessage(
        "accountMessage",
        "قائمة المفضلة سيتم تفعيلها في مرحلة قادمة."
      );
      openAccount();
    });

    $("locationBtn")?.addEventListener("click", () => {
      showMessage(
        "accountMessage",
        "اختيار المناطق والعناوين التفصيلية سيتم تفعيله قريبًا."
      );
      openAccount();
    });

    accountOverlay?.addEventListener("click", event => {
      if (event.target === accountOverlay) {
        hideOverlay(accountOverlay);
      }
    });

    joinOverlay?.addEventListener("click", event => {
      if (event.target === joinOverlay) {
        hideOverlay(joinOverlay);
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        hideOverlay(joinOverlay);
        hideOverlay(accountOverlay);
      }
    });

    console.log("WASL initialized successfully.");

  } catch (error) {
    console.error("WASL initialization error:", error);
    alert("حصل خطأ في تشغيل الموقع. حاول تحديث الصفحة.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeWASL);
} else {
  initializeWASL();
}
