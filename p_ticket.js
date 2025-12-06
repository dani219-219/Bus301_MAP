/* p_ticket.js
   * 
* [패스권 구매 화면 로직]
   * 날짜 및 인원 선택, 예매 가격 계산, 광고 배너 애니메이션(축소) 등의 기능을 담당합니다.
* 
* 🔗 연결된 파일(이 파일과 연관된 파일들):
* 1. js / screens / menu.js : 이 화면으로 들어오는 진입점(메뉴) 및 뒤로가기 시 이동할 화면
   * 2. css / p_ticket.css   : 이 화면의 스타일(UI 디자인)을 담당하는 파일
       * 3. main.html          : p_ticket.css를 불러오고 전체 앱의 뼈대를 제공
           */

import { loadMenuScreen } from "./menu.js";

// 상태 변수
let selectedDate = new Date().toISOString().split('T')[0];
let adultCount = 0;
let childCount = 0;
const MAX_TOTAL_PERSON = 9;

const PRICE_ADULT = 20000;
const PRICE_CHILD = 10000;

export function loadPassPurchasePage() {
    const content = document.getElementById("content");

    content.innerHTML = `
    <div class="p-ticket-page">
        <!-- 헤더 -->
        <header class="p-ticket-header">
            <button class="p-ticket-back-btn" id="pTicketBackBtn">
                <img src="assets/icons/back.svg" alt="Back" style="width: 12px; height: 12px;">
            </button>
            <h1 class="p-ticket-title">패스권 구매</h1>
        </header>

        <!-- 일정 & 인원 선택 -->
        <section class="p-ticket-section">
            <div class="p-ticket-label">일정 - 인원선택</div>

            <!-- 1. 날짜 선택 (둥근 박스) -->
            <div class="p-ticket-date-box" id="dateBox">
                <input type="date" id="dateInput" class="p-ticket-real-date-input" value="${selectedDate}">
                <div class="p-ticket-date-left">
                    <img src="assets/icons/calendar.svg" class="p-ticket-icon" alt="Calendar">
                    <span>날짜 선택</span>
                </div>
                <div class="p-ticket-date-value" id="dateDisplay">${formatDate(selectedDate)}</div>
            </div>

            <!-- 2. 인원 선택 (각각 둥근 박스) -->
            <div class="p-ticket-counter-container">
                <!-- 성인 Row -->
                <div class="p-ticket-counter-row">
                    <div class="p-ticket-counter-info">
                        <span class="p-ticket-counter-title">어른</span>
                        <span class="p-ticket-counter-subtitle">13세 이상</span>
                    </div>
                    <div class="p-ticket-counter-controls">
                        <button class="p-ticket-counter-btn" id="btnAdultMinus">-</button>
                        <span class="p-ticket-counter-value" id="adultDisplay">${adultCount}</span>
                        <button class="p-ticket-counter-btn" id="btnAdultPlus">+</button>
                    </div>
                </div>

                <!-- 어린이 Row -->
                <div class="p-ticket-counter-row">
                    <div class="p-ticket-counter-info">
                        <span class="p-ticket-counter-title">어린이</span>
                        <span class="p-ticket-counter-subtitle">6세 ~ 12세</span>
                    </div>
                    <div class="p-ticket-counter-controls">
                        <button class="p-ticket-counter-btn" id="btnChildMinus">-</button>
                        <span class="p-ticket-counter-value" id="childDisplay">${childCount}</span>
                        <button class="p-ticket-counter-btn" id="btnChildPlus">+</button>
                    </div>
                </div>
            </div>

            <!-- 조회 버튼 (오른쪽 정렬) -->
            <div class="p-ticket-search-wrapper">
                <button class="p-ticket-search-btn" id="searchBtn">티켓 조회</button>
            </div>
        </section>

        <!-- [조회 후] 결과 섹션 (초기 숨김) -->
        <section class="p-ticket-result-section p-ticket-hidden" id="resultSection">
            <div class="p-ticket-label" style="margin-bottom: 12px;">패스권 조회</div>

            <!-- 1. 결과 카드 (3등분 스타일) -->
            <div class="p-ticket-card">
                <div class="p-ticket-card-left">
                    <span class="p-ticket-card-label">일정</span>
                    <span class="p-ticket-card-label">인원</span>
                    <span class="p-ticket-card-label">이동수단</span>
                </div>
                <div class="p-ticket-card-right">
                    <span class="p-ticket-card-value" id="resDate">${formatDate(selectedDate)}</span>
                    <span class="p-ticket-card-value" id="resPerson">성인 0, 어린이 0</span>
                    <span class="p-ticket-card-value" id="resTransport">버스, 지하철, 트램</span>
                    
                    <div class="p-ticket-buy-btn-wrapper">
                        <button class="p-ticket-buy-btn" id="buyBtn">
                            <img src="assets/icons/ticket.svg" alt="Ticket">
                            예매
                        </button>
                        <span class="p-ticket-price" id="resPrice">0원</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- [조회 전/후] 광고 배너 (조회 시 줄어듬) -->
        <section id="bigAdSection" class="p-ticket-ad-big">
            <h2>Daejeon Trip</h2>
            <p>다양한 즐거움이 가득한 대전으로!</p>
            <p style="font-size:12px; margin-top:8px;">(광고 배너 영역)</p>
        </section>
    </div>
    `;

    setupEventListeners();
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

function setupEventListeners() {
    // 1. 뒤로가기
    document.getElementById("pTicketBackBtn")?.addEventListener("click", () => {
        loadMenuScreen();
    });

    // 2. 날짜 선택 업데이트
    const dateInput = document.getElementById("dateInput");
    const dateDisplay = document.getElementById("dateDisplay");
    dateInput.addEventListener("change", (e) => {
        selectedDate = e.target.value;
        dateDisplay.textContent = formatDate(selectedDate);
        updateResult();
    });

    // 3. 인원 카운터
    const adultDisplay = document.getElementById("adultDisplay");
    const childDisplay = document.getElementById("childDisplay");

    const updateCounts = () => {
        adultDisplay.textContent = adultCount;
        childDisplay.textContent = childCount;
        updateResult();
    };

    document.getElementById("btnAdultPlus").addEventListener("click", () => {
        if (adultCount + childCount >= MAX_TOTAL_PERSON) return alertMax();
        adultCount++;
        updateCounts();
    });
    document.getElementById("btnAdultMinus").addEventListener("click", () => {
        if (adultCount > 0) adultCount--;
        updateCounts();
    });
    document.getElementById("btnChildPlus").addEventListener("click", () => {
        if (adultCount + childCount >= MAX_TOTAL_PERSON) return alertMax();
        childCount++;
        updateCounts();
    });
    document.getElementById("btnChildMinus").addEventListener("click", () => {
        if (childCount > 0) childCount--;
        updateCounts();
    });

    function alertMax() {
        alert(`최대 ${MAX_TOTAL_PERSON}명까지 예매 가능합니다.`);
    }

    // 4. 조회 버튼
    const searchBtn = document.getElementById("searchBtn");
    const bigAdSection = document.getElementById("bigAdSection");
    const resultSection = document.getElementById("resultSection");

    searchBtn.addEventListener("click", () => {
        // Validation
        if (adultCount === 0 && childCount === 0) {
            alert("최소 1명 이상의 인원을 선택해주세요.");
            return;
        }

        searchBtn.textContent = "조회 중...";
        searchBtn.disabled = true;

        setTimeout(() => {
            searchBtn.textContent = "티켓 조회";
            searchBtn.disabled = false;

            // ***** 상태 전환 *****
            // 광고를 줄이고(shrunk), 결과 섹션 표시
            bigAdSection.classList.add("shrunk");
            resultSection.classList.remove("p-ticket-hidden");

            updateResult();
            // 스크롤이 필요하면 부드럽게
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 600);
    });

    function updateResult() {
        document.getElementById("resDate").textContent = formatDate(selectedDate);

        // 인원
        let texts = [];
        if (adultCount > 0) texts.push(`성인 ${adultCount}`);
        if (childCount > 0) texts.push(`어린이 ${childCount}`);
        if (texts.length === 0) texts.push("인원 미선택");
        document.getElementById("resPerson").textContent = texts.join(", ");

        // 가격
        const total = (adultCount * PRICE_ADULT) + (childCount * PRICE_CHILD);
        document.getElementById("resPrice").textContent = `가격: ${total.toLocaleString()}원`;
    }

    // 5. 예매 버튼
    const buyBtn = document.getElementById("buyBtn");
    buyBtn.addEventListener("click", () => {
        const total = (adultCount * PRICE_ADULT) + (childCount * PRICE_CHILD);
        if (confirm(`총 ${total.toLocaleString()}원 결제하시겠습니까?`)) {
            alert("예매 완료!");
            buyBtn.textContent = "완료";
            buyBtn.disabled = true;
        }
    });
}
