
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
let supabaseClient = null;

function showMessage(message) {
  alert(message);
}

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
      reject(new Error("تحقق من اتصال الإنترنت."));
    };

    document.head.appendChild(script);
  });
}

const supabaseReady = loadSupabase().then(library => {
  supabaseClient = library.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  return supabaseClient;
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
  showMessage("إضافة اختيار المناطق والعناوين التفصيلية قريبًا.");
});

// تسجيل الدخول أو إنشاء حساب
async function authenticateUser() {
  const client = await supabaseReady;

  const { data, error } = await client.auth.getSession();
  if (error) throw error;

  if (data.session) {
    return data.session.user;
  }

  const email = prompt("اكتب بريدك الإلكتروني:");
  if (!email) return null;

  const password = prompt("اكتب كلمة المرور:");
  if (!password) return null;

  if (password.length < 6) {
    showMessage("كلمة المرور لازم تكون 6 أحرف على الأقل.");
    return null;
  }

  const createAccount = confirm(
    "هل تريد إنشاء حساب جديد؟\n\nموافق: إنشاء حساب\nإلغاء: تسجيل الدخول"
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

  if (createAccount && !result.data.session) {
    showMessage(
      "تم إنشاء الحساب. افتح بريدك الإلكتروني واضغط رابط التأكيد، ثم سجل الدخول."
    );
    return null;
  }

  showMessage(
    createAccount
      ? "تم إنشاء الحساب وتسجيل الدخول بنجاح."
      : "تم تسجيل الدخول بنجاح."
  );

  return result.data.user;
}

// حفظ بيانات الحساب
async function saveProfile(user, fullName, phone) {
  const client = await supabaseReady;

  const { error } = await client
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone
    })
    .eq("user_id", user.id);

  if (error) throw error;
}

// تقديم طلب تاجر أو مندوب
async function submitJoinRequest(user, role) {
  const fullName = prompt("اكتب اسمك بالكامل:");
  if (!fullName?.trim()) return;

  const phone = prompt("اكتب رقم هاتفك:");
  if (!phone?.trim()) return;

  const client = await supabaseReady;

  // حفظ الاسم ورقم الهاتف في الملف الشخصي
  await saveProfile(user, fullName.trim(), phone.trim());

  // إرسال طلب الانضمام
  const { error } = await client
    .from("join_requests")
    .insert({
      user_id: user.id,
      requested_role: role,
      full_name: fullName.trim(),
      phone: phone.trim()
    });

  if (error) throw error;

  showMessage(
    "تم إرسال طلبك بنجاح.\n\nطلبك الآن قيد المراجعة، وسيتم تفعيل حسابك بعد موافقة الإدارة."
  );
}

// عرض حالة الحساب وطلبات الانضمام
async function openAccount() {
  try {
    const user = await authenticateUser();
    if (!user) return;

    const client = await supabaseReady;

    const { data: requests, error } = await client
      .from("join_requests")
      .select("requested_role,status,created_at")
      .eq("user_id", user.id);

    if (error) throw error;

    let message = "أهلاً بك في وَصْل ❤️\n\n";

    if (requests?.length) {
      message += "طلبات الانضمام:\n";

      requests.forEach(request => {
        const roleName =
          request.requested_role === "store_owner"
            ? "تاجر"
            : "مندوب";

        const statusName =
          request.status === "pending"
            ? "قيد المراجعة"
            : request.status === "approved"
              ? "تمت الموافقة"
              : "مرفوض";

        message += `\n${roleName}: ${statusName}`;
      });

      message += "\n\n";
    }

    message +=
      "اكتب رقم الاختيار:\n" +
      "1 - حساب عميل\n" +
      "2 - تقديم طلب تاجر\n" +
      "3 - تقديم طلب مندوب\n" +
      "4 - تسجيل الخروج";

    const choice = prompt(message);

    if (choice === "1") {
      showMessage("أنت تستخدم حساب عميل في وَصْل.");
    } else if (choice === "2") {
      await submitJoinRequest(user, "store_owner");
    } else if (choice === "3") {
      await submitJoinRequest(user, "rider");
    } else if (choice === "4") {
      const confirmLogout = confirm("هل تريد تسجيل الخروج؟");

      if (confirmLogout) {
        const { error: logoutError } = await client.auth.signOut();
        if (logoutError) throw logoutError;

        showMessage("تم تسجيل الخروج بنجاح.");
      }
    }

  } catch (error) {
    console.error("WASL Account Error:", error);
    showMessage("حصل خطأ: " + (error.message || "حاول مرة أخرى."));
  }
}

// زر حسابي
accountBtn?.addEventListener("click", async event => {
  event.preventDefault();
  await openAccount();
});

// زر تسجيل المندوب
riderBtn?.addEventListener("click", async event => {
  event.preventDefault();

  try {
    const user = await authenticateUser();
    if (!user) return;

    await submitJoinRequest(user, "rider");
  } catch (error) {
    console.error(error);
    showMessage("حصل خطأ: " + (error.message || "حاول مرة أخرى."));
  }
});

// زر المفضلة
favoritesBtn?.addEventListener("click", event => {
  event.preventDefault();
  showMessage("قائمة المفضلة هتكون متاحة قريبًا.");
});
