
const SUPABASE_URL = "https://rpvzcotaktgcokpvyywo.supabase.co";
const SUPABASE_KEY = "sb_publishable_GcErdM5K3YHHYdwfyb7rjg_Ys9wLhYB";

// عناصر الصفحة
const categoryButtons = document.querySelectorAll(".category");
const cards = document.querySelectorAll(".shop-card");
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");

const accountBtn = document.getElementById("accountBtn");
const favoritesBtn = document.getElementById("favoritesBtn");
const riderBtn = document.getElementById("riderBtn");

let activeCategory = "الكل";
let supabaseClient = null;

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

// زر الموقع
document.getElementById("locationBtn")?.addEventListener("click", () => {
  alert("هنضيف اختيار المنطقة والعنوان بالتفصيل قريبًا.");
});

// تحميل Supabase
function loadSupabase() {
  return new Promise((resolve, reject) => {
    if (window.supabase) {
      resolve(window.supabase);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    script.onload = () => {
      if (window.supabase) {
        resolve(window.supabase);
      } else {
        reject(new Error("تعذر تشغيل خدمة الحسابات."));
      }
    };

    script.onerror = () => {
      reject(new Error("تعذر تحميل خدمة الحسابات. تحقق من الإنترنت."));
    };

    document.head.appendChild(script);
  });
}

// تهيئة Supabase
async function initializeSupabase() {
  try {
    const library = await loadSupabase();

    supabaseClient = library.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

  } catch (error) {
    console.error(error);
  }
}

// تسجيل الدخول وإنشاء حساب
async function openAccount() {
  if (!supabaseClient) {
    alert("خدمة الحسابات لسه بتحمل. حاول مرة تانية.");
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error) throw error;

    if (data.user) {
      const shouldLogout = confirm(
        "أنت مسجل دخول بالفعل.\nهل تريد تسجيل الخروج؟"
      );

      if (shouldLogout) {
        const { error: logoutError } =
          await supabaseClient.auth.signOut();

        if (logoutError) throw logoutError;

        alert("تم تسجيل الخروج بنجاح.");
      }

      return;
    }

    const email = prompt("اكتب بريدك الإلكتروني:");
    if (!email) return;

    const password = prompt("اكتب كلمة المرور:");
    if (!password) return;

    const createAccount = confirm(
      "إنشاء حساب جديد؟\nموافق: إنشاء حساب\nإلغاء: تسجيل الدخول"
    );

    let result;

    if (createAccount) {
      result = await supabaseClient.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin +
            window.location.pathname
        }
      });
    } else {
      result = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password
      });
    }

    if (result.error) throw result.error;

    if (createAccount) {
      alert(
        "تم إرسال رابط تأكيد إلى بريدك الإلكتروني.\nافتح الرسالة واضغط على رابط التأكيد."
      );
    } else {
      alert("تم تسجيل الدخول بنجاح.");
    }

  } catch (error) {
    alert("حصل خطأ: " + error.message);
  }
}

// زر حسابي
accountBtn?.addEventListener("click", async event => {
  event.preventDefault();
  await openAccount();
});

// زر المفضلة
favoritesBtn?.addEventListener("click", event => {
  event.preventDefault();
  alert("قائمة المفضلة هتكون متاحة قريبًا.");
});

// زر تسجيل المندوب
riderBtn?.addEventListener("click", async event => {
  event.preventDefault();
  await openAccount();
});

// تشغيل الخدمة
initializeSupabase();
