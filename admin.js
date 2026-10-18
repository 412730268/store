import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { menu } from "./menu-data.js";

const firebaseConfig = {
  apiKey: "AIzaSyC9GnZln_CXwrR7rY85QnGi2f95e66G3Dg",
  authDomain: "xinhe-bento.firebaseapp.com",
  projectId: "xinhe-bento",
  storageBucket: "xinhe-bento.firebasestorage.app",
  messagingSenderId: "741579797351",
  appId: "1:741579797351:web:566a0934172d67856575c2",
  measurementId: "G-CFREM0CVFT",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const loginButton = document.getElementById("loginButton");
const adminShell = document.getElementById("adminShell");
const logoutButton = document.getElementById("logoutButton");
const orderQueue = document.getElementById("orderQueue");
const pendingCount = document.getElementById("pendingCount");
const processingCount = document.getElementById("processingCount");
const completedCount = document.getElementById("completedCount");
const totalRevenue = document.getElementById("totalRevenue");
const filterButtons = document.querySelectorAll(".filter-btn");
const navButtons = document.querySelectorAll(".nav-item[data-view]");
const viewPanels = document.querySelectorAll("[data-view-panel]");
const pageTitle = document.getElementById("pageTitle");
const pageEyebrow = document.getElementById("pageEyebrow");
const orderHistory = document.getElementById("orderHistory");
const historyCount = document.getElementById("historyCount");
const historyDate = document.getElementById("historyDate");
const historyFilter = document.getElementById("historyFilter");
const analyticsStartDate = document.getElementById("analyticsStartDate");
const analyticsEndDate = document.getElementById("analyticsEndDate");
const applyAnalyticsRange = document.getElementById("applyAnalyticsRange");
const popularItems = document.getElementById("popularItems");
const menuManagement = document.getElementById("menuManagement");
const menuSettings = new Map();

const state = {
  filter: "全部",
  view: "orders",
};

let stopAdminListeners = null;

const viewLabels = {
  orders: { title: "接單管理", eyebrow: "今日營業" },
  history: { title: "訂單歷史", eyebrow: "訂單紀錄" },
  analytics: { title: "營業統計", eyebrow: "營運概況" },
  menu: { title: "菜單管理", eyebrow: "菜單維護" },
};

if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission().catch(() => {});
}

const statusClassMap = {
  "未處理": "warning",
  "製作中": "info",
  "已完成": "success",
};

function formatMoney(value) {
  return `NT$ ${Number(value || 0).toLocaleString()}`;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  loginButton.disabled = true;
  loginButton.textContent = "登入中...";

  try {
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
  } catch (error) {
    console.error("店家登入失敗:", error);
    loginError.textContent = "登入失敗，請確認電子郵件與密碼。";
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "登入";
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("店家登出失敗:", error);
    alert("登出失敗，請稍後再試。");
  }
});

function renderMenuManagement() {
  menuManagement.innerHTML = "";

  menu.forEach((item) => {
    const settings = menuSettings.get(String(item.id)) || {};
    const card = document.createElement("article");
    card.className = "menu-admin-card";

    const image = document.createElement("img");
    image.className = "menu-admin-image";
    image.alt = `${item.name} 菜單照片`;
    if (settings.imageUrl) {
      image.src = settings.imageUrl;
    } else {
      image.classList.add("empty-image");
    }

    const details = document.createElement("div");
    details.className = "menu-admin-details";
    const name = document.createElement("h3");
    name.textContent = item.name;
    const category = document.createElement("span");
    category.textContent = item.category;
    details.append(name, category);

    const controls = document.createElement("div");
    controls.className = "menu-admin-controls";

    const priceLabel = document.createElement("label");
    priceLabel.textContent = "價格";
    const priceInput = document.createElement("input");
    priceInput.type = "number";
    priceInput.min = "0";
    priceInput.step = "1";
    priceInput.value = String(settings.price ?? item.price);
    priceInput.setAttribute("aria-label", `${item.name}價格`);
    priceLabel.appendChild(priceInput);

    const savePriceButton = document.createElement("button");
    savePriceButton.type = "button";
    savePriceButton.className = "menu-admin-button";
    savePriceButton.textContent = "儲存價格";

    const imageLabel = document.createElement("label");
    imageLabel.className = "menu-image-url-label";
    imageLabel.textContent = "照片網址";
    const imageUrlInput = document.createElement("input");
    imageUrlInput.type = "url";
    imageUrlInput.inputMode = "url";
    imageUrlInput.placeholder = "https://example.com/photo.jpg";
    imageUrlInput.value = settings.imageUrl || "";
    imageUrlInput.setAttribute("aria-label", `${item.name}照片網址`);
    imageLabel.appendChild(imageUrlInput);

    const saveImageButton = document.createElement("button");
    saveImageButton.type = "button";
    saveImageButton.className = "menu-admin-button secondary";
    saveImageButton.textContent = "儲存照片網址";

    const feedback = document.createElement("span");
    feedback.className = "menu-admin-feedback";
    feedback.setAttribute("aria-live", "polite");

    savePriceButton.addEventListener("click", async () => {
      const price = Number(priceInput.value);
      if (!Number.isInteger(price) || price < 0) {
        feedback.textContent = "請輸入 0 以上的整數價格。";
        return;
      }

      savePriceButton.disabled = true;
      feedback.textContent = "儲存中...";
      try {
        await setDoc(doc(db, "menu", String(item.id)), { price }, { merge: true });
        feedback.textContent = "價格已更新。";
        showToast(`${item.name}價格已更新`);
      } catch (error) {
        console.error("更新菜單價格失敗:", error);
        feedback.textContent = "儲存失敗，請確認 Firebase 權限後重試。";
      } finally {
        savePriceButton.disabled = false;
      }
    });

    saveImageButton.addEventListener("click", async () => {
      const imageUrl = imageUrlInput.value.trim();
      if (imageUrl) {
        try {
          const parsedUrl = new URL(imageUrl);
          if (parsedUrl.protocol !== "https:") throw new Error("HTTPS is required");
        } catch {
          feedback.textContent = "請輸入有效的 HTTPS 圖片網址。";
          return;
        }
      }

      saveImageButton.disabled = true;
      feedback.textContent = "儲存中...";
      try {
        await setDoc(
          doc(db, "menu", String(item.id)),
          { imageUrl: imageUrl || "" },
          { merge: true }
        );
        if (imageUrl) {
          image.src = imageUrl;
          image.classList.remove("empty-image");
        } else {
          image.removeAttribute("src");
          image.classList.add("empty-image");
        }
        feedback.textContent = imageUrl ? "照片網址已更新。" : "已移除菜單照片。";
        showToast(`${item.name}照片設定已更新`);
      } catch (error) {
        console.error("更新菜單照片網址失敗:", error);
        feedback.textContent = "儲存失敗，請確認 Firestore 權限後重試。";
      } finally {
        saveImageButton.disabled = false;
      }
    });

    controls.append(priceLabel, savePriceButton, imageLabel, saveImageButton, feedback);
    card.append(image, details, controls);
    menuManagement.appendChild(card);
  });
}

function getOrderDate(order) {
  if (order.createdAt && typeof order.createdAt.toDate === "function") {
    return order.createdAt.toDate();
  }

  if (order.createdAt && typeof order.createdAt === "string") {
    const parsed = new Date(order.createdAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (order.time) {
    const parsed = new Date(order.time);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

function formatTime(date) {
  return date.toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
  });
}

function isSameDay(dateA, dateB = new Date()) {
  return dateA.getFullYear() === dateB.getFullYear()
    && dateA.getMonth() === dateB.getMonth()
    && dateA.getDate() === dateB.getDate();
}

function filterTodayCompletedOrders(orders) {
  return orders.filter((order) => {
    if (order.status !== "已完成") return true;
    return isSameDay(getOrderDate(order));
  });
}

function getVisibleOrders(orders) {
  const displayOrders = filterTodayCompletedOrders(orders);
  if (state.filter === "全部") return displayOrders;
  return displayOrders.filter((order) => order.status === state.filter);
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 350);
  }, 2600);
}

function notifyNewOrder(order) {
  const orderName = Array.isArray(order.items)
    ? order.items.map((item) => {
        if (typeof item === "string") return item;
        if (item?.name) return `${item.name} x${item.quantity || 1}`;
        return String(item);
      }).join("、")
    : String(order.items || "新訂單");

  const message = `新訂單：${orderName}`;
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("新訂單通知", { body: message });
  }
  showToast(message);
}

function renderSummary(orders) {
  const displayOrders = filterTodayCompletedOrders(orders);
  const completed = displayOrders.filter((item) => item.status === "已完成").length;
  const revenue = displayOrders
    .filter((item) => item.status === "已完成")
    .reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);

  pendingCount.textContent = displayOrders.filter((item) => item.status === "未處理").length;
  processingCount.textContent = displayOrders.filter((item) => item.status === "製作中").length;
  completedCount.textContent = completed;
  totalRevenue.textContent = formatMoney(revenue);
}

function buildActionButtons(order) {
  if (order.status === "未處理") {
    return `<button class="status-action" data-order-id="${order.id}" data-status="製作中">接單</button>`;
  }

  if (order.status === "製作中") {
    return `<button class="status-action" data-order-id="${order.id}" data-status="已完成">完成</button>`;
  }

  return `<button class="status-action disabled" disabled>已完成</button>`;
}

function renderOrders(orders) {
  const visibleOrders = getVisibleOrders(orders);

  if (!visibleOrders.length) {
    orderQueue.innerHTML = `
      <div class="empty-state">
        <p>目前沒有 ${state.filter === "全部" ? "任何" : state.filter} 訂單</p>
      </div>
    `;
    return;
  }

  orderQueue.innerHTML = visibleOrders
    .map((order) => {
      const items = Array.isArray(order.items)
        ? order.items
        : String(order.items || "").split("\n").filter(Boolean);

      const itemList = items
        .map((item) => {
          if (typeof item === "string") return `<li>${item}</li>`;
          if (item && item.name) return `<li>${item.name}${item.quantity ? ` x${item.quantity}` : ""}${item.price ? ` - ${formatMoney(item.price)}` : ""}</li>`;
          return `<li>${String(item)}</li>`;
        })
        .join("");

      const statusClass = statusClassMap[order.status] || "default";
      const shortId = String(order.id).slice(0, 6).toUpperCase();

      return `
        <article class="order-card">
          <div class="order-header">
            <div>
              <span class="order-id">訂單 #${shortId}</span>
              <span class="order-time">${formatTime(getOrderDate(order))}</span>
            </div>
            <span class="status-badge ${statusClass}">${order.status || "未處理"}</span>
          </div>

          <ul class="order-items">
            ${itemList}
          </ul>

          <div class="order-footer">
            <strong class="order-total">${formatMoney(order.totalAmount || 0)}</strong>
            <div class="order-actions">
              ${buildActionButtons(order)}
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  orderQueue.querySelectorAll(".status-action").forEach((button) => {
    button.addEventListener("click", async () => {
      const { orderId, status } = button.dataset;
      if (!orderId || !status) return;

      try {
        const targetRef = doc(db, "orders", orderId);
        await updateDoc(targetRef, { status });
      } catch (error) {
        console.error("更新訂單狀態失敗:", error);
        alert("更新失敗，請稍後再試。");
      }
    });
  });
}

function getOrderDayKey(order) {
  const date = getOrderDate(order);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function groupOrdersByDay(orders) {
  const map = new Map();

  orders.forEach((order) => {
    const key = getOrderDayKey(order);
    if (!map.has(key)) {
      map.set(key, { dayKey: key, date: getOrderDate(order), orders: [] });
    }
    map.get(key).orders.push(order);
  });

  return [...map.values()].sort((a, b) => b.date - a.date);
}

function renderHistory(orders) {
  const selectedDate = historyDate.value;
  const filteredOrders = orders.filter((order) => {
    if (selectedDate) {
      const orderDate = getOrderDate(order);
      const dateValue = toDateInputValue(orderDate);
      if (dateValue !== selectedDate) return false;
    }

    if (historyFilter.value === "全部") return true;
    if (historyFilter.value === "進行中") return order.status !== "已完成";
    return order.status === historyFilter.value;
  });

  historyCount.textContent = `共 ${filteredOrders.length} 筆訂單`;

  if (!filteredOrders.length) {
    orderHistory.innerHTML = '<div class="empty-state"><p>目前沒有符合條件的訂單</p></div>';
    return;
  }

  const groupedOrders = groupOrdersByDay(filteredOrders);
  orderHistory.innerHTML = groupedOrders.map(({ date, orders: dayOrders }) => {
    const groupTotal = dayOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const dateTitle = formatTime(date);

    return `
      <section class="date-group">
        <div class="date-group-header">
          <h3>${dateTitle}</h3>
          <span>${dayOrders.length} 筆訂單 · ${formatMoney(groupTotal)}</span>
        </div>
        <div class="date-group-orders">
          ${dayOrders.map((order) => {
            const items = Array.isArray(order.items)
              ? order.items
              : String(order.items || "").split("\n").filter(Boolean);
            const itemList = items.map((item) => {
              if (typeof item === "string") return `<li>${item}</li>`;
              if (item && item.name) {
                return `<li>${item.name}${item.quantity ? ` x${item.quantity}` : ""}${item.price ? ` - ${formatMoney(item.price)}` : ""}</li>`;
              }
              return `<li>${String(item)}</li>`;
            }).join("");
            const status = order.status || "未處理";
            const statusClass = statusClassMap[status] || "default";
            const shortId = String(order.id).slice(0, 6).toUpperCase();

            return `
              <article class="order-card">
                <div class="order-header">
                  <div><span class="order-id">訂單 #${shortId}</span><span class="order-time">${formatTime(getOrderDate(order))}</span></div>
                  <span class="status-badge ${statusClass}">${status}</span>
                </div>
                <ul class="order-items">${itemList}</ul>
                <div class="order-footer">
                  <strong class="order-total">${formatMoney(order.totalAmount || 0)}</strong>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }).join("");
}

function renderOrderCards(container, orders, allowActions) {
  if (!orders.length) {
    container.innerHTML = '<div class="empty-state"><p>目前沒有符合條件的訂單</p></div>';
    return;
  }

  container.innerHTML = orders.map((order) => {
    const items = Array.isArray(order.items)
      ? order.items
      : String(order.items || "").split("\n").filter(Boolean);
    const itemList = items.map((item) => {
      if (typeof item === "string") return `<li>${item}</li>`;
      if (item && item.name) {
        return `<li>${item.name}${item.quantity ? ` x${item.quantity}` : ""}${item.price ? ` - ${formatMoney(item.price)}` : ""}</li>`;
      }
      return `<li>${String(item)}</li>`;
    }).join("");
    const status = order.status || "未處理";
    const statusClass = statusClassMap[status] || "default";
    const shortId = String(order.id).slice(0, 6).toUpperCase();

    return `
      <article class="order-card">
        <div class="order-header">
          <div><span class="order-id">訂單 #${shortId}</span><span class="order-time">${formatTime(getOrderDate(order))}</span></div>
          <span class="status-badge ${statusClass}">${status}</span>
        </div>
        <ul class="order-items">${itemList}</ul>
        <div class="order-footer">
          <strong class="order-total">${formatMoney(order.totalAmount || 0)}</strong>
          ${allowActions ? `<div class="order-actions">${buildActionButtons(order)}</div>` : ""}
        </div>
      </article>
    `;
  }).join("");

  if (allowActions) {
    container.querySelectorAll(".status-action").forEach((button) => {
      button.addEventListener("click", async () => {
        const { orderId, status } = button.dataset;
        if (!orderId || !status) return;
        try {
          await updateDoc(doc(db, "orders", orderId), { status });
        } catch (error) {
          console.error("更新訂單狀態失敗:", error);
          alert("更新失敗，請稍後再試。");
        }
      });
    });
  }
}

function padDateValue(value) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${padDateValue(date.getMonth() + 1)}-${padDateValue(date.getDate())}`;
}

function setDefaultAnalyticsRange() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 29);

  analyticsStartDate.value = toDateInputValue(start);
  analyticsEndDate.value = toDateInputValue(today);
}

function getAnalyticsDateRange() {
  const startValue = analyticsStartDate.value || toDateInputValue(new Date(Date.now() - 29 * 86400000));
  const endValue = analyticsEndDate.value || toDateInputValue(new Date());

  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T23:59:59`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const today = new Date();
    return { start: new Date(today), end: new Date(today) };
  }

  if (start > end) {
    return { start: end, end: start };
  }

  return { start, end };
}

function getAnalyticsOrders(orders) {
  const { start, end } = getAnalyticsDateRange();
  return orders.filter((order) => {
    const date = getOrderDate(order);
    return date >= start && date <= end;
  });
}

function renderAnalytics(orders) {
  const rangeOrders = getAnalyticsOrders(orders);
  const completedOrders = rangeOrders.filter((order) => order.status === "已完成");
  const revenue = completedOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  document.getElementById("analyticsOrderCount").textContent = rangeOrders.length;
  document.getElementById("analyticsCompletedCount").textContent = completedOrders.length;
  document.getElementById("analyticsRevenue").textContent = formatMoney(revenue);
  document.getElementById("analyticsAverage").textContent = formatMoney(
    completedOrders.length ? Math.round(revenue / completedOrders.length) : 0,
  );

  const itemTotals = new Map();
  completedOrders.forEach((order) => {
    (Array.isArray(order.items) ? order.items : []).forEach((item) => {
      const name = typeof item === "string" ? item : item?.name || "未命名餐點";
      const quantity = typeof item === "string" ? 1 : Number(item?.quantity || 1);
      itemTotals.set(name, (itemTotals.get(name) || 0) + quantity);
    });
  });
  const rankedItems = [...itemTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  popularItems.innerHTML = rankedItems.length
    ? rankedItems.map(([name, quantity], index) => `
        <div class="popular-item">
          <span class="popular-rank">${index + 1}</span>
          <span class="popular-name">${name}</span>
          <strong>${quantity} 份</strong>
        </div>
      `).join("")
    : '<div class="empty-state"><p>這段期間還沒有完成訂單</p></div>';
}

function renderAll(orders) {
  renderSummary(orders);
  renderOrders(orders);
  renderHistory(orders);
  renderAnalytics(orders);
}

function startAdminListeners() {
  const stopMenuListener = onSnapshot(
    collection(db, "menu"),
    (snapshot) => {
      menuSettings.clear();
      snapshot.docs.forEach((menuDoc) => menuSettings.set(menuDoc.id, menuDoc.data()));
      renderMenuManagement();
    },
    (error) => {
      console.error("讀取菜單設定失敗:", error);
      menuManagement.textContent = "讀取菜單設定失敗，請確認 Firebase 連線與資料庫權限。";
    }
  );

  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const stopOrdersListener = onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const previousOrderCount = window.__latestOrders?.length || 0;
      window.__latestOrders = orders;
      renderAll(orders);

      if (orders.length > previousOrderCount) {
        const newestOrder = orders[0];
        if (newestOrder?.status === "未處理") {
          notifyNewOrder(newestOrder);
        }
      }
    },
    (error) => {
      console.error("讀取訂單失敗:", error);
      orderQueue.innerHTML = `
        <div class="empty-state">
          <p>資料讀取失敗，請確認 Firebase 連線與店家帳號權限。</p>
        </div>
      `;
    }
  );

  return () => {
    stopMenuListener();
    stopOrdersListener();
  };
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    navButtons.forEach((item) => item.classList.toggle("active", item === button));
    viewPanels.forEach((panel) => {
      panel.hidden = panel.dataset.viewPanel !== state.view;
    });
    pageTitle.textContent = viewLabels[state.view].title;
    pageEyebrow.textContent = viewLabels[state.view].eyebrow;
  });
});

if (historyDate) {
  historyDate.value = toDateInputValue(new Date());
}

historyDate.addEventListener("change", () => renderHistory(window.__latestOrders || []));
historyFilter.addEventListener("change", () => renderHistory(window.__latestOrders || []));

if (analyticsStartDate && analyticsEndDate && applyAnalyticsRange) {
  setDefaultAnalyticsRange();
  analyticsStartDate.addEventListener("change", () => renderAnalytics(window.__latestOrders || []));
  analyticsEndDate.addEventListener("change", () => renderAnalytics(window.__latestOrders || []));
  applyAnalyticsRange.addEventListener("click", () => renderAnalytics(window.__latestOrders || []));
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    const orders = window.__latestOrders || [];
    renderOrders(orders);
  });
});

onAuthStateChanged(auth, (user) => {
  loginScreen.hidden = Boolean(user);
  adminShell.hidden = !user;

  if (user && !stopAdminListeners) {
    stopAdminListeners = startAdminListeners();
  } else if (!user && stopAdminListeners) {
    stopAdminListeners();
    stopAdminListeners = null;
  }
});
