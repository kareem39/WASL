
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
let supabaseReady = null;

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
  alert("هنضيف اختيار المنطقة والعنوان بالتفصيل قريبًا.");
});

// تحميل مكتبة Supabase
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
        reject(new Error("مكتبة Supabase لم تعمل بشكل صحيح."));
      }
    };

    script.onerror = () => {
      reject(new Error("تعذر تحميل خدمة الحسابات. تحقق من الإنترنت."));
    };

    document.head.appendChild(script);
  });
}

// تشغيل Supabase مرة واحدة
supabaseReady = loadSupabase()
  .then(library => {
    supabaseClient = library.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    return supabaseClient;
  })
  .catch(error => {
    console.error(error);
    throw error;
  });

// فتح الحساب
async function openAccount() {
  try {
    const client = await supabaseReady;

    // فحص الجلسة بدون افتراض وجود تسجيل دخول
    const { data, error } = await client.auth.getSession();

    if (error) throw error;

    if (data.session) {
      const shouldLogout = confirm(
        "أنت مسجل دخول بالفعل.\nهل تريد تسجيل الخروج؟"
      );

      if (shouldLogout) {
        const { error: logoutError } = await client.auth.signOut();

        if (logoutError) throw logoutError;

        alert("تم تسجيل الخروج بنجاح.");
      }

      return;
    }

    const email = prompt("اكتب بريدك الإلكتروني:");
    if (!email) return;

    const password = prompt("اكتب كلمة المرور:");
    if (!password) return;

    if (password.length < 6) {
      alert("كلمة المرور لازم تكون 6 أحرف على الأقل.");
      return;
    }

    const createAccount = confirm(
      "هل تريد إنشاء حساب جديد؟\n\nموافق: إنشاء حساب جديد\nإلغاء: تسجيل الدخول"
    );

    let result;

    if (createAccount) {
      result = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo:
            window.location.origin + window.location.pathname
        }
      });
    } else {
      result = await client.auth.signInWithPassword({
        email: email.trim(),
        password
      });
    }

    if (result.error) throw result.error;

    if (createAccount) {
      if (result.data.session) {
        alert("تم إنشاء حسابك وتسجيل الدخول بنجاح.");
      } else {
        alert(
          "تم إنشاء الحساب بنجاح.\nافتح بريدك الإلكتروني واضغط رابط التأكيد لتفعيل الحساب."
        );
      }
    } else {
      alert("تم تسجيل الدخول بنجاح.");
    }

  } catch (error) {
    console.error("WASL Account Error:", error);
    alert("حصل خطأ: " + (error.message || "حاول مرة أخرى."));
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
