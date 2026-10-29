// 제주 지역을 기준으로 구성한 예시 식당 데이터입니다. 실제 매장 정보가 아닙니다.
const restaurants = [
  {
    id: "hallasan-black-pork",
    name: "한라산 흑돼지",
    address: "제주특별자치도 제주시 관덕로 18길 12",
    menu: [
      { name: "흑돼지 근고기", price: 22000 },
      { name: "흑돼지 김치찌개", price: 9000 },
      { name: "제주 막걸리", price: 6000 }
    ],
    seatStatus: "여유",
    updatedAt: "2026-10-28T18:10:00"
  },
  {
    id: "seogwipo-noodle",
    name: "서귀포 고기국수",
    address: "제주특별자치도 서귀포시 천지로 42",
    menu: [
      { name: "고기국수", price: 10000 },
      { name: "비빔국수", price: 9000 },
      { name: "돔베고기", price: 18000 }
    ],
    seatStatus: "보통",
    updatedAt: "2026-10-28T17:45:00"
  },
  {
    id: "seongsan-sea-table",
    name: "성산 바다식탁",
    address: "제주특별자치도 서귀포시 성산읍 일출로 280",
    menu: [
      { name: "전복 해산물 뚝배기", price: 18000 },
      { name: "갈치조림", price: 48000 },
      { name: "성게미역국", price: 15000 }
    ],
    seatStatus: "만석",
    updatedAt: "2026-10-28T18:02:00"
  },
  {
    id: "aewol-morning",
    name: "애월 모닝브런치",
    address: "제주특별자치도 제주시 애월읍 애월해안로 112",
    menu: [
      { name: "제주 감귤 브런치", price: 16000 },
      { name: "전복 버터구이", price: 19000 },
      { name: "제주 당근 케이크", price: 7500 }
    ],
    seatStatus: "정보 없음",
    updatedAt: null
  }
];

const seatStatuses = ["여유", "보통", "만석", "정보 없음"];
