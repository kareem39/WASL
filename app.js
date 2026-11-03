
const SUPABASE_URL = "https://rpvzcotaktgcokpvyywo.supabase.co";
const SUPABASE_KEY = "sb_publishable_GcErdM5K3YHHYdwfyb7rjg_Ys9wLhYB";

let db = null;
let currentUser = null;
let requestedRole = "rider";
let isAdmin = false;
let currentRole = "customer";

const $ = id => document.getElementById(id);

let adminFilter = "all";
let adminSection = "requests";
let adminRequestsCache = [];
let adminStoresCache = [];

let merchantStoresCache = [];
let merchantProductsCache = [];
let activeMerchantStoreId = null;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showOverlay(overlay) {
  overlay?.classList.add("show");
  document.body.classList.add("wasl-locked");
}

function hideOverlay(overlay) {
  overlay?.classList.remove("show");

  if (
    !$("accountOverlay")?.classList.contains("show") &&
    !$("joinOverlay")?.classList.contains("show")
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
  showOverlay($("accountOverlay"));
  displayAccount();
}

function displayPanel(name) {
  ["loginPanel", "signupPanel", "profilePanel"].forEach(id => {
    $(id)?.classList.toggle("wasl-hidden", id !== name);
  });
}

// ===============================
// تنسيق اللوحات
// ===============================

function addDashboardStyles() {
  if ($("waslDashboardStyle")) return;

  const style = document.createElement("style");
  style.id = "waslDashboardStyle";

  style.textContent = `
    .wasl-dashboard {
      margin-top:20px;
      padding:16px;
      background:#171717;
      border:1px solid #f58220;
      border-radius:14px;
      color:white;
      direction:rtl;
    }

    .wasl-dashboard h3,
    .wasl-dashboard h4 {
      color:#f58220;
    }

    .wasl-dashboard input,
    .wasl-dashboard select,
    .wasl-dashboard textarea {
      width:100%;
      box-sizing:border-box;
      padding:11px;
      margin:6px 0 12px;
      border:1px solid #555;
      border-radius:8px;
      background:#242424;
      color:white;
      font-size:14px;
    }

    .wasl-dashboard textarea {
      min-height:75px;
      resize:vertical;
    }

    .wasl-dashboard label {
      display:block;
      margin-top:8px;
      color:#ddd;
      font-size:14px;
    }

    .wasl-dashboard button {
      border:0;
      border-radius:8px;
      padding:10px 13px;
      cursor:pointer;
      font-weight:bold;
    }

    .wasl-primary {
      background:#f58220;
      color:#111;
    }

    .wasl-secondary {
      background:#333;
      color:white;
      border:1px solid #666 !important;
    }

    .wasl-approve {
      background:#16834b;
      color:white;
    }

    .wasl-reject,
    .wasl-delete {
      background:#b83232;
      color:white;
    }

    .wasl-admin-card,
    .wasl-store-card,
    .wasl-product-card {
      background:#242424;
      border:1px solid #444;
      border-radius:10px;
      padding:13px;
      margin:12px 0;
      overflow-wrap:anywhere;
    }

    .wasl-admin-card p,
    .wasl-store-card p,
    .wasl-product-card p {
      margin:7px 0;
      font-size:14px;
      color:#ddd;
    }

    .wasl-actions {
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-top:12px;
    }

    .wasl-actions button {
      flex:1;
      min-width:90px;
    }

    .wasl-filter {
      background:#292929;
      color:white;
      border:1px solid #f58220 !important;
    }

    .wasl-filter.active {
      background:#f58220;
      color:#111;
    }

    .wasl-product-image {
      width:75px;
      height:75px;
      object-fit:cover;
      border-radius:8px;
      display:block;
      margin-bottom:8px;
    }

    .wasl-check-row {
      display:flex !important;
      align-items:center;
      gap:8px;
      margin:10px 0;
    }

    .wasl-check-row input {
      width:auto !important;
      margin:0 !important;
    }

    .wasl-muted {
      color:#aaa;
      font-size:13px;
    }

    .wasl-status {
      color:#f58220;
      font-weight:bold;
    }
  `;

  document.head.appendChild(style);
}

// ===============================
// لوحة الإدارة
// ===============================

function prepareAdminDashboard() {
  if ($("adminDashboard")) return;

  const profilePanel = $("profilePanel");
  if (!profilePanel) return;

  const dashboard = document.createElement("div");
  dashboard.id = "adminDashboard";
  dashboard.className = "wasl-dashboard wasl-hidden";

  dashboard.innerHTML = `
    <h3 style="margin:0 0 15px">لوحة إدارة وَصْل</h3>

    <div class="wasl-actions">
      <button type="button" id="adminRequestsTab" class="wasl-filter active">
        طلبات الانضمام
      </button>
      <button type="button" id="adminStoresTab" class="wasl-filter">
        إدارة المتاجر
      </button>
    </div>

    <div id="adminRequestsSection">
      <div class="wasl-actions">
        <button type="button" id="adminAll" class="wasl-filter active">الكل</button>
        <button type="button" id="adminStoreOwners" class="wasl-filter">التجار</button>
        <button type="button" id="adminRiders" class="wasl-filter">المندوبون</button>
      </div>

      <div id="adminRequestCount" class="wasl-muted">جاري التحميل...</div>
      <div id="adminRequests"></div>
    </div>

    <div id="adminStoresSection" class="wasl-hidden">
      <div id="adminStoreCount" class="wasl-muted">جاري تحميل المتاجر...</div>
      <div id="adminStoresList"></div>
    </div>
  `;

  profilePanel.appendChild(dashboard);

  $("adminRequestsTab").addEventListener("click", () => {
    setAdminSection("requests");
  });

  $("adminStoresTab").addEventListener("click", () => {
    setAdminSection("stores");
  });

  $("adminAll").addEventListener("click", () => setAdminFilter("all"));
  $("adminStoreOwners").addEventListener("click", () => setAdminFilter("store_owner"));
  $("adminRiders").addEventListener("click", () => setAdminFilter("rider"));

  $("adminStoresList").addEventListener("click", event => {
    const button = event.target.closest("[data-store-action]");
    if (!button) return;

    const storeId = button.dataset.id;
    const status = button.dataset.storeAction;

    updateStoreStatus(storeId, status, button);
  });
}

function setAdminSection(section) {
  adminSection = section;

  $("adminRequestsSection")?.classList.toggle("wasl-hidden", section !== "requests");
  $("adminStoresSection")?.classList.toggle("wasl-hidden", section !== "stores");

  $("adminRequestsTab")?.classList.toggle("active", section === "requests");
  $("adminStoresTab")?.classList.toggle("active", section === "stores");

  if (section === "stores") loadAdminStores();
  if (section === "requests") renderAdminRequests();
}

function setAdminFilter(filter) {
  adminFilter = filter;

  $("adminAll")?.classList.toggle("active", filter === "all");
  $("adminStoreOwners")?.classList.toggle("active", filter === "store_owner");
  $("adminRiders")?.classList.toggle("active", filter === "rider");

  renderAdminRequests();
}

function renderAdminRequests() {
  const container = $("adminRequests");
  if (!container) return;

  container.innerHTML = "";

  const requests = adminRequestsCache.filter(request =>
    adminFilter === "all" || request.requested_role === adminFilter
  );

  $("adminRequestCount").textContent = `عدد الطلبات: ${requests.length}`;

  if (!requests.length) {
    container.textContent = "لا توجد طلبات في هذا القسم.";
    return;
  }

  requests.forEach(request => {
    const roleName = request.requested_role === "store_owner" ? "تاجر" : "مندوب";

    const statusNames = {
      pending: "قيد المراجعة",
      approved: "تمت الموافقة",
      rejected: "مرفوض"
    };

    const card = document.createElement("div");
    card.className = "wasl-admin-card";

    card.innerHTML = `
      <h4>طلب ${roleName}</h4>
      <p>الاسم: ${escapeHTML(request.full_name)}</p>
      <p>الهاتف: ${escapeHTML(request.phone)}</p>
      <p>الحالة: ${statusNames[request.status] || escapeHTML(request.status)}</p>
      <p>تاريخ الطلب: ${
        request.created_at
          ? escapeHTML(new Date(request.created_at).toLocaleString("ar-EG"))
          : "غير محدد"
      }</p>
      ${
        request.status === "pending"
          ? `<div class="wasl-actions">
              <button type="button" class="wasl-approve" data-request-action="approved">موافقة</button>
              <button type="button" class="wasl-reject" data-request-action="rejected">رفض</button>
            </div>`
          : ""
      }
    `;

    const buttons = card.querySelectorAll("[data-request-action]");

    buttons.forEach(button => {
      button.addEventListener("click", () => {
        const status = button.dataset.requestAction;
        const allButtons = card.querySelectorAll("button");
        allButtons.forEach(item => item.disabled = true);

        updateRequestStatus(request.id, status, allButtons);
      });
    });

    container.appendChild(card);
  });
}

async function loadAdminRequests() {
  if (!isAdmin || !currentUser) return;

  const container = $("adminRequests");
  if (container) container.textContent = "جاري تحميل الطلبات...";

  try {
    const { data, error } = await db
      .from("join_requests")
      .select("id,user_id,requested_role,full_name,phone,status,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    adminRequestsCache = data || [];
    renderAdminRequests();

  } catch (error) {
    console.error(error);
    if (container) container.textContent = "تعذر تحميل الطلبات: " + error.message;
  }
}

async function updateRequestStatus(id, status, buttons) {
  if (!isAdmin) return;

  try {
    const { error } = await db
      .from("join_requests")
      .update({ status })
      .eq("id", id)
      .eq("status", "pending");

    if (error) throw error;

    await loadAdminRequests();

    showMessage(
      "accountMessage",
      status === "approved" ? "تمت الموافقة على الطلب." : "تم رفض الطلب."
    );

  } catch (error) {
    console.error(error);
    showMessage("accountMessage", "تعذر تحديث الطلب: " + error.message, true);
    buttons?.forEach(button => button.disabled = false);
  }
}

// تحميل المتاجر للمدير
async function loadAdminStores() {
  if (!isAdmin) return;

  const container = $("adminStoresList");
  if (!container) return;

  container.textContent = "جاري تحميل المتاجر...";

  try {
    const { data, error } = await db
      .from("stores")
      .select("id,owner_id,name,description,phone,address,status,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    adminStoresCache = data || [];
    renderAdminStores();

  } catch (error) {
    console.error(error);
    container.textContent = "تعذر تحميل المتاجر: " + error.message;
  }
}

function renderAdminStores() {
  const container = $("adminStoresList");
  if (!container) return;

  container.innerHTML = "";

  $("adminStoreCount").textContent = `عدد المتاجر: ${adminStoresCache.length}`;

  if (!adminStoresCache.length) {
    container.textContent = "لا توجد متاجر حتى الآن.";
    return;
  }

  const statusNames = {
    pending: "قيد المراجعة",
    approved: "معتمد",
    rejected: "مرفوض"
  };

  adminStoresCache.forEach(store => {
    const card = document.createElement("div");
    card.className = "wasl-admin-card";

    card.innerHTML = `
      <h4>${escapeHTML(store.name)}</h4>
      <p>الوصف: ${escapeHTML(store.description || "لا يوجد")}</p>
      <p>الهاتف: ${escapeHTML(store.phone || "غير محدد")}</p>
      <p>العنوان: ${escapeHTML(store.address || "غير محدد")}</p>
      <p>الحالة: <span class="wasl-status">${
        statusNames[store.status] || escapeHTML(store.status)
      }</span></p>

      ${
        store.status === "pending"
          ? `<div class="wasl-actions">
              <button type="button" class="wasl-approve"
                data-store-action="approved" data-id="${store.id}">
                الموافقة على المتجر
              </button>
              <button type="button" class="wasl-reject"
                data-store-action="rejected" data-id="${store.id}">
                رفض المتجر
              </button>
            </div>`
          : ""
      }
    `;

    container.appendChild(card);
  });
}

async function updateStoreStatus(id, status, button) {
  if (!isAdmin) return;

  button.disabled = true;

  try {
    const { error } = await db
      .from("stores")
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    await loadAdminStores();

    showMessage(
      "accountMessage",
      status === "approved"
        ? "تم اعتماد المتجر بنجاح."
        : "تم رفض المتجر."
    );

  } catch (error) {
    console.error(error);
    showMessage("accountMessage", "تعذر تحديث المتجر: " + error.message, true);
    button.disabled = false;
  }
}

// ===============================
// لوحة التاجر
// ===============================

function prepareMerchantDashboard() {
  if ($("merchantDashboard")) return;

  const profilePanel = $("profilePanel");
  if (!profilePanel) return;

  const dashboard = document.createElement("div");
  dashboard.id = "merchantDashboard";
  dashboard.className = "wasl-dashboard wasl-hidden";

  dashboard.innerHTML = `
    <h3 style="margin:0 0 15px">لوحة التاجر</h3>

    <div id="merchantStores"></div>

    <div id="merchantCreateStore">
      <h4>إضافة متجرك</h4>
      <p class="wasl-muted">أدخل بيانات متجرك وسيتم إرسالها للإدارة للمراجعة.</p>

      <form id="merchantStoreForm">
        <label>اسم المتجر</label>
        <input id="merchantStoreName" required maxlength="100"
          placeholder="اسم المتجر">

        <label>القسم</label>
        <select id="merchantStoreCategory" required>
          <option value="">جاري تحميل الأقسام...</option>
        </select>

        <label>وصف المتجر</label>
        <textarea id="merchantStoreDescription"
          placeholder="اكتب وصفًا مختصرًا للمتجر"></textarea>

        <label>رقم الهاتف</label>
        <input id="merchantStorePhone" required type="tel"
          placeholder="رقم الهاتف">

        <label>عنوان المتجر</label>
        <input id="merchantStoreAddress" required
          placeholder="المنطقة والعنوان">

        <button type="submit" class="wasl-primary">إرسال المتجر للمراجعة</button>
      </form>
    </div>

    <div id="merchantProductArea" class="wasl-hidden">
      <hr style="border-color:#444;margin:20px 0">

      <h4>إدارة المنتجات</h4>

      <label>اختر المتجر</label>
      <select id="merchantActiveStore"></select>

      <form id="merchantProductForm">
        <input type="hidden" id="merchantProductId">

        <label>اسم المنتج</label>
        <input id="merchantProductName" required maxlength="120"
          placeholder="اسم المنتج">

        <label>وصف المنتج</label>
        <textarea id="merchantProductDescription"
          placeholder="وصف المنتج"></textarea>

        <label>السعر بالجنيه</label>
        <input id="merchantProductPrice" type="number" min="0" step="0.01"
          required placeholder="السعر">

        <label>رابط صورة المنتج</label>
        <input id="merchantProductImage" type="url"
          placeholder="https://example.com/image.jpg">

        <label class="wasl-check-row">
          <input id="merchantProductAvailable" type="checkbox" checked>
          المنتج متاح للبيع
        </label>

        <div class="wasl-actions">
          <button type="submit" id="merchantProductSave"
            class="wasl-primary">إضافة المنتج</button>
          <button type="button" id="merchantProductCancel"
            class="wasl-secondary">إلغاء التعديل</button>
        </div>
      </form>

      <h4>منتجات المتجر</h4>
      <div id="merchantProducts"></div>
    </div>
  `;

  profilePanel.appendChild(dashboard);

  $("merchantStoreForm").addEventListener("submit", createMerchantStore);
  $("merchantProductForm").addEventListener("submit", saveMerchantProduct);

  $("merchantActiveStore").addEventListener("change", async event => {
    activeMerchantStoreId = event.target.value;
    await loadMerchantProducts();
  });

  $("merchantProductCancel").addEventListener("click", resetProductForm);

  $("merchantProducts").addEventListener("click", handleProductAction);
}

async function loadMerchantDashboard() {
  if (!currentUser || currentRole !== "store_owner") return;

  prepareMerchantDashboard();

  const dashboard = $("merchantDashboard");
  dashboard?.classList.remove("wasl-hidden");

  $("merchantStores").textContent = "جاري تحميل متاجرك...";

  try {
    const { data, error } = await db
      .from("stores")
      .select("id,name,description,phone,address,status,category_id")
      .eq("owner_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    merchantStoresCache = data || [];
    renderMerchantStores();

    await loadMerchantCategories();

  } catch (error) {
    console.error(error);
    $("merchantStores").textContent =
      "تعذر تحميل متاجرك: " + error.message;
  }
}

function renderMerchantStores() {
  const container = $("merchantStores");
  if (!container) return;

  container.innerHTML = "";

  const statusNames = {
    pending: "قيد مراجعة الإدارة",
    approved: "تم اعتماد المتجر",
    rejected: "تم رفض المتجر"
  };

  merchantStoresCache.forEach(store => {
    const card = document.createElement("div");
    card.className = "wasl-store-card";

    card.innerHTML = `
      <h4>${escapeHTML(store.name)}</h4>
      <p>العنوان: ${escapeHTML(store.address || "غير محدد")}</p>
      <p>الهاتف: ${escapeHTML(store.phone || "غير محدد")}</p>
      <p>حالة المتجر: <span class="wasl-status">${
        statusNames[store.status] || escapeHTML(store.status)
      }</span></p>
    `;

    container.appendChild(card);
  });

  const hasPendingOrApproved = merchantStoresCache.some(store =>
    store.status === "pending" || store.status === "approved"
  );

  $("merchantCreateStore").classList.toggle("wasl-hidden", hasPendingOrApproved);

  const approvedStores = merchantStoresCache.filter(store =>
    store.status === "approved"
  );

  const productArea = $("merchantProductArea");
  productArea.classList.toggle("wasl-hidden", approvedStores.length === 0);

  if (approvedStores.length) {
    const select = $("merchantActiveStore");
    select.innerHTML = approvedStores.map(store => `
      <option value="${store.id}">${escapeHTML(store.name)}</option>
    `).join("");

    if (!approvedStores.some(store => store.id === activeMerchantStoreId)) {
      activeMerchantStoreId = approvedStores[0].id;
    }

    select.value = activeMerchantStoreId;
    loadMerchantProducts();
  }
}

async function loadMerchantCategories() {
  const select = $("merchantStoreCategory");
  if (!select) return;

  try {
    const { data, error } = await db
      .from("categories")
      .select("id,name")
      .order("name");

    if (error) throw error;

    if (!data?.length) {
      select.innerHTML = '<option value="">لا توجد أقسام متاحة</option>';
      return;
    }

    select.innerHTML =
      '<option value="">اختر القسم</option>' +
      data.map(category => `
        <option value="${category.id}">${escapeHTML(category.name)}</option>
      `).join("");

  } catch (error) {
    console.error(error);
    select.innerHTML = '<option value="">تعذر تحميل الأقسام</option>';
  }
}

async function createMerchantStore(event) {
  event.preventDefault();

  const form = event.currentTarget;
  setLoading(form, true);

  try {
    if (!currentUser || currentRole !== "store_owner") {
      throw new Error("هذا الحساب ليس لديه صلاحية التاجر.");
    }

    const name = $("merchantStoreName").value.trim();
    const categoryId = $("merchantStoreCategory").value;
    const description = $("merchantStoreDescription").value.trim();
    const phone = $("merchantStorePhone").value.trim();
    const address = $("merchantStoreAddress").value.trim();

    if (!name || !categoryId || !phone || !address) {
      throw new Error("أكمل البيانات المطلوبة.");
    }

    const { error } = await db
      .from("stores")
      .insert({
        owner_id: currentUser.id,
        name,
        category_id: categoryId,
        description,
        phone,
        address,
        status: "pending"
      });

    if (error) throw error;

    form.reset();

    showMessage("accountMessage", "تم إرسال بيانات متجرك للإدارة بنجاح.");

    await loadMerchantDashboard();

  } catch (error) {
    console.error(error);
    showMessage("accountMessage", "تعذر إضافة المتجر: " + error.message, true);
  } finally {
    setLoading(form, false);
  }
}

async function loadMerchantProducts() {
  const container = $("merchantProducts");
  if (!container || !activeMerchantStoreId) return;

  container.textContent = "جاري تحميل المنتجات...";

  try {
    const { data, error } = await db
      .from("products")
      .select("id,store_id,name,description,price,image_uri,is_available,created_at")
      .eq("store_id", activeMerchantStoreId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    merchantProductsCache = data || [];
    renderMerchantProducts();

  } catch (error) {
    console.error(error);
    container.textContent = "تعذر تحميل المنتجات: " + error.message;
  }
}

function renderMerchantProducts() {
  const container = $("merchantProducts");
  if (!container) return;

  container.innerHTML = "";

  if (!merchantProductsCache.length) {
    container.textContent = "لم تضف أي منتجات لهذا المتجر حتى الآن.";
    return;
  }

  merchantProductsCache.forEach(product => {
    const card = document.createElement("div");
    card.className = "wasl-product-card";

    card.innerHTML = `
      ${
        product.image_uri
          ? `<img class="wasl-product-image"
              src="${escapeHTML(product.image_uri)}"
              alt="صورة المنتج"
              onerror="this.style.display='none'">`
          : ""
      }

      <h4>${escapeHTML(product.name)}</h4>
      <p>${escapeHTML(product.description || "بدون وصف")}</p>
      <p>السعر: ${escapeHTML(product.price)} جنيه</p>
      <p>الحالة: ${product.is_available ? "متاح" : "غير متاح"}</p>

      <div class="wasl-actions">
        <button type="button" class="wasl-secondary"
          data-product-action="edit" data-id="${product.id}">
          تعديل
        </button>
        <button type="button" class="wasl-delete"
          data-product-action="delete" data-id="${product.id}">
          حذف
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

function resetProductForm() {
  const form = $("merchantProductForm");
  if (!form) return;

  form.reset();
  $("merchantProductId").value = "";
  $("merchantProductAvailable").checked = true;
  $("merchantProductSave").textContent = "إضافة المنتج";
}

function handleProductAction(event) {
  const button = event.target.closest("[data-product-action]");
  if (!button) return;

  const product = merchantProductsCache.find(item =>
    item.id === button.dataset.id
  );

  if (!product) return;

  if (button.dataset.productAction === "edit") {
    $("merchantProductId").value = product.id;
    $("merchantProductName").value = product.name || "";
    $("merchantProductDescription").value = product.description || "";
    $("merchantProductPrice").value = product.price ?? "";
    $("merchantProductImage").value = product.image_uri || "";
    $("merchantProductAvailable").checked = product.is_available;

    $("merchantProductSave").textContent = "حفظ التعديلات";

    $("merchantProductForm").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  if (button.dataset.productAction === "delete") {
    deleteMerchantProduct(product, button);
  }
}

async function saveMerchantProduct(event) {
  event.preventDefault();

  const form = event.currentTarget;
  setLoading(form, true);

  try {
    const store = merchantStoresCache.find(item =>
      item.id === activeMerchantStoreId && item.status === "approved"
    );

    if (!store) {
      throw new Error("يجب اختيار متجر معتمد أولاً.");
    }

    const productId = $("merchantProductId").value;
    const name = $("merchantProductName").value.trim();
    const description = $("merchantProductDescription").value.trim();
    const price = Number($("merchantProductPrice").value);
    const imageUri = $("merchantProductImage").value.trim();
    const isAvailable = $("merchantProductAvailable").checked;

    if (!name || !Number.isFinite(price) || price < 0) {
      throw new Error("تأكد من اسم المنتج والسعر.");
    }

    const productData = {
      store_id: activeMerchantStoreId,
      name,
      description,
      price,
      image_uri: imageUri || null,
      is_available: isAvailable
    };

    let result;

    if (productId) {
      result = await db
        .from("products")
        .update(productData)
        .eq("id", productId)
        .eq("store_id", activeMerchantStoreId);
    } else {
      result = await db
        .from("products")
        .insert(productData);
    }

    if (result.error) throw result.error;

    resetProductForm();

    showMessage(
      "accountMessage",
      productId ? "تم تعديل المنتج بنجاح." : "تمت إضافة المنتج بنجاح."
    );

    await loadMerchantProducts();

  } catch (error) {
    console.error(error);
    showMessage("accountMessage", "تعذر حفظ المنتج: " + error.message, true);
  } finally {
    setLoading(form, false);
  }
}

async function deleteMerchantProduct(product, button) {
  if (!confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`)) return;

  button.disabled = true;

  try {
    const { error } = await db
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq("store_id", activeMerchantStoreId);

    if (error) throw error;

    showMessage("accountMessage", "تم حذف المنتج.");
    await loadMerchantProducts();

  } catch (error) {
    console.error(error);
    showMessage("accountMessage", "تعذر حذف المنتج: " + error.message, true);
    button.disabled = false;
  }
}

// ===============================
// الحساب وتسجيل الدخول
// ===============================

async function displayAccount() {
  try {
    const { data, error } = await db.auth.getSession();
    if (error) throw error;

    currentUser = data.session?.user || null;
    isAdmin = false;
    currentRole = "customer";

    if (!currentUser) {
      $("adminDashboard")?.classList.add("wasl-hidden");
      $("merchantDashboard")?.classList.add("wasl-hidden");
      displayPanel("loginPanel");
      return;
    }

    displayPanel("profilePanel");
    $("profileEmail").textContent = currentUser.email || "";

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("role,full_name,phone")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (profileError) throw profileError;

    currentRole = profile?.role || "customer";
    isAdmin = currentRole === "admin";

    addDashboardStyles();
    prepareAdminDashboard();
    prepareMerchantDashboard();

    $("adminDashboard")?.classList.toggle("wasl-hidden", !isAdmin);
    $("merchantDashboard")?.classList.toggle(
      "wasl-hidden",
      currentRole !== "store_owner"
    );

    if (isAdmin) {
      setAdminSection("requests");
      await loadAdminRequests();
    }

    if (currentRole === "store_owner") {
      await loadMerchantDashboard();
    }

    const { data: requests, error: requestError } = await db
      .from("join_requests")
      .select("requested_role,status")
      .eq("user_id", currentUser.id);

    if (requestError) throw requestError;

    const roleNames = {
      customer: "عميل",
      store_owner: "تاجر",
      rider: "مندوب",
      admin: "مدير النظام"
    };

    const statusNames = {
      pending: "قيد المراجعة",
      approved: "تمت الموافقة",
      rejected: "مرفوض"
    };

    let statusText = `نوع الحساب: ${roleNames[currentRole] || currentRole}.`;

    if (requests?.length) {
      statusText += "\n" + requests.map(request => {
        const name = request.requested_role === "store_owner" ? "تاجر" : "مندوب";
        return `طلب ${name}: ${statusNames[request.status] || request.status}`;
      }).join("\n");
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
    showMessage("accountMessage", error.message || "تعذر تسجيل الدخول.", true);
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
        data: {
          full_name: fullName,
          phone
        }
      }
    });

    if (error) throw error;

    if (data.session && data.user) {
      currentUser = data.user;

      const { error: profileError } = await db
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("user_id", currentUser.id);

      if (profileError) throw profileError;

      form.reset();
      showMessage("accountMessage", "تم إنشاء حسابك بنجاح.");
      await displayAccount();

    } else {
      form.reset();
      displayPanel("loginPanel");
      showMessage("accountMessage", "تم إنشاء الحساب. سجل دخولك الآن.");
    }

  } catch (error) {
    showMessage("accountMessage", error.message || "تعذر إنشاء الحساب.", true);
  } finally {
    setLoading(form, false);
  }
}

// ===============================
// طلب الانضمام كتاجر أو مندوب
// ===============================

async function startJoin(role) {
  clearMessage("accountMessage");

  const { data, error } = await db.auth.getSession();
  if (error) throw error;

  currentUser = data.session?.user || null;

  if (!currentUser) {
    displayPanel("loginPanel");
    showMessage("accountMessage", "سجل دخولك أولاً علشان تقدم طلب الانضمام.");
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
  showOverlay($("joinOverlay"));
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
      .update({ full_name: fullName, phone })
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
        phone,
        status: "pending"
      });

    if (insertError) throw insertError;

    form.reset();
    hideOverlay($("joinOverlay"));

    showMessage(
      "accountMessage",
      "تم إرسال طلبك بنجاح. طلبك الآن قيد المراجعة من إدارة وَصْل."
    );

    await displayAccount();

  } catch (error) {
    showMessage("joinMessage", error.message || "تعذر إرسال الطلب.", true);
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
    isAdmin = false;
    currentRole = "customer";

    $("adminDashboard")?.classList.add("wasl-hidden");
    $("merchantDashboard")?.classList.add("wasl-hidden");

    displayPanel("loginPanel");
    showMessage("accountMessage", "تم تسجيل الخروج بنجاح.");

  } catch (error) {
    showMessage("accountMessage", error.message || "تعذر تسجيل الخروج.", true);
  }
}

// ===============================
// البحث والأقسام
// ===============================

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

// ===============================
// تشغيل الموقع
// ===============================

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
      hideOverlay($("accountOverlay"));
    });

    $("closeJoin")?.addEventListener("click", () => {
      hideOverlay($("joinOverlay"));
    });

    $("cancelJoin")?.addEventListener("click", () => {
      hideOverlay($("joinOverlay"));
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
      hideOverlay($("accountOverlay"));
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
      openAccount();
      showMessage("accountMessage", "قائمة المفضلة سيتم تفعيلها في مرحلة قادمة.");
    });

    $("locationBtn")?.addEventListener("click", () => {
      openAccount();
      showMessage(
        "accountMessage",
        "اختيار المناطق والعناوين التفصيلية سيتم تفعيله قريبًا."
      );
    });

    $("accountOverlay")?.addEventListener("click", event => {
      if (event.target === $("accountOverlay")) {
        hideOverlay($("accountOverlay"));
      }
    });

    $("joinOverlay")?.addEventListener("click", event => {
      if (event.target === $("joinOverlay")) {
        hideOverlay($("joinOverlay"));
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        hideOverlay($("joinOverlay"));
        hideOverlay($("accountOverlay"));
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
