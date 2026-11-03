const SUPABASE_URL = "https://rpvzcotaktgcokpvyywo.supabase.co";
const SUPABASE_KEY = "sb_publishable_GcErdM5K3YHHYdwfyb7rjg_Ys9wLhYB";

const categoryButtons = document.querySelectorAll(".category");
const cards = document.querySelectorAll(".shop-card");
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");

let activeCategory = "الكل";

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

document.getElementById("locationBtn")?.addEventListener("click", () => {
  alert("هنضيف اختيار المنطقة والعنوان بالتفصيل قريبًا.");
});

// تحميل Supabase
const authScript = document.createElement("script");
authScript.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

authScript.onload = () => {
  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const accountLink = document.querySelector(".bottom-nav a:last-child");

  if (!accountLink) return;

  accountLink.href = "#account";

  accountLink.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      const { data: { user }, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;

      if (user) {
        const logout = confirm(
          "أنت مسجل دخول بالفعل. هل تريد تسجيل الخروج؟"
        );

        if (logout) {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;

          alert("تم تسجيل الخروج بنجاح");
        }

        return;
      }

      const email = prompt("اكتب بريدك الإلكتروني:");
      if (!email) return;

      const password = prompt("اكتب كلمة المرور:");
      if (!password) return;

      const createAccount = confirm(
        "اضغط موافق لإنشاء حساب جديد\nاضغط إلغاء لتسجيل الدخول"
      );

      let result;

      if (createAccount) {
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              window.location.origin + window.location.pathname
          }
        });
      } else {
        result = await supabase.auth.signInWithPassword({
          email,
          password
        });
      }

      if (result.error) throw result.error;

      if (createAccount) {
        alert("تم إنشاء الحساب. افتح بريدك واضغط رابط التأكيد.");
      } else {
        alert("تم تسجيل الدخول بنجاح.");
      }

    } catch (error) {
      alert("حصل خطأ: " + error.message);
    }
  });
};

authScript.onerror = () => {
  alert("تعذر تحميل خدمة تسجيل الدخول. تحقق من الإنترنت.");
};

document.head.appendChild(authScript);
