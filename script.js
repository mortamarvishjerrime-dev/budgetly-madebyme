/* ==============================
   GLOBAL STORAGE
============================== */

let transactions = JSON.parse(sessionStorage.getItem("transactions")) || [];
let spendingPieChart = null;
let expenseLineChart = null;
let reportPieChart = null;
let reportBarChart = null;
let editingIndex = null;
let showAllTransactions = false;

const tips = [
  "Save first before spending. Even small savings build strong habits.",
  "Track snacks, fares, and school expenses because small spending adds up.",
  "Set a weekly allowance limit so your budget lasts longer.",
  "Review your expenses every weekend.",
  "Before buying something, ask yourself if it is a need or a want."
];

/* ==============================
   PAGE LOAD
============================== */

document.addEventListener("DOMContentLoaded", () => {
  protectPages();

  loadNavbarProfile();
  showProfile();

  loadDashboard();
  renderTrackerTable();
  loadBudgetPage();
  loadReportsPage();
  generateCharts();
  rotateTip();

  const expenseBtn = document.getElementById("expenseBtn");

  if (expenseBtn) {
    expenseBtn.addEventListener("click", saveExpense);
  }
});

/* ==============================
   HELPERS
============================== */

function formatPeso(value) {
  return "₱" + Number(value || 0).toLocaleString();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function getProfile() {
  return JSON.parse(sessionStorage.getItem("profile")) || null;
}

function saveTransactions() {
  sessionStorage.setItem("transactions", JSON.stringify(transactions));
}

function getExpenseTransactions() {
  return transactions.filter(item => item.type !== "income");
}

function getTotalExpenses() {
  return getExpenseTransactions().reduce((sum, item) => {
    return sum + Number(item.amount || 0);
  }, 0);
}

function getCategoryTotals() {
  const categories = {
    Food: 0,
    Transport: 0,
    School: 0,
    Personal: 0,
    Others: 0
  };

  getExpenseTransactions().forEach(item => {
    if (categories[item.category] !== undefined) {
      categories[item.category] += Number(item.amount || 0);
    }
  });

  return categories;
}

/* ==============================
   PAGE PROTECTION
============================== */

function protectPages() {
  const currentPage = window.location.pathname.split("/").pop();

  const protectedPages = [
    "home.html",
    "tracker.html",
    "budget.html",
    "reports.html"
  ];

  const profile = getProfile();

  if (protectedPages.includes(currentPage) && !profile) {
    window.location.href = "index.html";
  }
}

/* ==============================
   PROFILE PAGE
============================== */

function saveProfile() {
  const profile = {
    name: document.getElementById("fullName").value.trim(),
    studentId: document.getElementById("studentId").value.trim(),
    email: document.getElementById("email").value.trim(),
    course: document.getElementById("course").value.trim(),
    budget: Number(document.getElementById("monthlyBudget").value || 0),
    goal: Number(document.getElementById("savingsGoal").value || 0),
    balance: Number(document.getElementById("currentBalance").value || 0)
  };

  if (!profile.name || !profile.studentId || !profile.email || !profile.course) {
    alert("Please complete your profile first.");
    return;
  }

  sessionStorage.setItem("profile", JSON.stringify(profile));

  window.location.href = "home.html";
}

function showProfile() {
  const profile = getProfile();

  const form = document.getElementById("profileForm");
  const content = document.getElementById("profileContent");

  if (!form || !content) return;

  if (!profile) {
    form.classList.remove("hidden");
    content.classList.add("hidden");
    return;
  }

  form.classList.add("hidden");
  content.classList.remove("hidden");

  setText("profileInitial", profile.name.charAt(0).toUpperCase());
  setText("displayName", profile.name);
  setText("displayCourse", profile.course);

  setText("nameValue", profile.name);
  setText("idValue", profile.studentId);
  setText("emailValue", profile.email);
  setText("courseValue", profile.course);

  setText("budgetValue", formatPeso(profile.budget));
  setText("goalValue", formatPeso(profile.goal));
  setText("balanceValue", formatPeso(profile.balance));

  const percent = profile.goal > 0
    ? Math.min((profile.balance / profile.goal) * 100, 100)
    : 0;

  const savingBar = document.getElementById("savingBar");
  if (savingBar) savingBar.style.width = percent + "%";

  setText("savingText", Math.round(percent) + "% of savings goal completed");
}

function editProfile() {
  const profile = getProfile();
  if (!profile) return;

  document.getElementById("profileForm").classList.remove("hidden");
  document.getElementById("profileContent").classList.add("hidden");

  document.getElementById("fullName").value = profile.name;
  document.getElementById("studentId").value = profile.studentId;
  document.getElementById("email").value = profile.email;
  document.getElementById("course").value = profile.course;
  document.getElementById("monthlyBudget").value = profile.budget;
  document.getElementById("savingsGoal").value = profile.goal;
  document.getElementById("currentBalance").value = profile.balance;
}

/* ==============================
   NAVBAR
============================== */

function loadNavbarProfile() {
  const profile = getProfile();

  const avatar = document.getElementById("navAvatar") || document.querySelector(".nav-avatar");
  const navName = document.getElementById("navName");

  if (!avatar) return;

  if (profile) {
    avatar.innerText = profile.name.charAt(0).toUpperCase();
    if (navName) navName.innerText = profile.name;
  } else {
    avatar.innerText = "👤";
    if (navName) navName.innerText = "Student";
  }
}

/* ==============================
   DASHBOARD PAGE
============================== */

function loadDashboard() {
  const profile = getProfile() || {};

  const budget = Number(profile.budget || 0);
  const balance = Number(profile.balance || 0);
  const totalExpenses = getTotalExpenses();

  const welcome = document.getElementById("welcomeName");

  if (welcome && profile.name) {
    welcome.innerText = `Welcome Back, ${profile.name}!`;
  }

  setText("totalBalance", formatPeso(balance));
  setText("budgetLeft", formatPeso(budget - totalExpenses));
  setText("totalExpenses", formatPeso(totalExpenses));

  const expenseTransactions = getExpenseTransactions();

  const highestExpense = expenseTransactions.length
    ? Math.max(...expenseTransactions.map(item => Number(item.amount)))
    : 0;

  const savingsRate = budget > 0
    ? Math.max(0, Math.round(((budget - totalExpenses) / budget) * 100))
    : 0;

  setText("miniTransactions", expenseTransactions.length);
  setText("miniHighest", formatPeso(highestExpense));
  setText("miniHealth", savingsRate >= 60 ? "Excellent" : savingsRate >= 40 ? "Good" : "Low");
  setText("miniSavings", savingsRate + "%");

  renderRecentTransactions();
}

function renderRecentTransactions() {
  const list = document.getElementById("transactionsList");
  if (!list) return;

  if (transactions.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>No Transactions Yet</h3>
        <p>Your recent transactions will appear here once you start tracking expenses.</p>
      </div>
    `;
    return;
  }

  const visible = showAllTransactions ? transactions : transactions.slice(0, 6);

  list.innerHTML = "";

  visible.forEach(item => {
    const isIncome = item.type === "income";

    list.innerHTML += `
      <div class="transaction-item">
        <div class="transaction-left">
          <div class="transaction-icon">${getCategoryIcon(item.category)}</div>

          <div>
            <h4>${item.name}</h4>
            <p>${item.category}</p>
          </div>
        </div>

        <p>${item.date}</p>

        <div class="transaction-amount ${isIncome ? "income-amount" : ""}">
          ${isIncome ? "+" : "-"}${formatPeso(item.amount)}
        </div>
      </div>
    `;
  });
}

function toggleAllTransactions() {
  showAllTransactions = !showAllTransactions;

  const btn = document.getElementById("viewAllBtn");

  if (btn) {
    btn.innerText = showAllTransactions ? "Show Less" : "View All";
  }

  renderRecentTransactions();
}

function getCategoryIcon(category) {
  if (category === "Food") return "🍔";
  if (category === "Transport") return "🚌";
  if (category === "School") return "📚";
  if (category === "Personal") return "🎮";
  if (category === "Budget") return "💰";
  return "💸";
}

/* ==============================
   TRACKER PAGE
============================== */

function saveExpense() {
  const amountInput = document.getElementById("expenseAmount");
  const categoryInput = document.getElementById("expenseCategory");
  const noteInput = document.getElementById("expenseNote");

  if (!amountInput || !categoryInput || !noteInput) {
    alert("Expense form fields not found.");
    return;
  }

  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const note = noteInput.value.trim();

  if (!amount || amount <= 0 || !note) {
    alert("Please enter amount and notes.");
    return;
  }

  const expense = {
    name: note,
    category,
    amount,
    date: new Date().toLocaleDateString(),
    type: "expense"
  };

  if (editingIndex === null) {
    transactions.unshift(expense);
  } else {
    transactions[editingIndex] = expense;
    editingIndex = null;
    setText("expenseBtn", "Add Expense");
  }

  saveTransactions();

  amountInput.value = "";
  categoryInput.value = "Food";
  noteInput.value = "";

  renderTrackerTable();
  loadDashboard();
  loadBudgetPage();
  loadReportsPage();
  generateCharts();

  const historyCard = document.querySelector(".history-card");

  if (historyCard) {
    historyCard.classList.add("success-pop");

    setTimeout(() => {
      historyCard.classList.remove("success-pop");
    }, 500);
  }
}

function renderTrackerTable() {
  const table = document.getElementById("expenseTableBody");
  if (!table) return;

  const searchInput = document.getElementById("searchExpense");
  const keyword = searchInput ? searchInput.value.toLowerCase() : "";

  const expenses = getExpenseTransactions().filter(item =>
    item.name.toLowerCase().includes(keyword) ||
    item.category.toLowerCase().includes(keyword) ||
    item.date.toLowerCase().includes(keyword)
  );

  if (expenses.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="5" class="empty-table">
          No expenses yet.
        </td>
      </tr>
    `;
    return;
  }

  table.innerHTML = "";

  expenses.forEach((item, index) => {
    table.innerHTML += `
      <tr>
        <td>${item.date}</td>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>-${formatPeso(item.amount)}</td>
        <td>
          <button type="button" class="action-btn" onclick="editExpense(${index})">✎</button>
          <button type="button" class="action-btn delete-btn" onclick="deleteExpense(${index})">🗑</button>
        </td>
      </tr>
    `;
  });
}

function editExpense(index) {
  const expenses = getExpenseTransactions();
  const item = expenses[index];

  if (!item) return;

  const realIndex = transactions.indexOf(item);

  document.getElementById("expenseAmount").value = item.amount;
  document.getElementById("expenseCategory").value = item.category;
  document.getElementById("expenseNote").value = item.name;

  editingIndex = realIndex;
  setText("expenseBtn", "Save Changes");
}

function deleteExpense(index) {
  const expenses = getExpenseTransactions();
  const item = expenses[index];

  const realIndex = transactions.indexOf(item);

  if (realIndex !== -1) {
    transactions.splice(realIndex, 1);
  }

  saveTransactions();

  renderTrackerTable();
  loadDashboard();
  loadBudgetPage();
  loadReportsPage();
  generateCharts();
}

/* ==============================
   BUDGET PAGE
============================== */

function openBudgetModal() {
  const modal = document.getElementById("budgetModal");
  if (modal) modal.classList.remove("hidden");
}

function closeBudgetModal() {
  const modal = document.getElementById("budgetModal");
  if (modal) modal.classList.add("hidden");
}

function saveBudget() {
  const amountInput = document.getElementById("budgetAmount");
  const periodInput = document.getElementById("budgetPeriod");
  const categoryInput = document.getElementById("budgetCategory");

  if (!amountInput || !periodInput || !categoryInput) return;

  const amount = Number(amountInput.value);
  const period = periodInput.value;
  const category = categoryInput.value;

  if (!amount || amount <= 0) {
    alert("Please enter a valid budget amount.");
    return;
  }

  const profile = getProfile() || {};

  profile.budget = Number(profile.budget || 0) + amount;
  profile.balance = Number(profile.balance || 0) + amount;
  profile.period = period;

  const categoryBudgets = JSON.parse(sessionStorage.getItem("categoryBudgets")) || {
    Food: 0,
    Transport: 0,
    School: 0,
    Personal: 0,
    Others: 0
  };

  categoryBudgets[category] = Number(categoryBudgets[category] || 0) + amount;

  sessionStorage.setItem("profile", JSON.stringify(profile));
  sessionStorage.setItem("categoryBudgets", JSON.stringify(categoryBudgets));

  transactions.unshift({
    name: `Added Budget for ${category}`,
    category: "Budget",
    amount,
    date: new Date().toLocaleDateString(),
    type: "income"
  });

  saveTransactions();

  amountInput.value = "";

  closeBudgetModal();

  loadNavbarProfile();
  loadDashboard();
  loadBudgetPage();
  loadReportsPage();
  showProfile();
  generateCharts();
}

function loadBudgetPage() {
  const profile = getProfile() || {};

  const budget = Number(profile.budget || 0);
  const totalExpenses = getTotalExpenses();
  const budgetLeft = budget - totalExpenses;

  const usedPercent = budget > 0
    ? Math.min((totalExpenses / budget) * 100, 100)
    : 0;

  setText("summaryBudget", formatPeso(budget));
  setText("summaryExpenses", formatPeso(totalExpenses));
  setText("summaryLeft", formatPeso(budgetLeft));
  setText("budgetPercent", Math.round(usedPercent) + "%");

  const donut = document.querySelector(".budget-donut");

  if (donut) {
    donut.style.background = `conic-gradient(#D9A63A ${usedPercent * 3.6}deg, #e5e7eb 0deg)`;
  }

  renderBudgetCategories();
}

function renderBudgetCategories() {
  const container = document.getElementById("budgetCategoryTable");
  if (!container) return;

  const categoryBudgets = JSON.parse(sessionStorage.getItem("categoryBudgets")) || {
    Food: 0,
    Transport: 0,
    School: 0,
    Personal: 0,
    Others: 0
  };

  const used = getCategoryTotals();

  container.innerHTML = `
    <div class="budget-row header">
      <span>Category</span>
      <span>Budget</span>
      <span>Used</span>
      <span>Left</span>
      <span>Progress</span>
    </div>
  `;

  Object.keys(categoryBudgets).forEach(category => {
    const budget = Number(categoryBudgets[category] || 0);
    const spent = Number(used[category] || 0);
    const left = budget - spent;
    const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

    container.innerHTML += `
      <div class="budget-row">
        <span>${getCategoryIcon(category)} ${category}</span>
        <span>${formatPeso(budget)}</span>
        <span>${formatPeso(spent)}</span>
        <span>${formatPeso(left)}</span>
        <div class="progress-mini">
          <span style="width:${percent}%"></span>
        </div>
      </div>
    `;
  });
}

/* ==============================
   HOME CHARTS
============================== */

function generateCharts() {
  if (typeof Chart === "undefined") return;

  const categories = getCategoryTotals();
  const totalSpent = Object.values(categories).reduce((a, b) => a + b, 0);

  updateOverviewRow("food", categories.Food, totalSpent);
  updateOverviewRow("transport", categories.Transport, totalSpent);
  updateOverviewRow("school", categories.School, totalSpent);
  updateOverviewRow("personal", categories.Personal, totalSpent);
  updateOverviewRow("others", categories.Others, totalSpent);

  renderPieChart(categories);
  renderLineChart();
}

function updateOverviewRow(id, amount, totalSpent) {
  const percent = totalSpent > 0
    ? Math.round((amount / totalSpent) * 100)
    : 0;

  setText(id + "Percent", percent + "%");
  setText(id + "Amount", formatPeso(amount));
}

function renderPieChart(categories) {
  const canvas = document.getElementById("spendingPieChart");
  if (!canvas || typeof Chart === "undefined") return;

  if (spendingPieChart) spendingPieChart.destroy();

  spendingPieChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: [
          "#002B45",
          "#D9A63A",
          "#4CAF50",
          "#9C27B0",
          "#d94b4b"
        ],
        borderWidth: 0
      }]
    },
    options: {
      cutout: "65%",
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function renderLineChart() {
  const canvas = document.getElementById("lineChart");
  if (!canvas || typeof Chart === "undefined") return;

  if (expenseLineChart) expenseLineChart.destroy();

  const expenses = getExpenseTransactions();

  expenseLineChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: expenses.map((_, index) => `T${index + 1}`).reverse(),
      datasets: [{
        label: "Expenses",
        data: expenses.map(item => item.amount).reverse(),
        borderColor: "#002B45",
        backgroundColor: "rgba(0,43,69,.14)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#D9A63A",
        pointBorderColor: "#002B45",
        pointRadius: 5
      }]
    }
  });
}

/* ==============================
   REPORTS PAGE
============================== */

function generateReport() {
  loadReportsPage();

  const hero = document.querySelector(".reports-hero");

  if (hero) {
    hero.classList.add("success-pop");

    setTimeout(() => {
      hero.classList.remove("success-pop");
    }, 500);
  }
}

function loadReportsPage() {
  const expenses = getExpenseTransactions();
  const total = getTotalExpenses();

  const average = expenses.length > 0
    ? total / expenses.length
    : 0;

  const categories = getCategoryTotals();

  const topCategory = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])[0];

  setText("reportTotalExpenses", formatPeso(total));
  setText("reportAverage", formatPeso(average));
  setText(
    "reportTopCategory",
    topCategory && topCategory[1] > 0
      ? `${topCategory[0]} (${formatPeso(topCategory[1])})`
      : "None"
  );

  renderReportPieChart(categories);
  renderReportBarChart(expenses);
  renderInsights(total, categories);
}

function renderReportPieChart(categories) {
  const canvas = document.getElementById("reportPieChart");
  if (!canvas || typeof Chart === "undefined") return;

  if (reportPieChart) reportPieChart.destroy();

  reportPieChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: [
          "#002B45",
          "#D9A63A",
          "#4CAF50",
          "#9C27B0",
          "#d94b4b"
        ],
        borderWidth: 0
      }]
    },
    options: {
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

function renderReportBarChart(expenses) {
  const canvas = document.getElementById("reportBarChart");
  if (!canvas || typeof Chart === "undefined") return;

  if (reportBarChart) reportBarChart.destroy();

  reportBarChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: expenses.map((_, index) => `T${index + 1}`).reverse(),
      datasets: [{
        label: "Expenses",
        data: expenses.map(item => item.amount).reverse(),
        backgroundColor: "#D9A63A",
        borderRadius: 14
      }]
    },
    options: {
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function renderInsights(total, categories) {
  const list = document.getElementById("spendingInsights");
  if (!list) return;

  list.innerHTML = "";

  if (total === 0) {
    list.innerHTML = `
      <li>No spending data yet. Add expenses in the Tracker page to generate insights.</li>
    `;
    return;
  }

  const topCategory = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])[0];

  list.innerHTML += `
    <li>You spent a total of <b>${formatPeso(total)}</b> this period.</li>
  `;

  if (topCategory && topCategory[1] > 0) {
    list.innerHTML += `
      <li>Your highest spending category is <b>${topCategory[0]}</b> with <b>${formatPeso(topCategory[1])}</b>.</li>
    `;
  }

  list.innerHTML += `
    <li>Review your biggest category weekly to avoid overspending.</li>
  `;
}

/* ==============================
   TIPS
============================== */

function rotateTip() {
  const tipText = document.getElementById("tipText");
  if (!tipText) return;

  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  tipText.innerText = randomTip;
}

function quickAddBudget(amount) {
  const input = document.getElementById("budgetAmount");
  if (input) input.value = amount;
  openBudgetModal();
}

function resetBudget() {
  const profile = getProfile() || {};
  profile.budget = 0;
  profile.balance = 0;

  sessionStorage.setItem("profile", JSON.stringify(profile));
  sessionStorage.removeItem("categoryBudgets");

  loadBudgetPage();
  loadDashboard();
}