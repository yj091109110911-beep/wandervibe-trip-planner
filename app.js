/**
 * WanderVibe - 一日風格漫旅小工具
 * 核心業務邏輯：CRUD 管理、動態時間軸重算、預算分析、互動地圖與多人分帳
 */

// 預設台北文青美學散策一日行程資料
const DEFAULT_ITINERARY = [
  {
    id: "item-1",
    name: "大稻埕永樂市場與老桂圓花生湯",
    category: "food",
    time: "09:30",
    duration: 60,
    cost: 150,
    lat: 25.0538,
    lng: 121.5103,
    transit: "捷運北門站 3 號出口，步行約 8 分鐘",
    notes: "品味老字號傳統早餐，感受迪化街清晨的生活氣息與布莊老街。"
  },
  {
    id: "item-2",
    name: "迪化老街・合興壹玖肆柒與進成紙器",
    category: "sight",
    time: "10:45",
    duration: 75,
    cost: 220,
    lat: 25.0565,
    lng: 121.5098,
    transit: "漫步穿越霞海城隍廟前街區，步行 3 分鐘",
    notes: "欣賞巴洛克雕花洗石子洋樓，品嚐傳承七十年現蒸手工鬆糕與茶飲。"
  },
  {
    id: "item-3",
    name: "Modern Mode & Deep Island 老件選物咖啡",
    category: "food",
    time: "12:15",
    duration: 90,
    cost: 380,
    lat: 25.0602,
    lng: 121.5085,
    transit: "迪化街北段安靜巷弄中，步行約 7 分鐘",
    notes: "由法式古董鐘錶店改建之咖啡館，午餐輕食可頌與手沖單品咖啡。"
  },
  {
    id: "item-4",
    name: "赤峰街獨立選品店・小器生活與舊鐵道五金行",
    category: "shop",
    time: "14:15",
    duration: 105,
    cost: 450,
    lat: 25.0543,
    lng: 121.5204,
    transit: "搭乘公車或騎乘 YouBike 10 分鐘至中山捷運站商圈",
    notes: "昔日打鐵街蛻變為文創基地，探索日式工藝器皿、獨立二手書店與黑膠唱片。"
  },
  {
    id: "item-5",
    name: "台北當代藝術館 MOCA Taipei",
    category: "art",
    time: "16:30",
    duration: 90,
    cost: 100,
    lat: 25.0498,
    lng: 121.5192,
    transit: "由赤峰街步行至長安西路，約 6 分鐘",
    notes: "紅磚日治小學校舍活化之當代美術館，欣賞當期新媒體與觀念藝術特展。"
  },
  {
    id: "item-6",
    name: "寧夏夜市・千歲宴必比登小吃巡禮",
    category: "food",
    time: "18:30",
    duration: 90,
    cost: 280,
    lat: 25.0558,
    lng: 121.5153,
    transit: "漫步約 12 分鐘至寧夏商圈",
    notes: "圓環邊蚵仔煎、劉芋仔蛋黃芋餅與古早味豆花，為一日行程畫下完美句點。"
  }
];

// 應用狀態管理 State
const AppState = {
  items: [],
  activeFilter: 'all',
  peopleCount: 2,
  map: null,
  mapMarkers: [],
  mapPolyline: null
};

// 分類圖示與名稱字典
const CATEGORY_META = {
  food: { name: "美食咖啡", icon: "fa-utensils", badge: "badge-food" },
  sight: { name: "歷史人文", icon: "fa-landmark", badge: "badge-sight" },
  art: { name: "設計藝文", icon: "fa-palette", badge: "badge-art" },
  shop: { name: "風格選品", icon: "fa-bag-shopping", badge: "badge-shop" },
  transit: { name: "交通散步", icon: "fa-person-walking", badge: "badge-transit" }
};

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  loadFromStorage();
  initMap();
  initSortable();
  setupEventListeners();
  renderTimeline();
  recalculateAnalytics();
});

// 1. 本地儲存 LocalStorage 管理
function loadFromStorage() {
  const saved = localStorage.getItem("wandervibe_itinerary");
  if (saved) {
    try {
      AppState.items = JSON.parse(saved);
    } catch (e) {
      AppState.items = [...DEFAULT_ITINERARY];
    }
  } else {
    AppState.items = [...DEFAULT_ITINERARY];
    saveToStorage();
  }
}

function saveToStorage() {
  localStorage.setItem("wandervibe_itinerary", JSON.stringify(AppState.items));
}

// 2. Leaflet 地圖初始化與連動
function initMap() {
  const mapContainer = document.getElementById("travelMap");
  if (!mapContainer) return;

  AppState.map = L.map('travelMap').setView([25.0545, 121.5145], 14);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  }).addTo(AppState.map);

  updateMapMarkers();
}

function updateMapMarkers() {
  if (!AppState.map) return;

  // 清除舊 Marker 和 Polyline
  AppState.mapMarkers.forEach(marker => AppState.map.removeLayer(marker));
  AppState.mapMarkers = [];
  if (AppState.mapPolyline) {
    AppState.map.removeLayer(AppState.mapPolyline);
  }

  const latLngs = [];

  AppState.items.forEach((item, index) => {
    if (item.lat && item.lng) {
      const coord = [item.lat, item.lng];
      latLngs.push(coord);

      const customIcon = L.divIcon({
        className: 'custom-map-pin bg-brand-600',
        html: `<div style="background:#4A6B5D; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:12px; font-weight:bold; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);">${index + 1}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker(coord, { icon: customIcon }).addTo(AppState.map);
      marker.bindPopup(`
        <div class="p-1">
          <p class="font-bold text-sm text-gray-900">${index + 1}. ${escapeHtml(item.name)}</p>
          <p class="text-xs text-gray-600 mt-1"><i class="fa-regular fa-clock mr-1"></i>${item.time} (${item.duration}分鐘)</p>
          <p class="text-xs text-brand-600 font-semibold mt-1">預估花費: NT$ ${item.cost}</p>
        </div>
      `);
      AppState.mapMarkers.push(marker);
    }
  });

  // 連接路線折線
  if (latLngs.length > 1) {
    AppState.mapPolyline = L.polyline(latLngs, {
      color: '#4A6B5D',
      weight: 3.5,
      dashArray: '6, 8',
      opacity: 0.85
    }).addTo(AppState.map);

    AppState.map.fitBounds(AppState.mapPolyline.getBounds(), { padding: [35, 35] });
  }
}

// 3. SortableJS 拖曳排序初始化
function initSortable() {
  const listEl = document.getElementById("itineraryList");
  if (!listEl) return;

  new Sortable(listEl, {
    handle: '.drag-handle',
    animation: 200,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd: function (evt) {
      const itemEl = evt.item;
      const movedId = itemEl.getAttribute("data-id");
      const oldIndex = evt.oldIndex;
      const newIndex = evt.newIndex;

      if (oldIndex !== newIndex) {
        const movedItem = AppState.items.splice(oldIndex, 1)[0];
        AppState.items.splice(newIndex, 0, movedItem);
        saveToStorage();
        // 拖曳結束後自動依順序重新排定整天時間
        recalculateSequentialTimes();
        renderTimeline();
        recalculateAnalytics();
        updateMapMarkers();
      }
    }
  });
}

// 4. 動態渲染時間軸清單 (Render Timeline)
function renderTimeline() {
  const container = document.getElementById("itineraryList");
  if (!container) return;

  container.innerHTML = "";

  const filteredItems = AppState.activeFilter === 'all' 
    ? AppState.items 
    : AppState.items.filter(it => it.category === AppState.activeFilter);

  if (filteredItems.length === 0) {
    container.innerHTML = `
      <div class="bg-white p-8 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
        <i class="fa-solid fa-compass text-3xl mb-2 text-gray-300"></i>
        <p class="text-sm font-medium">此分類目前無排定行程</p>
        <button onclick="document.querySelector('[data-category=all]').click()" class="mt-3 text-xs text-brand-600 underline font-semibold">顯示全部行程</button>
      </div>
    `;
    return;
  }

  filteredItems.forEach((item, index) => {
    const meta = CATEGORY_META[item.category] || CATEGORY_META.sight;
    const globalIndex = AppState.items.findIndex(it => it.id === item.id) + 1;

    const card = document.createElement("div");
    card.className = "timeline-card bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-4 sm:p-5 relative transition-all group";
    card.setAttribute("data-id", item.id);

    // 計算結束時間
    const endTime = calculateEndTime(item.time, item.duration);

    card.innerHTML = `
      <!-- Connecting Dot on Timeline -->
      <div class="absolute -left-[31px] sm:-left-[39px] top-6 w-4 h-4 rounded-full bg-white border-3 border-brand-500 shadow-xs flex items-center justify-center">
        <div class="w-1.5 h-1.5 rounded-full bg-brand-600"></div>
      </div>

      <div class="flex items-start justify-between gap-3">
        <!-- Main Info -->
        <div class="flex-1">
          <!-- Badges & Time Line -->
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <span class="w-6 h-6 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center">
              ${globalIndex}
            </span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.badge}">
              <i class="fa-solid ${meta.icon} mr-1"></i>${meta.name}
            </span>
            <span class="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md flex items-center">
              <i class="fa-regular fa-clock text-gray-400 mr-1"></i>
              ${item.time} - ${endTime} (${item.duration} 分鐘)
            </span>
            <span class="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
              NT$ ${item.cost}
            </span>
          </div>

          <!-- Title -->
          <h4 class="text-base sm:text-lg font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
            ${escapeHtml(item.name)}
          </h4>

          <!-- Transit Info -->
          ${item.transit ? `
            <div class="text-xs text-gray-500 mt-1 flex items-center space-x-1.5">
              <i class="fa-solid fa-arrow-right-long text-gray-400"></i>
              <span>${escapeHtml(item.transit)}</span>
            </div>
          ` : ''}

          <!-- Notes -->
          ${item.notes ? `
            <p class="text-xs text-gray-600 mt-2 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 leading-relaxed">
              <i class="fa-solid fa-quote-left text-gray-300 mr-1 text-[10px]"></i>
              ${escapeHtml(item.notes)}
            </p>
          ` : ''}
        </div>

        <!-- Right Side: Actions (Edit, Delete, Drag Handle, Map Focus) -->
        <div class="card-actions flex flex-col items-end space-y-2 shrink-0">
          <div class="flex items-center space-x-1">
            <button onclick="focusOnMap(${item.lat}, ${item.lng}, '${escapeHtml(item.name)}')" class="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-gray-100 transition-colors" title="地圖定位">
              <i class="fa-solid fa-crosshairs text-xs"></i>
            </button>
            <button onclick="openEditModal('${item.id}')" class="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-gray-100 transition-colors" title="編輯項目">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button onclick="deleteItem('${item.id}')" class="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition-colors" title="刪除項目">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
          <!-- Drag Handle -->
          <div class="drag-handle cursor-grab active:cursor-grabbing p-1.5 text-gray-300 hover:text-gray-600 rounded" title="拖曳以排序行程">
            <i class="fa-solid fa-grip-vertical text-sm"></i>
          </div>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // 更新標題卡片景點總數標籤
  const statusTag = document.getElementById("tripStatusTag");
  if (statusTag) {
    statusTag.textContent = `${AppState.items.length} 個景點安排中`;
  }
}

// 5. 依序重新排定整天時間軸 (Sequential Timeline Auto-Alignment)
function recalculateSequentialTimes() {
  if (AppState.items.length === 0) return;

  // 以第一個行程的開始時間為基準
  let currentTime = AppState.items[0].time || "09:30";

  for (let i = 0; i < AppState.items.length; i++) {
    if (i > 0) {
      AppState.items[i].time = currentTime;
    }
    // 計算該站結束時間 + 緩衝交通時間 15 分鐘
    currentTime = addMinutes(currentTime, Number(AppState.items[i].duration || 60) + 15);
  }

  saveToStorage();
}

// 6. 即時動態統計預算與時間 (CRUD Analytics Recalculation)
function recalculateAnalytics() {
  let totalCost = 0;
  let totalDurationMinutes = 0;

  const costBreakdown = {
    food: 0,
    sight: 0,
    art: 0,
    shop: 0,
    transit: 0
  };

  AppState.items.forEach(item => {
    const cost = Number(item.cost || 0);
    totalCost += cost;
    totalDurationMinutes += Number(item.duration || 0);

    if (costBreakdown[item.category] !== undefined) {
      costBreakdown[item.category] += cost;
    } else {
      costBreakdown.sight += cost;
    }
  });

  // 加上景點間步行轉乘預估時間 (每站約15分鐘)
  if (AppState.items.length > 1) {
    totalDurationMinutes += (AppState.items.length - 1) * 15;
  }

  // 更新頂端統計 Dashboard
  const statBudget = document.getElementById("statTotalBudget");
  const statTime = document.getElementById("statTotalTime");
  const statStops = document.getElementById("statTotalStops");
  const statSteps = document.getElementById("statWalkSteps");

  if (statBudget) statBudget.textContent = `NT$ ${totalCost.toLocaleString()}`;
  if (statTime) {
    const hours = (totalDurationMinutes / 60).toFixed(1);
    statTime.textContent = `${hours} 小時`;
  }
  if (statStops) statStops.textContent = `${AppState.items.length} 站`;
  if (statSteps) {
    // 預估步數：每站約 1,600 步
    const estimatedSteps = Math.max(3000, AppState.items.length * 1650);
    statSteps.textContent = `~${estimatedSteps.toLocaleString()} 步`;
  }

  // 更新右側詳細費用分析
  const costFoodEl = document.getElementById("costFood");
  const costTicketEl = document.getElementById("costTicket");
  const costShopEl = document.getElementById("costShop");
  const costTransitEl = document.getElementById("costTransit");
  const budgetSummaryText = document.getElementById("budgetSummaryText");

  if (costFoodEl) costFoodEl.textContent = `NT$ ${costBreakdown.food.toLocaleString()}`;
  if (costTicketEl) costTicketEl.textContent = `NT$ ${(costBreakdown.art + costBreakdown.sight).toLocaleString()}`;
  if (costShopEl) costShopEl.textContent = `NT$ ${costBreakdown.shop.toLocaleString()}`;
  if (costTransitEl) costTransitEl.textContent = `NT$ ${costBreakdown.transit.toLocaleString()}`;
  if (budgetSummaryText) budgetSummaryText.textContent = `總計 NT$ ${totalCost.toLocaleString()}`;

  // 更新佔比進度條
  const safeTotal = totalCost > 0 ? totalCost : 1;
  const foodPct = ((costBreakdown.food / safeTotal) * 100).toFixed(0);
  const ticketPct = (((costBreakdown.art + costBreakdown.sight) / safeTotal) * 100).toFixed(0);
  const shopPct = ((costBreakdown.shop / safeTotal) * 100).toFixed(0);
  const transitPct = ((costBreakdown.transit / safeTotal) * 100).toFixed(0);

  const barFood = document.getElementById("barFood");
  const barTicket = document.getElementById("barTicket");
  const barShop = document.getElementById("barShop");
  const barTransit = document.getElementById("barTransit");

  if (barFood) barFood.style.width = `${foodPct}%`;
  if (barTicket) barTicket.style.width = `${ticketPct}%`;
  if (barShop) barShop.style.width = `${shopPct}%`;
  if (barTransit) barTransit.style.width = `${transitPct}%`;

  // 多人分帳連動
  updateSplitBillDisplay(totalCost);
}

// 7. 多人分帳連動計算
function updateSplitBillDisplay(totalCost) {
  const syncCheckbox = document.getElementById("syncWithTotalCheckbox");
  const totalAmountInput = document.getElementById("splitTotalAmount");
  const peopleInput = document.getElementById("splitPeopleCount");
  const perPersonDisplay = document.getElementById("splitPerPersonDisplay");

  if (!totalAmountInput || !perPersonDisplay) return;

  if (syncCheckbox && syncCheckbox.checked && totalCost !== undefined) {
    totalAmountInput.value = totalCost;
  }

  const amount = Number(totalAmountInput.value || 0);
  const count = Number(peopleInput ? peopleInput.value : 2) || 1;
  const perPerson = Math.ceil(amount / count);

  perPersonDisplay.textContent = `NT$ ${perPerson.toLocaleString()}`;
}

// 8. CRUD 操作：Create & Update
function openAddModal() {
  document.getElementById("modalTitle").innerHTML = `<i class="fa-solid fa-location-dot text-brand-600"></i><span>新增行程項目</span>`;
  document.getElementById("itemForm").reset();
  document.getElementById("editItemId").value = "";

  // 預設時間：最後一個項目的結束時間 + 15 分鐘
  if (AppState.items.length > 0) {
    const lastItem = AppState.items[AppState.items.length - 1];
    document.getElementById("inputTime").value = calculateEndTime(lastItem.time, Number(lastItem.duration) + 15);
  } else {
    document.getElementById("inputTime").value = "09:30";
  }

  document.getElementById("itemModal").classList.remove("hidden");
}

function openEditModal(id) {
  const item = AppState.items.find(it => it.id === id);
  if (!item) return;

  document.getElementById("modalTitle").innerHTML = `<i class="fa-solid fa-pen text-amber-600"></i><span>編輯行程項目</span>`;
  document.getElementById("editItemId").value = item.id;
  document.getElementById("inputName").value = item.name;
  document.getElementById("inputCategory").value = item.category;
  document.getElementById("inputTime").value = item.time;
  document.getElementById("inputDuration").value = item.duration;
  document.getElementById("inputCost").value = item.cost;
  document.getElementById("inputLat").value = item.lat || 25.0545;
  document.getElementById("inputLng").value = item.lng || 121.5145;
  document.getElementById("inputTransit").value = item.transit || "";
  document.getElementById("inputNotes").value = item.notes || "";

  document.getElementById("itemModal").classList.remove("hidden");
}

function handleSaveItem(e) {
  e.preventDefault();

  const editId = document.getElementById("editItemId").value;
  const name = document.getElementById("inputName").value.trim();
  const category = document.getElementById("inputCategory").value;
  const time = document.getElementById("inputTime").value;
  const duration = Number(document.getElementById("inputDuration").value);
  const cost = Number(document.getElementById("inputCost").value);
  const lat = parseFloat(document.getElementById("inputLat").value) || 25.0545;
  const lng = parseFloat(document.getElementById("inputLng").value) || 121.5145;
  const transit = document.getElementById("inputTransit").value.trim();
  const notes = document.getElementById("inputNotes").value.trim();

  if (editId) {
    // Update 現有項目
    const index = AppState.items.findIndex(it => it.id === editId);
    if (index !== -1) {
      AppState.items[index] = {
        ...AppState.items[index],
        name, category, time, duration, cost, lat, lng, transit, notes
      };
    }
  } else {
    // Create 新項目
    const newItem = {
      id: "item-" + Date.now(),
      name, category, time, duration, cost, lat, lng, transit, notes
    };
    AppState.items.push(newItem);
  }

  saveToStorage();
  document.getElementById("itemModal").classList.add("hidden");
  renderTimeline();
  recalculateAnalytics();
  updateMapMarkers();
}

// 9. CRUD 操作：Delete
function deleteItem(id) {
  const item = AppState.items.find(it => it.id === id);
  const name = item ? item.name : "此項目";
  if (confirm(`確定要從行程中移除「${name}」嗎？移除後系統將自動重新計算總預算與時間。`)) {
    AppState.items = AppState.items.filter(it => it.id !== id);
    saveToStorage();
    renderTimeline();
    recalculateAnalytics();
    updateMapMarkers();
  }
}

// 10. 事件監聽 Setup
function setupEventListeners() {
  // Modal 開關
  document.getElementById("addItemBtn").addEventListener("click", openAddModal);
  document.getElementById("quickAddBottomBtn").addEventListener("click", openAddModal);
  document.getElementById("closeModalBtn").addEventListener("click", () => {
    document.getElementById("itemModal").classList.add("hidden");
  });
  document.getElementById("cancelModalBtn").addEventListener("click", () => {
    document.getElementById("itemModal").classList.add("hidden");
  });
  document.getElementById("itemForm").addEventListener("submit", handleSaveItem);

  // 分帳 Modal
  document.getElementById("openSplitBillBtn").addEventListener("click", () => {
    document.getElementById("splitBillModal").classList.remove("hidden");
    recalculateAnalytics();
  });
  document.getElementById("closeSplitBillBtn").addEventListener("click", () => {
    document.getElementById("splitBillModal").classList.add("hidden");
  });
  document.getElementById("confirmSplitBillBtn").addEventListener("click", () => {
    document.getElementById("splitBillModal").classList.add("hidden");
  });

  // 人數加減
  document.getElementById("incPersonBtn").addEventListener("click", () => {
    const input = document.getElementById("splitPeopleCount");
    input.value = Math.min(20, Number(input.value || 1) + 1);
    updateSplitBillDisplay();
  });
  document.getElementById("decPersonBtn").addEventListener("click", () => {
    const input = document.getElementById("splitPeopleCount");
    input.value = Math.max(1, Number(input.value || 2) - 1);
    updateSplitBillDisplay();
  });
  document.getElementById("splitTotalAmount").addEventListener("input", () => updateSplitBillDisplay());
  document.getElementById("splitPeopleCount").addEventListener("input", () => updateSplitBillDisplay());

  // 分類篩選 Filter
  const filterBtns = document.querySelectorAll("#categoryFilterGroup .filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active-filter"));
      btn.classList.add("active-filter");
      AppState.activeFilter = btn.getAttribute("data-category");
      renderTimeline();
    });
  });

  // 時間校準按鈕
  document.getElementById("recalculateScheduleBtn").addEventListener("click", () => {
    recalculateSequentialTimes();
    renderTimeline();
    recalculateAnalytics();
    alert("已依照順序重新校準整天時間軸！每站之間已自動安排 15 分鐘交通與餘裕時間。");
  });

  // 恢復預設
  document.getElementById("resetDefaultBtn").addEventListener("click", () => {
    if (confirm("是否要重置回預設的「台北文青設計一日漫遊」完整範本？")) {
      AppState.items = JSON.parse(JSON.stringify(DEFAULT_ITINERARY));
      saveToStorage();
      renderTimeline();
      recalculateAnalytics();
      updateMapMarkers();
    }
  });

  // 全地圖視野
  document.getElementById("fitMapBoundsBtn").addEventListener("click", () => {
    if (AppState.mapPolyline) {
      AppState.map.fitBounds(AppState.mapPolyline.getBounds(), { padding: [35, 35] });
    }
  });

  // 列印 / 匯出 PDF
  document.getElementById("exportPdfBtn").addEventListener("click", () => {
    window.print();
  });

  // 行程主題標題自訂
  document.getElementById("tripTitleDisplay").addEventListener("click", () => {
    const current = document.querySelector("#tripTitleDisplay span").textContent;
    const newTitle = prompt("請輸入自訂的一日旅程主題名稱：", current);
    if (newTitle && newTitle.trim()) {
      document.querySelector("#tripTitleDisplay span").textContent = newTitle.trim();
    }
  });
}

// 11. 地圖視角聚焦到特定點
function focusOnMap(lat, lng, name) {
  if (!AppState.map) return;
  AppState.map.flyTo([lat, lng], 16, { animate: true, duration: 1 });

  const marker = AppState.mapMarkers.find(m => {
    const pos = m.getLatLng();
    return Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001;
  });

  if (marker) {
    marker.openPopup();
  }
}

// 輔助函式：計算結束時間
function calculateEndTime(startTimeStr, durationMinutes) {
  if (!startTimeStr) return "";
  return addMinutes(startTimeStr, durationMinutes);
}

function addMinutes(timeStr, minutes) {
  const parts = timeStr.split(":");
  let totalMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + parseInt(minutes, 10);
  // 防止跨日超標
  totalMin = totalMin % (24 * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// 輔助函式：防止 XSS
function escapeHtml(string) {
  const div = document.createElement('div');
  div.innerText = string;
  return div.innerHTML;
}
