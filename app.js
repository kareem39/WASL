const SUPABASE_URL = "https://rpvzcotaktgcokpvyywo.supabase.co";
const SUPABASE_KEY = "sb_publishable_GcErdM5K3YHHYdwfyb7rjg_Ys9wLhYB";

const categoryButtons = document.querySelectorAll(".category");
const cards = document.querySelectorAll(".shop-card");
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");

const accountBtn = document.getElementById("accountBtn");
const favoritesBtn = document.getElementById("favoritesBtn");
const riderBtn = document.getElementById("riderBtn");

let activeCategory = "الكل";
let client = null;

// تنسيق نافذة الحساب
const style = document.createElement("style");
style.textContent = `
.wasl-overlay {
  position:fixed; inset:0; z-index:9999;
  background:rgba(0,0,0,.68);
  display:flex; align-items:center; justify-content:center;
  padding:20px; opacity:0; visibility:hidden;
  transition:.25s;
}
.wasl-overlay.open {opacity:1;visibility:visible}
.wasl-modal {
  background:#fff; width:100%; max-width:390px;
  border-radius:24px; padding:25px 22px;
  position:relative; transform:translateY(15px);
  transition:.25s; box-shadow:0 20px 70px #0005;
  font-family:Cairo,system-ui,sans-serif;
}
.wasl-overlay.open .wasl-modal {transform:translateY(0)}
.wasl-close {
  position:absolute; left:15px; top:13px;
  border:0; background:#f3f3f3; width:34px;
  height:34px; border-radius:50%; font-size:21px;
  cursor:pointer;
}
.wasl-logo {
  width:55px;height:55px;background:#ff6b1a;
  color:white;border-radius:17px;display:grid;
  place-items:center;font-size:30px;font-weight:900;
  margin:0 auto 12px;
}
.wasl-modal h2 {text-align:center;margin:0 0 5px;font-size:22px}
.wasl-sub {text-align:center;color:#888;font-size:12px;margin:0 0 20px}
.wasl-tabs {display:flex;background:#f4f4f4;padding:4px;border-radius:12px;margin-bottom:17px}
.wasl-tab {flex:1;border:0;padding:10px;border-radius:9px;background:transparent;font-family:inherit;font-weight:700;cursor:pointer}
.wasl-tab.active {background:#111;color:#fff}
.wasl-field {margin-bottom:13px}
.wasl-field label {display:block;font-size:12px;font-weight:700;margin-bottom:6px}
.wasl-field input {
  width:100%;height:47px;border:1px solid #e5e5e5;
  border-radius:11px;padding:0 13px;outline:none;
  font:14px inherit;direction:ltr;text-align:left;
}
.wasl-field input:focus {border-color:#ff6b1a}
.wasl-main-btn {
  width:100%;border:0;background:#ff6b1a;color:#fff;
  padding:13px;border-radius:12px;font:700 14px inherit;
  cursor:pointer;margin-top:5px;
}
.wasl-main-btn:disabled {opacity:.6;cursor:wait}
.wasl-message {
  display:none;padding:11px;border-radius:10px;
  font-size:12px;text-align:center;margin:12px 0;
}
.wasl-message.show {display:block}
.wasl-message.error {background:#fff0f0;color:#c62828}
.wasl-message.success {background:#eaf8f0;color:#187747}
.wasl-user {
  background:#f7f7f7;padding:15px;border-radius:13px;
  text-align:center;margin:18px 0;font-size:13px;
  overflow-wrap:anywhere;
}
.wasl-logout {
  width:100%;border:1px solid #e5e5e5;background:#fff;
  color:#c62828;padding:12px;border-radius:12px;
  font:700 14px inherit;cursor:pointer;
}
.wasl-toast {
  position:fixed;z-index:10001;bottom:88px;
  right:50%;transform:translate(50%,20px);
  background:#171717;color:white;padding:13px 19px;
  border-radius:13px;font:13px Cairo,system-ui,sans-serif;
  box-shadow:0 8px 25px #0003;opacity:0;
  transition:.25s;pointer-events:none;max-width:90%;
  text-align:center;
}
.wasl-toast.show {opacity:1;transform:translate(50%,0)}
.wasl-toast.success {border-right:4px solid #21a36b}
.wasl-toast.error {border-right:4px solid #e44}
`;
document.head.appendChild(style);

// إنشاء النافذة
const overlay = document.createElement("div");
overlay.className = "wasl-overlay";
overlay.innerHTML = `
  <div class="wasl-modal" role="dialog" aria-modal="true">
    <button class="wasl-close" type="button" aria-label="إغلاق">×</button>
    <div class="wasl-logo">و</div>
    <h2>أهلاً بيك في وَصْل</h2>
    <p class="wasl-sub">حسابك معانا يخلي طلباتك أسهل</p>

    <div id="waslAuthArea">
      <div class="wasl-tabs">
        <button class="wasl-tab active" data-mode="login">تسجيل الدخول</button>
        <button class="wasl-tab" data-mode="signup">حساب جديد</button>
      </div>

      <form id="waslAuthForm">
        <div class="wasl-field">
          <label>البريد الإلكتروني</label>
          <input id="waslEmail" type="email" placeholder="name@example.com" required autocomplete="email">
        </div>
        <div class="wasl-field">
          <label>كلمة المرور</label>
          <input id="waslPassword" type="password" placeholder="6 أحرف على الأقل" required minlength="6" autocomplete="current-password">
        </div>
        <div id="waslMessage" class="wasl-message"></div>
        <button class="wasl-main-btn" id="waslSubmit" type="submit">تسجيل الدخول</button>
      </form>
    </div>

    <div id="waslAccountArea" hidden>
      <div class="wasl-user">
        <div style="font-size:30px;margin-bottom:8px">✓</div>
        <b>أنت مسجل دخول بالفعل</b>
        <p id="waslUserEmail" style="color:#777;margin:7px 0 0"></p>
      </div>
      <div id="waslAccountMessage" class="wasl-message"></div>
      <button class="wasl-logout" id="waslLogout" type="button">تسجيل الخروج</button>
    </div>
  </div>
`;
document.body.appendChild(overlay);

const toast = document.createElement("div");
toast.className = "wasl-toast";
document.body.appendChild(toast);

let authMode = "login";
let toastTimer;

// رسائل احترافية
function showToast(message, type = "success") {
  toast.textContent = message;
  toast.className = "wasl-toast " + type + " show";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = "wasl-message show " + type;
}

function closeAccount() {
  overlay.classList.remove("open");
}

overlay.querySelector(".wasl-close").addEventListener("click", closeAccount);

overlay.addEventListener("click", event => {
  if (event.target === overlay) closeAccount();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeAccount();
});

// تحميل Supabase
function loadSupabase() {
  return new Promise((resolve, reject) => {
    if (window.supabase?.createClient) {
      resolve(window.supabase);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    script.onload = () => {
      if (window.supabase?.createClient) {
        resolve(window.supabase);
      } else {
        reject(new Error("تعذر تشغيل خدمة الحسابات."));
      }
    };

    script.onerror = () => {
      reject(new Error("تحقق من اتصال الإنترنت وحاول مرة أخرى."));
    };

    document.head.appendChild(script);
  });
}

const clientReady = loadSupabase().then(library => {
  client = library.createClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
});

// البحث والتصنيفات
function filterShops() {
  const term = (searchInput?.value || "").trim().toLowerCase();
  let visible = 0;

  cards.forEach(card => {
    const matchesCategory =
      activeCategory === "الكل" ||
      card.dataset.category === activeCategory;

    const matchesSearch =
      !term ||
      (card.dataset.name || "").toLowerCase().includes(term) ||
      card.textContent.toLowerCase().includes(term);

    const show = matchesCategory && matchesSearch;
    card.classList.toggle("hidden", !show);

    if (show) visible++;
  });

  emptyState?.classList.toggle("hidden", visible > 0);
}

categoryButtons.forEach(button => {
  button.addEventListener("click", () => {
    categoryButtons.forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    activeCategory = button.dataset.category;
    filterShops();
  });
});

searchInput?.addEventListener("input", filterShops);

// اختيار الموقع
document.getElementById("locationBtn")?.addEventListener("click", () => {
  showToast("هنضيف اختيار المنطقة والعنوان قريبًا.");
});

// تغيير وضع الدخول أو إنشاء حساب
function setAuthMode(mode) {
  authMode = mode;

  overlay.querySelectorAll(".wasl-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
  });

  document.getElementById("waslSubmit").textContent =
    mode === "signup" ? "إنشاء حساب جديد" : "تسجيل الدخول";

  document.getElementById("waslPassword").autocomplete =
    mode === "signup" ? "new-password" : "current-password";

  document.getElementById("waslMessage").className = "wasl-message";
}

overlay.querySelectorAll(".wasl-tab").forEach(tab => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.mode));
});

// فتح الحساب
async function openAccount() {
  overlay.classList.add("open");

  const authArea = document.getElementById("waslAuthArea");
  const accountArea = document.getElementById("waslAccountArea");

  authArea.hidden = false;
  accountArea.hidden = true;

  try {
    const supabase = await clientReady;
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (data.session?.user) {
      document.getElementById("waslUserEmail").textContent =
        data.session.user.email || "حسابك في وَصْل";

      authArea.hidden = true;
      accountArea.hidden = false;
    }
  } catch (error) {
    console.error("WASL Account:", error);
    showToast(error.message || "حصل خطأ، حاول مرة أخرى.", "error");
  }
}

// تسجيل الدخول أو إنشاء حساب
document.getElementById("waslAuthForm").addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("waslEmail").value.trim();
  const password = document.getElementById("waslPassword").value;
  const message = document.getElementById("waslMessage");
  const submit = document.getElementById("waslSubmit");

  if (password.length < 6) {
    showMessage(message, "كلمة المرور لازم تكون 6 أحرف على الأقل.", "error");
    return;
  }

  submit.disabled = true;
  submit.textContent = "جاري التنفيذ...";

  try {
    const supabase = await clientReady;
    let result;

    if (authMode === "signup") {
      result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      });
    } else {
      result = await supabase.auth.signInWithPassword({
        email,
        password
      });
    }

    if (result.error) throw result.error;

    if (authMode === "signup" && !result.data.session) {
      showMessage(
        message,
        "تم إنشاء حسابك! افتح بريدك الإلكتروني واضغط رابط تأكيد الحساب، وبعدها ارجع وسجل دخول.",
        "success"
      );
      return;
    }

    if (result.data.session) {
      closeAccount();
      showToast(
        authMode === "signup"
          ? "أهلاً بيك في وَصْل! تم إنشاء حسابك بنجاح."
          : "تم تسجيل الدخول بنجاح. أهلاً بيك!",
        "success"
      );
      setTimeout(openAccount, 700);
    }

  } catch (error) {
    console.error("WASL Auth Error:", error);

    let messageText = error.message || "حصل خطأ، حاول مرة أخرى.";

    if (messageText.toLowerCase().includes("invalid login credentials")) {
      messageText = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    } else if (messageText.toLowerCase().includes("user already registered")) {
      messageText = "البريد الإلكتروني مسجل بالفعل. اختار تسجيل الدخول.";
    } else if (messageText.toLowerCase().includes("email not confirmed")) {
      messageText = "لازم تأكد بريدك الإلكتروني الأول.";
    }

    showMessage(message, messageText, "error");

  } finally {
    submit.disabled = false;
    submit.textContent =
      authMode === "signup" ? "إنشاء حساب جديد" : "تسجيل الدخول";
  }
});

// تسجيل الخروج مع تأكيد داخل النافذة
document.getElementById("waslLogout").addEventListener("click", async () => {
  const button = document.getElementById("waslLogout");
  const message = document.getElementById("waslAccountMessage");

  if (!confirm("هل أنت متأكد إنك عايز تسجل خروج من حسابك؟")) {
    return;
  }

  button.disabled = true;
  button.textContent = "جاري تسجيل الخروج...";

  try {
    const supabase = await clientReady;
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    closeAccount();
    showToast("تم تسجيل الخروج بنجاح.", "success");

  } catch (error) {
    showMessage(
      message,
      error.message || "تعذر تسجيل الخروج. حاول مرة أخرى.",
      "error"
    );
  } finally {
    button.disabled = false;
    button.textContent = "تسجيل الخروج";
  }
});

// أزرار الحساب
accountBtn?.addEventListener("click", event => {
  event.preventDefault();
  openAccount();
});

riderBtn?.addEventListener("click", event => {
  event.preventDefault();
  openAccount();
});

favoritesBtn?.addEventListener("click", event => {
  event.preventDefault();
  showToast("قائمة المفضلة هتكون متاحة قريبًا.");
});
