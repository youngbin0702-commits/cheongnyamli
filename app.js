// app.js
import { marketData } from './data.js';
import {
  renderCategoryShortcuts,
  renderCategoryList,
  renderStoreDetail,
  renderSearchScreen,
  renderSearchResults,
  renderFavoritesScreen,
  renderRecentStoresScreen,
  renderPickupScreen,
  renderMyOrdersScreen
} from './renderers.js';
import { getEmojiForProduct } from './emoji.js';

// ==================== 카테고리 매핑 ====================
const categoryMap = {
  '정육': { emoji: '🥩', color: 'red', keywords: ['정육점'] },
  '수산': { emoji: '🐟', color: 'blue', keywords: ['수산물'] },
  '청과/야채': { emoji: '🥬', color: 'green', keywords: ['청과물', '농산물'] },
  '반찬/김치': { emoji: '🍚', color: 'yellow', keywords: ['반찬/김치', '가공식품'] },
  '음식점': { emoji: '🍲', color: 'purple', keywords: ['음식점(한식)', '음식점(간식/디저트)', '음식점(제과제빵)', '음식점(카페/음료)'] },
  '건강식품': { emoji: '🌿', color: 'teal', keywords: ['건강식품', '한약재'] },
  '생활용품': { emoji: '🛍️', color: 'pink', keywords: ['생활용품(잡화)', '생활용품(의류/패션)', '철물'] },
  '기타': { emoji: '🏪', color: 'gray', keywords: ['서비스', '편의시설'] }
};

// ==================== 데이터 가공 ====================
const storeData = marketData.map(store => {
  const productNames = (store.main_product || '').split(',').map(p => p.trim()).filter(Boolean);
  const mainTags = productNames.slice(0, 2).map(tag => `#${tag}`);

  const products = productNames.map((productName, index) => ({
    id: `${store.고유ID}-${index}`,
    name: productName,
    price: Math.floor(Math.random() * (300 - 50) + 50) * 100, // 데모용 랜덤 가격
    img: `https://placehold.co/100x100/E0E7FF/4338CA?text=${encodeURIComponent(productName.charAt(0))}`
  }));

  return {
    id: store.고유ID,
    name: store.가게이름,
    category: store.가게분류,
    mainTags,
    rating: (Math.random() * (5.0 - 4.0) + 4.0).toFixed(1),
    orders: Math.floor(Math.random() * 500) + 10,
    reviews: [],
    products,
    description: store.특징,
    url: store.url
  };
});

// ==================== 상태 ====================
let shoppingCart = {};
let currentCategorySort = 'default';
let completedOrders = [];
let favoriteStores = [];
let userRecipes = [];
let recentlyViewedStores = [];
let notifications = [];

// ==================== 지도 URL 관리 ====================
const DEFAULT_MAP_URL = 'https://transcendent-crisp-6ebea8.netlify.app/';

function getCleanUrl(url) {
  try {
    const urlObject = new URL(url);
    return urlObject.origin + urlObject.pathname;
  } catch (e) {
    return url;
  }
}
function getStoredMapUrl() {
  const urlParam = new URLSearchParams(location.search).get('map');
  if (urlParam) return urlParam;
  return localStorage.getItem('ddmap.marketUrl') || DEFAULT_MAP_URL;
}
function applyMarketMapUrl(url) {
  const frame = document.getElementById('marketMapFrame');
  const newTabLink = document.getElementById('openMapNewTab');
  const loadingIndicator = document.getElementById('mapLoading');

  loadingIndicator.style.display = 'flex';
  frame.style.display = 'none';

  frame.src = 'about:blank';
  setTimeout(() => {
    frame.src = url;
    newTabLink.href = url;
  }, 50);
}
function setMarketMapUrl(url) {
  try {
    const cleanUrl = getCleanUrl(url);
    localStorage.setItem('ddmap.marketUrl', cleanUrl);
    applyMarketMapUrl(cleanUrl);
    showToast('시장 지도 URL이 성공적으로 변경되었습니다.');
  } catch (e) {
    showMessage('올바른 URL 형식을 입력해 주세요. (예: https://example.com)');
  }
}

// ==================== UI 헬퍼 ====================
function showMessage(message) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content text-center">
      <p class="text-gray-800 text-lg mb-6">${message}</p>
      <button onclick="this.closest('.modal-overlay').remove()" class="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">확인</button>
    </div>`;
  document.getElementById('modalContainer').appendChild(modal);
}
function showPromptBox(title, message, callback) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="text-xl font-bold mb-4">${title}</h3>
      <p class="text-gray-600 mb-4">${message}</p>
      <input type="text" id="promptInput" value="${getStoredMapUrl()}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4">
      <div class="flex justify-end space-x-2">
        <button onclick="this.closest('.modal-overlay').remove()" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">취소</button>
        <button id="promptConfirmBtn" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">확인</button>
      </div>
    </div>`;
  document.getElementById('modalContainer').appendChild(modal);
  document.getElementById('promptConfirmBtn').addEventListener('click', () => {
    const inputValue = document.getElementById('promptInput').value;
    callback(inputValue);
    modal.remove();
  });
}
function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ==================== 알림 ====================
function loadNotificationsFromStorage() {
  const storedNotifications = localStorage.getItem('cheongnyamri.notifications');
  notifications = storedNotifications ? JSON.parse(storedNotifications) : [];
  updateNotificationIndicator();
}
function saveNotificationsToStorage() {
  localStorage.setItem('cheongnyamri.notifications', JSON.stringify(notifications));
}
function updateNotificationIndicator() {
  const dot = document.getElementById('notification-dot');
  const hasUnread = notifications.some(n => !n.read);
  dot.classList.toggle('hidden', !hasUnread);
}
function showNotificationModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  let notificationsHtml = notifications.length === 0
    ? `<p class="text-center text-gray-500 py-10">새로운 알림이 없습니다.</p>`
    : notifications.map(n => `
        <div class="p-3 border-b last:border-b-0 ${!n.read ? 'bg-indigo-50' : ''}">
          <p class="text-sm text-gray-800">${n.message}</p>
        </div>
      `).join('');
  modal.innerHTML = `
    <div class="modal-content flex flex-col h-full max-h-[80vh]">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">알림</h3>
        <button onclick="this.closest('.modal-overlay').remove()"><i class="ph ph-x text-2xl"></i></button>
      </div>
      <div class="flex-1 overflow-y-auto -mx-6 px-6">${notificationsHtml}</div>
    </div>`;
  document.getElementById('modalContainer').appendChild(modal);
  notifications.forEach(n => n.read = true);
  saveNotificationsToStorage();
  updateNotificationIndicator();
}

// ==================== 장바구니 ====================
function updateCartCountIndicator() {
  const countElement = document.getElementById('cart-item-count');
  let totalCount = 0;
  for (const storeId in shoppingCart) {
    for (const cartItemId in shoppingCart[storeId].items) {
      totalCount += shoppingCart[storeId].items[cartItemId].quantity;
    }
  }
  countElement.textContent = totalCount;
  countElement.classList.toggle('hidden', totalCount === 0);
}
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return hash;
}
function showAddToCartModal(productData) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="text-xl font-bold mb-2">${productData.productName}</h3>
      <p class="text-gray-600 mb-4">상품을 장바구니에 담습니다.</p>
      <input type="text" id="itemRequestInput" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4" placeholder="특별 요청사항 (예: 찌개용으로 썰어주세요)">
      <div class="flex flex-col space-y-2">
        <button id="confirmAddToCartBtn" class="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">장바구니 담기</button>
        <button onclick="this.closest('.modal-overlay').remove()" class="w-full px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">취소</button>
      </div>
    </div>`;
  document.getElementById('modalContainer').appendChild(modal);
  document.getElementById('confirmAddToCartBtn').addEventListener('click', () => {
    const request = document.getElementById('itemRequestInput').value.trim();
    addToCart(
      productData.storeId,
      productData.storeName,
      productData.productId,
      productData.productName,
      parseInt(productData.productPrice, 10),
      productData.productImg,
      request
    );
    modal.remove();
    showToast(`'${productData.productName}' 상품을 장바구니에 담았습니다!`);
  });
}
function addToCart(storeId, storeName, productId, productName, price, img, request = "") {
  if (!shoppingCart[storeId]) shoppingCart[storeId] = { storeName, items: {} };
  const cartItemId = `${productId}-${simpleHash(request)}`;
  if (shoppingCart[storeId].items[cartItemId]) {
    shoppingCart[storeId].items[cartItemId].quantity++;
  } else {
    shoppingCart[storeId].items[cartItemId] = { productId, name: productName, price, quantity: 1, img, request };
  }
  updateCartCountIndicator();
}
function updateCartItemQuantity(storeId, cartItemId, change) {
  if (shoppingCart[storeId] && shoppingCart[storeId].items[cartItemId]) {
    const item = shoppingCart[storeId].items[cartItemId];
    item.quantity += change;
    if (item.quantity <= 0) {
      delete shoppingCart[storeId].items[cartItemId];
      if (Object.keys(shoppingCart[storeId].items).length === 0) delete shoppingCart[storeId];
    }
  }
  updateCartCountIndicator();
  const existingModal = document.querySelector('.modal-overlay');
  if (existingModal) existingModal.remove();
  showCartModal();
}
function showCartModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  let cartItemsHtml = '';
  let totalPrice = 0;
  const cartIsEmpty = Object.keys(shoppingCart).length === 0;

  if (cartIsEmpty) {
    cartItemsHtml = `<p class="text-center text-gray-500 py-10">장바구니가 비어 있습니다.</p>`;
  } else {
    for (const storeId in shoppingCart) {
      const store = shoppingCart[storeId];
      let storeItemsHtml = '';
      for (const cartItemId in store.items) {
        const item = store.items[cartItemId];
        totalPrice += item.price * item.quantity;
        const requestHtml = item.request ? `<p class="text-xs text-indigo-600 bg-indigo-50 rounded px-2 py-1 mt-1">요청: ${item.request}</p>` : '';
        storeItemsHtml += `
          <div class="flex items-start py-3 border-b last:border-b-0">
            <img src="${item.img}" alt="${item.name}" class="w-16 h-16 rounded-md mr-4">
            <div class="flex-1">
              <p class="font-semibold text-gray-800">${getEmojiForProduct(item.name)} ${item.name}</p>
              <p class="text-gray-600 font-bold">${item.price.toLocaleString()}원</p>
              ${requestHtml}
            </div>
            <div class="flex items-center space-x-2">
              <button class="cart-quantity-btn" data-store-id="${storeId}" data-cart-item-id="${cartItemId}" data-change="-1">-</button>
              <span class="w-8 text-center font-semibold">${item.quantity}</span>
              <button class="cart-quantity-btn" data-store-id="${storeId}" data-cart-item-id="${cartItemId}" data-change="1">+</button>
            </div>
            <button class="ml-4 text-gray-400 hover:text-red-500 cart-delete-btn" data-store-id="${storeId}" data-cart-item-id="${cartItemId}">
              <i class="ph ph-x-circle text-2xl"></i>
            </button>
          </div>`;
      }

      cartItemsHtml += `
        <div class="mb-4">
          <button class="flex items-center font-bold text-lg mb-2 store-link-from-cart" data-store-id="${storeId}">
            ${store.storeName} <i class="ph ph-caret-right ml-1"></i>
          </button>
          <div class="bg-gray-50 p-2 rounded-lg">${storeItemsHtml}</div>
        </div>`;
    }
  }

  modal.innerHTML = `
    <div class="modal-content flex flex-col h-full max-h-[80vh]">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">장바구니</h3>
        <button onclick="this.closest('.modal-overlay').remove()"><i class="ph ph-x text-2xl"></i></button>
      </div>
      <div class="flex-1 overflow-y-auto pr-2">${cartItemsHtml}</div>
      <div class="border-t pt-4 mt-4">
        <div class="text-right font-bold text-xl mb-4">
          총 결제금액: <span class="text-indigo-600">${totalPrice.toLocaleString()}원</span>
        </div>
        <div class="flex flex-col space-y-2">
          <button id="checkoutBtn" class="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors ${cartIsEmpty ? 'opacity-50 cursor-not-allowed' : ''}" ${cartIsEmpty ? 'disabled' : ''}>
            결제하고 픽업하기
          </button>
        </div>
      </div>
    </div>`;
  document.getElementById('modalContainer').appendChild(modal);

  modal.addEventListener('click', e => {
    const quantityBtn = e.target.closest('.cart-quantity-btn');
    const deleteBtn = e.target.closest('.cart-delete-btn');
    const storeLink = e.target.closest('.store-link-from-cart');

    if (quantityBtn) {
      const { storeId, cartItemId, change } = quantityBtn.dataset;
      updateCartItemQuantity(storeId, cartItemId, parseInt(change));
    } else if (deleteBtn) {
      const { storeId, cartItemId } = deleteBtn.dataset;
      updateCartItemQuantity(storeId, cartItemId, -Infinity);
    } else if (storeLink) {
      const { storeId } = storeLink.dataset;
      modal.remove();
      showScreen('storeDetailScreen', { storeId: parseInt(storeId, 10), from: 'homeScreen' });
    }
  });

  if (!cartIsEmpty) {
    document.getElementById('checkoutBtn').addEventListener('click', handleCheckout);
  }
}

// ==================== 화면 전환 ====================
function showScreen(screenId, param = null) {
  const targetScreen = document.getElementById(screenId);
  if (!targetScreen) {
    console.error(`showScreen: screen with id "${screenId}" not found.`);
    return;
  }

  const appContainer = document.getElementById('appContainer');
  document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
  targetScreen.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === screenId);
  });

  if (screenId === 'mapScreen') {
    appContainer.classList.remove('max-w-lg');
    const storedUrl = getStoredMapUrl();
    applyMarketMapUrl(storedUrl);
    if (window.innerHeight > window.innerWidth) {
      showToast("최적의 지도 경험을 위해 기기를 가로로 돌려주세요.");
    }
  } else {
    appContainer.classList.add('max-w-lg');
  }

  switch (screenId) {
    case 'searchScreen': renderSearchScreen(storeData); break;
    case 'pickupScreen': renderPickupScreen(completedOrders); break;
    case 'myOrdersScreen': renderMyOrdersScreen(completedOrders); break;
    case 'favoritesScreen': renderFavoritesScreen(storeData, favoriteStores); break;
    case 'recentStoresScreen': renderRecentStoresScreen(storeData, recentlyViewedStores, formatRelativeDate); break;
    case 'categoryListScreen': if (param) renderCategoryList({ categoryKey: param, categoryMap, storeData, currentCategorySort }); break;
    case 'storeDetailScreen': if (param) renderStoreDetail({ storeData, ...param, renderFavoriteButtons, trackViewedStore }); break;
    case 'smartShoppingScreen':
      document.getElementById('smartSearchResultsContainer').innerHTML = '<p class="text-center text-gray-500 py-10">찾고 싶은 상품을 쉼표(,)로 구분하여 검색해 보세요.<br>또는 저장된 레시피를 이용해 보세요.</p>';
      document.getElementById('smartSearchInput').value = '';
      renderMyRecipes();
      break;
  }
}

// ==================== 검색/길찾기 ====================
function navigateToStore(url) {
  if (url && url !== 'null' && url.trim() !== '') {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    window.open(fullUrl, '_blank');
  } else {
    showMessage('길찾기 정보가 없는 상점입니다.');
  }
}

// ==================== 스마트 장보기 & 즐겨찾기 ====================
function handleSmartSearch() {
  const searchInput = document.getElementById('smartSearchInput');
  const container = document.getElementById('smartSearchResultsContainer');
  const searchTerms = searchInput.value.split(',')
    .map(term => term.trim().split(' ')[0])
    .filter(term => term.length > 0);

  if (searchTerms.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500 py-10">찾고 싶은 상품을 쉼표(,)로 구분하여 검색해 보세요.<br>또는 저장된 레시피를 이용해 보세요.</p>';
    return;
  }

  let resultsHtml = '';
  searchTerms.forEach(term => {
    const matchingProducts = [];
    storeData.forEach(store => {
      store.products.forEach(product => {
        if (product.name.toLowerCase().includes(term.toLowerCase())) {
          matchingProducts.push({
            ...product,
            storeId: store.id,
            storeName: store.name,
            rating: store.rating,
            reviews: store.reviews.length
          });
        }
      });
    });

    matchingProducts.sort((a, b) => a.price - b.price);

    resultsHtml += `
      <div class="border rounded-lg mb-3 overflow-hidden">
        <button class="smart-accordion-toggle w-full p-4 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center">
          <span class="font-bold text-lg text-indigo-700">'${term}' 검색 결과</span>
          <i class="ph ph-caret-down text-xl transition-transform"></i>
        </button>
        <div class="smart-accordion-content hidden bg-white p-4 space-y-3">`;

    if (matchingProducts.length > 0) {
      matchingProducts.forEach(product => {
        resultsHtml += `
          <div class="flex items-center bg-white p-3 rounded-lg border">
            <div class="flex-1">
              <button class="font-semibold text-gray-800 hover:underline store-link" data-store-id="${product.storeId}" data-from="smartShoppingScreen">
                ${product.storeName}
              </button>
              <div class="text-sm text-gray-700 mt-1">
                ${getEmojiForProduct(product.name)} ${product.name}
              </div>
              <div class="flex items-center text-sm text-gray-500 mt-1">
                <i class="ph ph-star text-yellow-400 mr-1"></i> ${product.rating}
                <span class="mx-2">|</span>
                <span class="font-bold text-indigo-600">${product.price.toLocaleString()}원</span>
              </div>
            </div>
            <button class="add-to-cart-btn ml-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
              data-store-id="${product.storeId}"
              data-store-name="${product.storeName}"
              data-product-id="${product.id}"
              data-product-name="${product.name}"
              data-product-price="${product.price}"
              data-product-img="${product.img}">
              담기
            </button>
          </div>`;
      });
    } else {
      resultsHtml += `<p class="text-center text-gray-500 py-4">'${term}'을(를) 판매하는 가게를 찾을 수 없습니다.</p>`;
    }

    resultsHtml += `</div></div>`;
  });
  container.innerHTML = resultsHtml;
}

function renderFavoriteButtons(storeId) {
  const container = document.getElementById('favoriteButtonsContainer');
  if (!container) return;

  const storeIdNum = parseInt(storeId, 10);
  const isFavorited = favoriteStores.includes(storeIdNum);

  if (isFavorited) {
    container.innerHTML = `<button class="remove-favorite-btn text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-2 rounded-lg hover:bg-gray-300" data-store-id="${storeIdNum}">관심 가게 삭제</button>`;
  } else {
    container.innerHTML = `<button class="add-favorite-btn text-sm font-semibold text-indigo-600 bg-indigo-100 px-3 py-2 rounded-lg hover:bg-indigo-200" data-store-id="${storeIdNum}">관심 가게 등록</button>`;
  }
}
function toggleFavorite(storeId) {
  const storeIdNum = parseInt(storeId, 10);
  const index = favoriteStores.indexOf(storeIdNum);
  if (index > -1) favoriteStores.splice(index, 1);
  else favoriteStores.push(storeIdNum);

  if (document.getElementById('storeDetailScreen').classList.contains('active')) {
    renderFavoriteButtons(storeIdNum);
  }
  if (document.getElementById('favoritesScreen').classList.contains('active')) {
    renderFavoritesScreen(storeData, favoriteStores);
  }
}

// ==================== 레시피 ====================
function loadRecipesFromStorage() {
  const recipes = localStorage.getItem('cheongnyamri.recipes');
  userRecipes = recipes ? JSON.parse(recipes) : [];
}
function saveRecipesToStorage() {
  localStorage.setItem('cheongnyamri.recipes', JSON.stringify(userRecipes));
}
function renderMyRecipes() {
  const container = document.getElementById('myRecipesList');
  container.innerHTML = '';
  if (userRecipes.length === 0) {
    container.innerHTML = `<p class="text-center text-sm text-gray-500 py-2">저장된 레시피가 없습니다.</p>`;
  } else {
    userRecipes.forEach(recipe => {
      const recipeEl = document.createElement('div');
      recipeEl.className = 'flex justify-between items-center bg-gray-100 p-3 rounded-lg';
      recipeEl.innerHTML = `
        <button class="font-semibold text-left flex-1 load-recipe-btn" data-recipe-id="${recipe.id}">${recipe.name}</button>
        <button class="edit-recipe-btn p-1 text-gray-500 hover:text-indigo-600" data-recipe-id="${recipe.id}"><i class="ph ph-pencil-simple"></i></button>
      `;
      container.appendChild(recipeEl);
    });
  }
}
function showRecipeModal(recipeId = null) {
  showScreen('recipeModalScreen');
  const titleEl = document.getElementById('recipeModalTitle');
  const nameInput = document.getElementById('recipeNameInput');
  const idInput = document.getElementById('recipeIdInput');
  const ingredientsContainer = document.getElementById('recipeIngredientsContainer');
  const deleteBtn = document.getElementById('deleteRecipeBtn');

  ingredientsContainer.innerHTML = '';

  if (recipeId) {
    const recipe = userRecipes.find(r => r.id === recipeId);
    titleEl.textContent = '레시피 수정';
    nameInput.value = recipe.name;
    idInput.value = recipe.id;
    recipe.ingredients.forEach(ing => addIngredientField(ing.name, ing.request));
    deleteBtn.classList.remove('hidden');
  } else {
    titleEl.textContent = '새 레시피 추가';
    nameInput.value = '';
    idInput.value = '';
    addIngredientField();
    deleteBtn.classList.add('hidden');
  }
}
function addIngredientField(name = '', request = '') {
  const container = document.getElementById('recipeIngredientsContainer');
  const div = document.createElement('div');
  div.className = 'flex items-center space-x-2 bg-white p-2 border rounded-lg';
  div.innerHTML = `
    <div class="flex-1">
      <input type="text" class="recipe-ingredient-name w-full text-sm p-1 border-b" placeholder="재료 (예: 김치 1포기)" value="${name}">
      <input type="text" class="recipe-ingredient-request w-full text-xs p-1 text-gray-500" placeholder="요청사항 (예: 찌개용으로 썰어주세요)" value="${request}">
    </div>
    <button class="remove-ingredient-btn text-red-500 p-1"><i class="ph ph-trash"></i></button>
  `;
  container.appendChild(div);
}
function saveRecipe() {
  const recipeId = document.getElementById('recipeIdInput').value;
  const recipeName = document.getElementById('recipeNameInput').value.trim();
  if (!recipeName) {
    showMessage('레시피 이름을 입력해주세요.');
    return;
  }

  const ingredients = [];
  document.querySelectorAll('#recipeIngredientsContainer > div').forEach(div => {
    const name = div.querySelector('.recipe-ingredient-name').value.trim();
    const request = div.querySelector('.recipe-ingredient-request').value.trim();
    if (name) ingredients.push({ name, request });
  });

  if (ingredients.length === 0) {
    showMessage('하나 이상의 재료를 입력해주세요.');
    return;
  }

  if (recipeId) {
    const recipeIndex = userRecipes.findIndex(r => r.id === recipeId);
    userRecipes[recipeIndex] = { ...userRecipes[recipeIndex], name: recipeName, ingredients };
  } else {
    const newRecipe = { id: `recipe-${Date.now()}`, name: recipeName, ingredients };
    userRecipes.push(newRecipe);
  }

  saveRecipesToStorage();
  showScreen('smartShoppingScreen');
}
function deleteRecipe() {
  const recipeId = document.getElementById('recipeIdInput').value;
  userRecipes = userRecipes.filter(r => r.id !== recipeId);
  saveRecipesToStorage();
  showScreen('smartShoppingScreen');
}

// ==================== 최근 본 가게 ====================
function loadRecentlyViewedFromStorage() {
  const recent = localStorage.getItem('cheongnyamri.recentStores');
  recentlyViewedStores = recent ? JSON.parse(recent) : [];
}
function saveRecentlyViewedToStorage() {
  localStorage.setItem('cheongnyamri.recentStores', JSON.stringify(recentlyViewedStores));
}
function trackViewedStore(storeId) {
  recentlyViewedStores = recentlyViewedStores.filter(item => item.storeId !== storeId);
  recentlyViewedStores.unshift({ storeId: storeId, viewedAt: new Date().toISOString() });
  recentlyViewedStores = recentlyViewedStores.slice(0, 20);
  saveRecentlyViewedToStorage();
}
function formatRelativeDate(dateString) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const now = new Date();
  const viewedDate = new Date(dateString);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (viewedDate >= today) return '오늘';
  if (viewedDate >= yesterday) return '어제';

  return `${viewedDate.getMonth() + 1}월 ${viewedDate.getDate()}일 ${days[viewedDate.getDay()]}요일`;
}

// ==================== 결제/주문 ====================
function handleCheckout() {
  const orderId = `CNY-${Date.now()}`;
  const date = new Date();
  let totalPrice = 0;

  const orderCart = JSON.parse(JSON.stringify(shoppingCart));
  for (const storeId in orderCart) {
    for (const cartItemId in orderCart[storeId].items) {
      const item = orderCart[storeId].items[cartItemId];
      totalPrice += item.price * item.quantity;
    }
  }

  const newOrder = {
    orderId,
    cart: orderCart,
    date: date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }),
    totalPrice
  };
  completedOrders.push(newOrder);

  // 알림 생성
  for (const storeId in orderCart) {
    const store = orderCart[storeId];
    const firstItem = Object.values(store.items)[0];
    const totalItems = Object.keys(store.items).length;
    const message = `'${store.storeName}'에서 ${firstItem.name}` + (totalItems > 1 ? ` 외 ${totalItems - 1}건` : '') + ` 구매가 완료되었습니다. (총 ${newOrder.totalPrice.toLocaleString()}원)`;
    const newNotification = { id: Date.now() + parseInt(storeId), message, read: false };
    notifications.unshift(newNotification);
    showToast(message);
  }
  saveNotificationsToStorage();
  updateNotificationIndicator();

  shoppingCart = {};
  updateCartCountIndicator();

  const modal = document.querySelector('.modal-overlay');
  if (modal) modal.remove();

  showScreen('pickupScreen');
}

// ==================== 이벤트 리스너 & 초기화 ====================
function setupAllEventListeners() {
  // 검색 입력
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim().replace(/\s/g, '');
    if (query === "") {
      renderSearchResults(storeData);
      return;
    }
    const filteredStores = storeData.filter(store => {
      const storeName = (store.name || '').toLowerCase().replace(/\s/g, '');
      const products = store.products.map(p => p.name).join('').toLowerCase().replace(/\s/g, '');
      const description = (store.description || '').toLowerCase().replace(/\s/g, '');
      return storeName.includes(query) || products.includes(query) || description.includes(query);
    });
    renderSearchResults(filteredStores);
  });

  // 스마트 장보기 검색
  document.getElementById('smartSearchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSmartSearch();
  });

  // 카테고리 정렬
  document.querySelectorAll('.category-sort-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      document.querySelectorAll('.category-sort-btn').forEach(btn => btn.classList.remove('filter-active'));
      e.currentTarget.classList.add('filter-active');
      currentCategorySort = e.currentTarget.dataset.sort;
      const currentCategory = document.getElementById('categoryTitle').textContent;
      const categoryKey = Object.keys(categoryMap).find(key => categoryMap[key].keywords.includes(currentCategory)) || (currentCategory === '전체 가게' ? 'all' : null);
      renderCategoryList({ categoryKey: categoryKey || currentCategory, categoryMap, storeData, currentCategorySort });
    });
  });

  // 레시피 버튼류
  document.getElementById('addIngredientBtn').addEventListener('click', () => addIngredientField());
  document.getElementById('saveRecipeBtn').addEventListener('click', saveRecipe);
  document.getElementById('deleteRecipeBtn').addEventListener('click', deleteRecipe);
  document.getElementById('recipeIngredientsContainer').addEventListener('click', e => {
    if (e.target.closest('.remove-ingredient-btn')) {
      e.target.closest('.flex').remove();
    }
  });

  // 전역 클릭 위임
  document.body.addEventListener('click', (e) => {
    const addToCartBtn = e.target.closest('.add-to-cart-btn');
    const addFavoriteBtn = e.target.closest('.add-favorite-btn');
    const removeFavoriteBtn = e.target.closest('.remove-favorite-btn');
    const storeLink = e.target.closest('.store-link');
    const navigateBtn = e.target.closest('.navigate-btn');
    const accordionToggle = e.target.closest('.smart-accordion-toggle');
    const loadRecipeBtn = e.target.closest('.load-recipe-btn');
    const editRecipeBtn = e.target.closest('.edit-recipe-btn');

    if (addToCartBtn) {
      showAddToCartModal(addToCartBtn.dataset);
    } else if (addFavoriteBtn) {
      toggleFavorite(addFavoriteBtn.dataset.storeId);
    } else if (removeFavoriteBtn) {
      toggleFavorite(removeFavoriteBtn.dataset.storeId);
    } else if (storeLink) {
      showScreen('storeDetailScreen', {
        storeId: parseInt(storeLink.dataset.storeId, 10),
        from: storeLink.dataset.from,
        category: storeLink.dataset.category
      });
    } else if (navigateBtn) {
      navigateToStore(navigateBtn.dataset.url);
    } else if (accordionToggle) {
      const content = accordionToggle.nextElementSibling;
      const icon = accordionToggle.querySelector('i');
      content.classList.toggle('hidden');
      icon.classList.toggle('rotate-180');
    } else if (loadRecipeBtn) {
      const recipeId = loadRecipeBtn.dataset.recipeId;
      const recipe = userRecipes.find(r => r.id === recipeId);
      const ingredientNames = recipe.ingredients.map(i => i.name).join(', ');
      document.getElementById('smartSearchInput').value = ingredientNames;
      handleSmartSearch();
    } else if (editRecipeBtn) {
      showRecipeModal(editRecipeBtn.dataset.recipeId);
    }
  });

  // 하단 네비게이션 (data-screen 있는 버튼만)
  document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const screenId = e.currentTarget.dataset.screen;
      if (screenId) showScreen(screenId);
    });
  });

  // 지도 iframe 로딩
  const frame = document.getElementById('marketMapFrame');
  frame.addEventListener('load', () => {
    document.getElementById('mapLoading').style.display = 'none';
    frame.style.display = 'block';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadRecipesFromStorage();
  loadRecentlyViewedFromStorage();
  loadNotificationsFromStorage();
  renderCategoryShortcuts(categoryMap);
  setupAllEventListeners();
  updateCartCountIndicator();
  showScreen('homeScreen');
});

// 전역 노출 (HTML inline onclicks 등과 연동)
window.showScreen = showScreen;
window.showCartModal = showCartModal;
window.showNotificationModal = showNotificationModal;
window.showRecipeModal = showRecipeModal;
window.showPromptBox = showPromptBox;
window.setMarketMapUrl = setMarketMapUrl;
