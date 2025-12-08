screens/stamp_map.js

css/stamp_map.css

components/stampStore.js

data/stampPlaces.js

icons/dream.png

icons/markar.svg

main.html 파일 수정
<!-- 스탬프 맵 스타일 추가 -->
<link rel="stylesheet" href="css/stamp_map.css">

screans/map.js
// js/screens/map.js 파일 전체 내용
import { loadStampMapScreen } from "./stamp_map.js";
export function loadMapScreen() {
    // 기존 버스/지도 기능 대신 스탬프 맵 로드
    loadStampMapScreen();
}
