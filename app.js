const categoryButtons = document.querySelectorAll(".category");
const cards = document.querySelectorAll(".shop-card");
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");
let activeCategory = "الكل";

function filterShops() {
  const term = (searchInput.value || "").trim().toLowerCase();
  let visible = 0;
  cards.forEach(card => {
    const matchesCategory = activeCategory === "الكل" || card.dataset.category === activeCategory;
    const matchesSearch = !term || card.dataset.name.toLowerCase().includes(term) ||
      card.textContent.toLowerCase().includes(term);
    const show = matchesCategory && matchesSearch;
    card.classList.toggle("hidden", !show);
    if (show) visible++;
  });
  emptyState.classList.toggle("hidden", visible > 0);
}

categoryButtons.forEach(button => {
  button.addEventListener("click", () => {
    categoryButtons.forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    activeCategory = button.dataset.category;
    filterShops();
  });
});
searchInput.addEventListener("input", filterShops);

document.getElementById("locationBtn").addEventListener("click", () => {
  alert("في النسخة القادمة هنضيف اختيار المنطقة والعنوان بالتفصيل.");
});
