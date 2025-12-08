/**
 * stamp_map.js
 * 
 * 스탬프 지도 화면입니다.
 * 카카오맵 API를 사용하여 대전 역사 장소를 꿈도리 마커로 표시하고,
 * GPS 기반으로 스탬프를 획득할 수 있습니다.
 * 
 * 연결된 파일:
 * - js/data/stampPlaces.js (역사 장소 데이터)
 * - js/components/stampStore.js (스탬프 저장)
 * - js/app.js (사용자 위치)
 * - css/stamp_map.css
 */

import { userLocation } from "../app.js";
import { STAMP_PLACES, STAMP_COLLECT_RADIUS } from "../data/stampPlaces.js";
import {
    isStampCollected,
    collectStamp,
    removeStamp,
    getProgress
} from "../components/stampStore.js";

let map = null;
let markers = [];
let currentInfoWindow = null;

/**
 * 스탬프 지도 화면 로드
 */
export async function loadStampMapScreen() {
    const content = document.getElementById("content");

    content.innerHTML = `
    <div class="stamp-map-container">
      <button class="stamp-back-btn" id="stampBackBtn">
        <img src="assets/icons/back.svg" alt="뒤로가기" />
      </button>
      
      <div class="stamp-category-bar">
        <button class="stamp-category-btn active" data-category="stamp">
          <img src="assets/icons/dream.png" alt="스탬프" />
          스탬프
        </button>
        <button class="stamp-category-btn" data-category="cafe">
          <img src="assets/tag_filter/카페.svg" alt="카페" />
          카페
        </button>
        <button class="stamp-category-btn" data-category="food">
          <img src="assets/tag_filter/식당.svg" alt="식당" />
          식당
        </button>
        <button class="stamp-category-btn" data-category="tour">
          <img src="assets/tag_filter/관광.svg" alt="관광" />
          관광
        </button>
      </div>
      
      <div id="map"></div>
      
      <div class="stamp-progress-bar" id="stampProgress">
        <div class="progress-header">
          <span class="progress-title">🏛️ 대전 역사 스탬프</span>
          <span class="progress-count" id="progressCount">0 / ${STAMP_PLACES.length}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="progressFill" style="width: 0%"></div>
        </div>
      </div>
    </div>
  `;

    // 카카오맵 로드 및 초기화
    await loadKakaoMap();
    await initStampMap();

    // 진행률 업데이트
    updateProgressBar();

    // 이벤트 리스너 등록
    setupEventListeners();
}

/**
 * 카카오맵 SDK 로드
 */
async function loadKakaoMap() {
    return new Promise((resolve, reject) => {
        if (window.kakao && window.kakao.maps) {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=124e4b785cbdd3fc46a37b0abd30547f&autoload=false`;
        script.onload = () => {
            kakao.maps.load(resolve);
        };
        script.onerror = reject;

        document.head.appendChild(script);
    });
}

/**
 * 스탬프 지도 초기화
 */
async function initStampMap() {
    if (!window.kakao || !window.kakao.maps) {
        console.error("❌ Kakao Maps SDK가 로드되지 않았습니다.");
        return;
    }

    const container = document.getElementById("map");

    // 대전 중심 좌표 (기본값)
    const defaultCenter = { lat: 36.3504, lng: 127.3845 };
    const center = userLocation ?? defaultCenter;

    // 지도 옵션 - 모바일 드래그/줌 활성화
    const mapOptions = {
        center: new kakao.maps.LatLng(center.lat, center.lng),
        level: 7, // 대전 전체가 보이는 레벨
        draggable: true, // 드래그 활성화
        scrollwheel: true, // 마우스 휠 줌 활성화
        disableDoubleClickZoom: false // 더블클릭 줌 활성화
    };

    map = new kakao.maps.Map(container, mapOptions);

    // 모바일 터치 줌 활성화
    map.setZoomable(true);

    // 현재 위치 마커 추가
    if (userLocation) {
        addCurrentLocationMarker(userLocation);
    }

    // 스탬프 장소 마커 추가
    addStampMarkers();
}

/**
 * 현재 위치 마커 추가
 */
function addCurrentLocationMarker(location) {
    const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(location.lat, location.lng),
        map: map
    });

    const infoContent = `
    <div style="padding: 8px 12px; font-size: 13px; font-weight: 500;">
      📍 현재 위치
    </div>
  `;

    const infoWindow = new kakao.maps.InfoWindow({
        content: infoContent
    });

    kakao.maps.event.addListener(marker, 'click', () => {
        infoWindow.open(map, marker);
    });
}

/**
 * 스탬프 장소 마커 추가
 * - 미획득: marker.svg (궁금증 유발)
 * - 획득: dream.png (꿈도리 등장)
 */
function addStampMarkers() {
    // 1. 꿈도리 마커 (획득 후)
    const dreamImageSrc = "assets/icons/dream.png";
    const dreamImageSize = new kakao.maps.Size(50, 50);
    const dreamImageOption = { offset: new kakao.maps.Point(25, 50) };
    const dreamImage = new kakao.maps.MarkerImage(dreamImageSrc, dreamImageSize, dreamImageOption);

    // 2. 기본 마커 (획득 전 - marker.svg)
    const defaultMarkerSrc = "assets/icons/marker.svg"; // TODO: marker.svg가 있는지 확인 필요
    const defaultMarkerSize = new kakao.maps.Size(40, 40); // 사이즈 조절 필요시 수정
    const defaultMarkerOption = { offset: new kakao.maps.Point(20, 40) };
    const defaultMarkerImage = new kakao.maps.MarkerImage(defaultMarkerSrc, defaultMarkerSize, defaultMarkerOption);

    STAMP_PLACES.forEach(place => {
        const position = new kakao.maps.LatLng(place.lat, place.lng);
        const isCollected = isStampCollected(place.id);

        // 획득 여부에 따라 아이콘 변경
        const markerImage = isCollected ? dreamImage : defaultMarkerImage;

        const marker = new kakao.maps.Marker({
            position: position,
            map: map,
            image: markerImage,
            title: place.name,
            opacity: 1.0 // 둘 다 선명하게 표시
        });

        // 마커 클릭 이벤트
        kakao.maps.event.addListener(marker, 'click', () => {
            showStampInfoWindow(marker, place);
        });

        markers.push({ marker, place });
    });
}

/**
 * 스탬프 정보창 표시
 */
function showStampInfoWindow(marker, place) {
    // 기존 정보창 닫기
    if (currentInfoWindow) {
        currentInfoWindow.close();
    }

    const isCollected = isStampCollected(place.id);
    const distance = userLocation
        ? calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng)
        : null;

    const canCollect = distance !== null && distance <= STAMP_COLLECT_RADIUS / 1000;

    let buttonClass = "stamp-collect-btn ";
    let buttonText = "";
    let cancelButtonHTML = ""; // 취소 버튼 HTML

    if (isCollected) {
        buttonClass += "collected";
        buttonText = "✅ 스탬프 획득 완료!";
        // 테스트용: 스탬프 취소 버튼 추가
        cancelButtonHTML = `
            <button class="stamp-cancel-btn"
                    onclick="window.cancelStampHandler(${place.id})"
                    style="margin-top: 8px; width: 100%; padding: 8px; background: #ff6b6b; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
                🔄 스탬프 취소 (테스트용)
            </button>
        `;
    } else if (canCollect) {
        buttonClass += "available";
        buttonText = "🎯 스탬프 획득하기";
    } else {
        buttonClass += "available"; // 테스트용: 항상 클릭 가능
        buttonText = distance
            ? `📍 ${(distance * 1000).toFixed(0)}m 거리 (테스트: 클릭하여 획득)`
            : "🎯 스탬프 획득하기 (테스트)";
    }

    // 획득 전에는 marker.svg, 획득 후에는 dream.png 표시
    const iconSrc = isCollected ? "assets/icons/dream.png" : "assets/icons/marker.svg";

    const content = `
    <div class="stamp-info-window">
      <div class="stamp-info-header">
        <div class="stamp-info-icon">
          <img src="${iconSrc}" alt="스탬프" />
        </div>
        <div class="stamp-info-title">
          <h3>${place.name}</h3>
          <span class="stamp-info-period">${place.period}</span>
        </div>
      </div>
      <p class="stamp-info-desc">${place.description}</p>
      <p class="stamp-info-address">📍 ${place.address}</p>
      <button class="${buttonClass}" 
              onclick="window.collectStampHandler(${place.id})"
              ${isCollected ? "disabled" : ""}>
        ${buttonText}
      </button>
      ${cancelButtonHTML}
    </div>
  `;

    currentInfoWindow = new kakao.maps.InfoWindow({
        content: content,
        removable: true
    });

    currentInfoWindow.open(map, marker);
}

/**
 * 스탬프 획득 핸들러 (전역 함수로 등록)
 */
window.collectStampHandler = function (stampId) {
    const success = collectStamp(stampId);

    if (success) {
        alert("🎉 스탬프를 획득했습니다! (꿈도리가 나타났어요!)");

        // 정보창 닫기
        if (currentInfoWindow) {
            currentInfoWindow.close();
        }

        // 진행률 업데이트
        updateProgressBar();

        // 마커 새로고침 (획득 상태 반영 -> 아이콘 변경)
        refreshMarkers();
    } else {
        alert("이미 획득한 스탬프입니다.");
    }
};

/**
 * 스탬프 취소 핸들러 (테스트용)
 */
window.cancelStampHandler = function (stampId) {
    if (confirm("정말 스탬프 획득을 취소하시겠습니까? (초기화됨)")) {
        const success = removeStamp(stampId);
        if (success) {
            alert("스탬프가 취소되었습니다. (마커가 다시 숨겨집니다)");
            if (currentInfoWindow) currentInfoWindow.close();
            updateProgressBar();
            refreshMarkers();
        }
    }
};

/**
 * 마커 새로고침
 */
function refreshMarkers() {
    // 기존 마커 제거
    markers.forEach(({ marker }) => marker.setMap(null));
    markers = [];

    // 마커 다시 추가
    addStampMarkers();
}

/**
 * 진행률 바 업데이트
 */
function updateProgressBar() {
    const progress = getProgress(STAMP_PLACES.length);

    const countEl = document.getElementById("progressCount");
    const fillEl = document.getElementById("progressFill");

    if (countEl) {
        countEl.textContent = `${progress.collected} / ${progress.total}`;
    }

    if (fillEl) {
        fillEl.style.width = `${progress.percentage}%`;
    }
}

/**
 * 두 좌표 간 거리 계산 (km)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
    // 뒤로가기 버튼
    const backBtn = document.getElementById("stampBackBtn");
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            import("../app.js").then(({ showHome }) => {
                showHome();
                import("./home.js").then(m => m.loadHomeScreen());
            });
        });
    }

    // 카테고리 버튼 (스탬프만 활성화, 나머지는 추후 구현)
    document.querySelectorAll(".stamp-category-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const category = btn.dataset.category;

            // 활성화 상태 토글
            document.querySelectorAll(".stamp-category-btn").forEach(b => {
                b.classList.remove("active");
            });
            btn.classList.add("active");

            if (category === "stamp") {
                // 스탬프 모드: 진행률 표시, 마커 표시
                document.getElementById("stampProgress").style.display = "block";
                refreshMarkers();
            } else {
                // 다른 카테고리: 추후 구현
                document.getElementById("stampProgress").style.display = "none";
                markers.forEach(({ marker }) => marker.setMap(null));
                markers = [];
                alert(`"${btn.textContent.trim()}" 카테고리는 준비 중입니다.`);
            }
        });
    });
}
