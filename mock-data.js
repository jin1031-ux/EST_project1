// 첫 버전에서 사용하는 예시 식당 데이터입니다. 실제 매장 정보가 아닙니다.
const restaurants = [
  {
    id: "moru-table",
    name: "모루 식탁",
    address: "서울시 마포구 연희로 12길 8",
    menu: [
      { name: "치킨마요 덮밥", price: 9000 },
      { name: "연어 덮밥", price: 12000 },
      { name: "미소국", price: 2500 }
    ],
    seatStatus: "여유",
    updatedAt: "2026-10-28T18:10:00"
  },
  {
    id: "spring-noodle",
    name: "봄날 국수",
    address: "서울시 마포구 동교로 21길 14",
    menu: [
      { name: "비빔국수", price: 8000 },
      { name: "잔치국수", price: 7000 },
      { name: "만두", price: 5000 }
    ],
    seatStatus: "보통",
    updatedAt: "2026-10-28T17:45:00"
  },
  {
    id: "warm-rice",
    name: "따뜻한 한끼",
    address: "서울시 서대문구 신촌로 54길 3",
    menu: [
      { name: "치킨마요 덮밥", price: 8500 },
      { name: "제육 덮밥", price: 9500 },
      { name: "된장찌개", price: 8000 }
    ],
    seatStatus: "만석",
    updatedAt: "2026-10-28T18:02:00"
  },
  {
    id: "corner-curry",
    name: "코너 카레",
    address: "서울시 마포구 와우산로 29길 7",
    menu: [
      { name: "버터치킨 카레", price: 11000 },
      { name: "야채 카레", price: 9000 },
      { name: "탄두리 치킨", price: 12000 }
    ],
    seatStatus: "정보 없음",
    updatedAt: null
  }
];

const seatStatuses = ["여유", "보통", "만석", "정보 없음"];
