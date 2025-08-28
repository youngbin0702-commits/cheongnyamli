// renderers.js
import { getEmojiForProduct } from './emoji.js';

// 홈 카테고리 바로가기
export function renderCategoryShortcuts(categoryMap) {
  const container = document.getElementById('category-shortcut-container');
  container.innerHTML = Object.entries(categoryMap).map(([name, { emoji, color }]) => `
    <button onclick="showScreen('categoryListScreen', '${name}')" class="flex flex-col items-center space-y-2">
      <div class="w-full h-16 flex items-center justify-center bg-${color}-100 rounded-lg shadow-sm text-4xl">${emoji}</div>
      <span class="text-xs font-medium">${name}</span>
    </button>
  `).join('');
}

// 카테고리 목록
export function renderCategoryList({ categoryKey, categoryMap, storeData, currentCategorySort }) {
  const container = document.getElementById('categoryStoreListContainer');
  let stores;

  if (categoryKey === 'all') {
    document.getElementById('categoryTitle').textContent = '전체 가게';
    stores = [...storeData];
  } else {
    const categoryInfo = categoryMap[categoryKey];
    if (!categoryInfo) return;
    document.getElementById('categoryTitle').textContent = categoryKey;
    stores = storeData.filter(s => categoryInfo.keywords.includes(s.category));
  }

  container.innerHTML = '';

  switch (currentCategorySort) {
    case 'orders': stores.sort((a, b) => b.orders - a.orders); break;
    case 'rating': stores.sort((a, b) => b.rating - a.rating); break;
  }

  if (stores.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500 py-10">해당 카테고리의 가게가 없습니다.</p>`;
    return;
  }

  const uniqueStores = Array.from(new Map(stores.map(store => [store.id, store])).values());

  uniqueStores.forEach(store => {
    const tagsHtml = store.mainTags.map(tag => {
      const name = tag.replace(/^#/, '');
      return `<span class="bg-gray-200 text-gray-700 text-xs font-medium mr-2 px-2 py-1 rounded">
                ${getEmojiForProduct(name)} ${tag}
              </span>`;
    }).join('');

    const card = document.createElement('div');
    card.className = 'flex items-start bg-white p-4 rounded-lg border border-gray-200 relative cursor-pointer store-link';
    card.dataset.storeId = store.id;
    card.dataset.from = 'categoryListScreen';
    card.dataset.category = categoryKey;
    card.innerHTML = `
      <img src="https://placehold.co/100x100/E0E7FF/4338CA?text=${encodeURIComponent(store.name.charAt(0))}" alt="${store.name}" class="w-24 h-24 rounded-md mr-4">
      <div class="flex-1">
        <h3 class="font-bold text-lg text-gray-900">${store.name}</h3>
        <div class="flex items-center text-sm text-gray-600 mt-1">
          <i class="ph ph-star text-yellow-400 text-base mr-1"></i>
          <span class="font-bold">${store.rating}</span>
          <span class="mx-1">|</span>
          <span>리뷰 ${store.reviews.length}</span>
        </div>
        <div class="mt-2">${tagsHtml}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

// 가게 상세
export function renderStoreDetail({ storeData, storeId, from, category, renderFavoriteButtons, trackViewedStore }) {
  const store = storeData.find(s => s.id === storeId);
  if (!store) return;

  trackViewedStore(storeId);

  document.getElementById('storeDetailTitle').textContent = store.name;
  document.getElementById('backToCategoryBtn').onclick = () =>
    window.showScreen(from, from === 'categoryListScreen' ? category : null);

  renderFavoriteButtons(storeId);

  document.getElementById('storeDetailInfo').innerHTML = `
    <div class="flex items-center">
      <img src="https://placehold.co/120x120/E0E7FF/4338CA?text=${encodeURIComponent(store.name.charAt(0))}" alt="${store.name}" class="w-28 h-28 rounded-lg mr-4">
      <div>
        <h2 class="text-2xl font-bold">${store.name}</h2>
        <div class="flex items-center text-lg text-gray-600 mt-2">
          <i class="ph ph-star-fill text-yellow-400 text-2xl mr-1"></i>
          <span class="font-bold text-2xl">${store.rating}</span>
        </div>
        <p class="text-gray-500 mt-1">주문수 ${store.orders.toLocaleString()}</p>
      </div>
    </div>`;

  const productListContainer = document.getElementById('storeProductListContainer');
  productListContainer.innerHTML = '';
  if (store.products && store.products.length > 0) {
    store.products.forEach(product => {
      const productEl = document.createElement('div');
      productEl.className = 'flex items-center justify-between bg-gray-50 p-4 rounded-lg';
      productEl.innerHTML = `
        <div class="flex items-center">
          <img src="${product.img}" alt="${product.name}" class="w-16 h-16 rounded-md mr-4">
          <div>
            <h4 class="font-semibold text-gray-800">${getEmojiForProduct(product.name)} ${product.name}</h4>
            <p class="text-indigo-600 font-bold mt-1">${product.price.toLocaleString()}원</p>
          </div>
        </div>
        <button class="add-to-cart-btn px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          data-store-id="${store.id}"
          data-store-name="${store.name}"
          data-product-id="${product.id}"
          data-product-name="${product.name}"
          data-product-price="${product.price}"
          data-product-img="${product.img}">
          담기
        </button>`;
      productListContainer.appendChild(productEl);
    });
  } else {
    productListContainer.innerHTML = `<p class="text-center text-gray-500 py-4">등록된 상품 정보가 없습니다.</p>`;
  }

  const reviewsContainer = document.getElementById('storeReviewsContainer');
  reviewsContainer.innerHTML = `<p class="text-center text-gray-500">아직 작성된 리뷰가 없습니다.</p>`;
}

// 검색 화면/결과
export function renderSearchScreen(storeData) {
  const searchInput = document.getElementById('searchInput');
  searchInput.value = '';
  renderSearchResults(storeData);
}

export function renderSearchResults(stores) {
  const container = document.getElementById('searchResultsContainer');
  container.innerHTML = '';

  if (!stores || stores.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500 mt-8">검색 결과가 없습니다.</p>`;
    return;
  }

  const uniqueStores = Array.from(new Map(stores.map(store => [store.id, store])).values());

  uniqueStores.forEach(store => {
    const productsList = store.products
      .slice(0, 5)
      .map(p => `${getEmojiForProduct(p.name)} ${p.name}`)
      .join(', ')
      + (store.products.length > 5 ? '...' : '');

    const storeItem = document.createElement('div');
    storeItem.className = 'search-store-item';
    storeItem.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-lg font-bold text-gray-900">${store.name}</h3>
        <span class="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ml-2">${store.category}</span>
      </div>
      <p class="text-sm text-gray-700 mb-2 truncate"><b>주요상품:</b> ${productsList || '정보 없음'}</p>
      <p class="text-sm text-gray-500 mb-4">${store.description || ''}</p>
      <div class="flex justify-end gap-2 mt-auto">
        <button class="navigate-btn px-4 py-2 text-sm font-semibold bg-blue-500 text-white rounded-full hover:bg-blue-600" data-url="${store.url}">길찾기</button>
        <button class="store-link px-4 py-2 text-sm font-semibold bg-orange-500 text-white rounded-full hover:bg-orange-600" data-store-id="${store.id}" data-from="searchScreen">가게보기</button>
      </div>
    `;
    container.appendChild(storeItem);
  });
}

// 즐겨찾기
export function renderFavoritesScreen(storeData, favoriteStores) {
  const container = document.getElementById('favoritesScreen').querySelector('main');
  container.innerHTML = '';

  const favoriteStoreDetails = storeData.filter(store => favoriteStores.includes(store.id));

  if (favoriteStoreDetails.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500 p-10">관심 가게가 없습니다.</p>`;
    return;
  }

  favoriteStoreDetails.forEach(store => {
    const tagsHtml = store.mainTags.map(tag => {
      const name = tag.replace(/^#/, '');
      return `<span class="bg-gray-200 text-gray-700 text-xs font-medium mr-2 px-2 py-1 rounded">
                ${getEmojiForProduct(name)} ${tag}
              </span>`;
    }).join('');

    const card = document.createElement('div');
    card.className = 'flex items-start bg-white p-4 rounded-lg border border-gray-200 relative cursor-pointer store-link';
    card.dataset.storeId = store.id;
    card.dataset.from = 'favoritesScreen';
    card.innerHTML = `
      <img src="https://placehold.co/100x100/E0E7FF/4338CA?text=${encodeURIComponent(store.name.charAt(0))}" alt="${store.name}" class="w-24 h-24 rounded-md mr-4">
      <div class="flex-1">
        <h3 class="font-bold text-lg text-gray-900">${store.name}</h3>
        <div class="flex items-center text-sm text-gray-600 mt-1">
          <i class="ph ph-star text-yellow-400 text-base mr-1"></i>
          <span class="font-bold">${store.rating}</span>
          <span class="mx-1">|</span>
          <span>리뷰 ${store.reviews.length}</span>
        </div>
        <div class="mt-2">${tagsHtml}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

// 최근 본 가게
export function renderRecentStoresScreen(storeData, recentlyViewedStores, formatRelativeDate) {
  const container = document.getElementById('recentStoresScreen').querySelector('main');
  container.innerHTML = '';

  if (recentlyViewedStores.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500 p-10">최근 본 가게가 없습니다.</p>`;
    return;
  }

  const groupedByDate = recentlyViewedStores.reduce((acc, item) => {
    const dateKey = formatRelativeDate(item.viewedAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  for (const dateKey in groupedByDate) {
    const dateHeader = document.createElement('h2');
    dateHeader.className = 'text-md font-bold text-gray-600 pb-2 border-b';
    dateHeader.textContent = dateKey;
    container.appendChild(dateHeader);

    const storesOnDate = groupedByDate[dateKey];
    storesOnDate.forEach(({ storeId }) => {
      const store = storeData.find(s => s.id === storeId);
      if (!store) return;

      const tagsHtml = store.mainTags.map(tag => {
        const name = tag.replace(/^#/, '');
        return `<span class="bg-gray-200 text-gray-700 text-xs font-medium mr-2 px-2 py-1 rounded">
                  ${getEmojiForProduct(name)} ${tag}
                </span>`;
      }).join('');

      const card = document.createElement('div');
      card.className = 'flex items-start bg-white p-4 rounded-lg border border-gray-200 relative cursor-pointer store-link';
      card.dataset.storeId = store.id;
      card.dataset.from = 'recentStoresScreen';
      card.innerHTML = `
        <img src="https://placehold.co/100x100/E0E7FF/4338CA?text=${encodeURIComponent(store.name.charAt(0))}" alt="${store.name}" class="w-24 h-24 rounded-md mr-4">
        <div class="flex-1">
          <h3 class="font-bold text-lg text-gray-900">${store.name}</h3>
          <div class="flex items-center text-sm text-gray-600 mt-1">
            <i class="ph ph-star text-yellow-400 text-base mr-1"></i>
            <span class="font-bold">${store.rating}</span>
            <span class="mx-1">|</span>
            <span>리뷰 ${store.reviews.length}</span>
          </div>
          <div class="mt-2">${tagsHtml}</div>
        </div>
      `;
      container.appendChild(card);
    });
  }
}

// 픽업/주문내역
export function renderPickupScreen(completedOrders) {
  const pickupScreenMain = document.getElementById('pickupScreen').querySelector('main');
  pickupScreenMain.innerHTML = '';

  if (completedOrders.length === 0) {
    pickupScreenMain.innerHTML = `<p class="text-center text-gray-500 p-10">완료된 주문이 없습니다. 장바구니에서 결제를 먼저 진행해주세요.</p>`;
    return;
  }

  [...completedOrders].reverse().forEach(order => {
    const orderEl = document.createElement('div');
    orderEl.className = 'mb-8';

    let itemsHtml = '';
    for (const storeId in order.cart) {
      const store = order.cart[storeId];
      const items = Object.values(store.items).map(item => {
        const requestText = item.request ? ` (${item.request})` : '';
        return `${getEmojiForProduct(item.name)} ${item.name} ${item.quantity}개${requestText}`;
      }).join(', ');

      itemsHtml += `
        <div class="flex items-start bg-gray-100 p-3 rounded-lg">
          <img src="https://placehold.co/48x48/E0E7FF/4338CA?text=${encodeURIComponent(store.storeName.charAt(0))}" class="w-12 h-12 rounded-md mr-4" alt="">
          <div><p class="font-semibold text-gray-800">${store.storeName}</p><p class="text-gray-600">${items}</p></div>
        </div>`;
    }

    orderEl.innerHTML = `
      <div class="bg-gray-50 p-6 rounded-lg text-center">
        <h2 class="text-lg font-semibold text-gray-800">픽업 준비 완료</h2>
        <p class="text-gray-500 mt-1">픽업 센터에서 아래 QR코드를 보여주세요.</p>
        <div id="qrcode-${order.orderId}" class="mt-4 flex justify-center"></div>
        <p class="mt-4 text-sm font-mono bg-gray-200 p-2 rounded inline-block">주문번호: ${order.orderId}</p>
      </div>
      <div class="mt-8">
        <h3 class="text-lg font-bold text-gray-800 mb-4">주문 내역</h3>
        <div class="space-y-3">${itemsHtml}</div>
      </div>
      <hr class="my-8 border-gray-300">
    `;
    pickupScreenMain.appendChild(orderEl);

    // QR 코드 생성
    new QRCode(document.getElementById(`qrcode-${order.orderId}`), {
      text: order.orderId, width: 180, height: 180
    });
  });
}

export function renderMyOrdersScreen(completedOrders) {
  const container = document.getElementById('myOrdersScreen').querySelector('main');
  container.innerHTML = '';

  if (completedOrders.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500 p-10">주문 내역이 없습니다.</p>`;
    return;
  }

  [...completedOrders].reverse().forEach(order => {
    let orderItemsHtml = '';
    for (const storeId in order.cart) {
      const store = order.cart[storeId];
      const itemNames = Object.values(store.items).map(item => {
        const requestText = item.request ? `<span class="text-xs text-indigo-600"> (${item.request})</span>` : '';
        return `${getEmojiForProduct(item.name)} ${item.name} ${item.quantity}개${requestText}`;
      }).join('<br>');

      orderItemsHtml += `
        <div class="mt-2">
          <h4 class="font-semibold text-lg text-gray-800">${store.storeName}</h4>
          <p class="text-gray-600 pl-1">${itemNames}</p>
        </div>
      `;
    }

    const orderCard = document.createElement('div');
    orderCard.className = 'bg-white p-4 rounded-lg border border-gray-200 shadow-sm';
    orderCard.innerHTML = `
      <p class="text-sm text-gray-500 mb-2">${order.date} - 픽업</p>
      ${orderItemsHtml}
      <div class="border-t mt-4 pt-3 flex justify-between items-center">
        <span class="font-semibold text-gray-700">결제금액</span>
        <span class="font-bold text-lg text-gray-900">${order.totalPrice.toLocaleString()}원</span>
      </div>
    `;
    container.appendChild(orderCard);
  });
}
