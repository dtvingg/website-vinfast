# System Design — Website Giới Thiệu Xe VinFast

---

## 0. Thông tin dự án

| Mục | Giá trị |
|-----|---------|
| **Tên miền** | `vinfastmanhhien.click` |
| **URL production** | `https://vinfastmanhhien.click` |
| **Môi trường dev** | `http://localhost` |

---

## 1. Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│              (HTML + CSS + Vanilla JS)                  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────────┐
│                   Nginx (port 80)                       │
│   Static files (frontend)  │  /api/* → proxy backend   │
└──────────────┬─────────────┴──────────────┬────────────┘
               │                            │ proxy
               │                ┌───────────▼────────────┐
               │                │  Node.js + Express      │
               │                │      (port 3000)        │
               │                └──┬──────────┬──────────┘
               │                   │          │
               │          ┌────────▼──┐  ┌───▼──────────┐
               │          │ JSON Data │  │ Storage       │
               │          │  /data/   │  │ /storage/     │
               │          └───────────┘  └───────────────┘
               │                              │
               │                   ┌──────────▼──────────┐
               └───────────────────┤  Telegram Bot API   │
                                   │   (gửi tư vấn)      │
                                   └─────────────────────┘
```

---

## 2. Cấu trúc thư mục

```
website_vinfast/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── cars.js           # CRUD xe
│   │   │   ├── banners.js        # banner
│   │   │   ├── consultations.js  # form tư vấn
│   │   │   ├── settings.js       # thông tin liên hệ
│   │   │   ├── track.js          # ghi nhận lượt truy cập
│   │   │   └── stats.js          # thống kê truy cập
│   │   ├── services/
│   │   │   ├── fileDb.js         # đọc/ghi JSON (appendJson có write lock)
│   │   │   └── telegram.js       # gửi tin nhắn Telegram (TLS verified)
│   │   └── app.js
│   ├── data/
│   │   ├── cars.json
│   │   ├── banners.json
│   │   ├── consultations.json
│   │   ├── settings.json
│   │   └── visits.json           # log lượt truy cập
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── index.html                # trang chủ (banner + xe nổi bật)
│   ├── cars.html                 # danh sách + tìm kiếm xe
│   ├── car-detail.html           # chi tiết xe
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── main.js               # banner carousel
│       ├── cars.js               # filter/search
│       ├── car-detail.js         # gallery + form
│       ├── consultation.js       # submit form + validation
│       └── tracker.js            # gửi beacon khi trang load
├── storage/
│   ├── banners/                  # ảnh banner
│   │   ├── banner1.jpg
│   │   └── banner2.jpg
│   └── cars/
│       ├── vf3/
│       │   ├── thumb.jpg
│       │   ├── img1.jpg
│       │   └── img2.jpg
│       └── vf8/
├── nginx/
│   └── nginx.conf
└── docker-compose.yml
```

---

## 3. Data Models (JSON)

### `data/cars.json`

```json
[
  {
    "id": "vf3",
    "name": "VF 3",
    "type": "mini",
    "priceFrom": 235000000,
    "priceTo": 260000000,
    "description": "Xe điện mini...",
    "specs": {
      "range": "210 km",
      "seats": 4,
      "charging": "Sạc nhanh DC 30 phút"
    },
    "colors": ["Trắng", "Đen", "Xanh Biển"],
    "thumbnail": "/storage/cars/vf3/thumb.jpg",
    "images": [
      "/storage/cars/vf3/img1.jpg",
      "/storage/cars/vf3/img2.jpg"
    ],
    "featured": true
  }
]
```

### `data/banners.json`

```json
[
  {
    "id": 1,
    "title": "VinFast — Khởi nguồn cảm hứng",
    "image": "/storage/banners/banner1.jpg",
    "link": "/cars.html",
    "order": 1
  }
]
```

### `data/settings.json`

```json
{
  "site": {
    "domain": "vinfastmanhhien.click",
    "url": "https://vinfastmanhhien.click",
    "title": "VinFast Mạnh Hiển"
  },
  "consultant": {
    "name": "Nguyễn Văn A",
    "phone": "0901234567",
    "facebook": "https://facebook.com/abc",
    "tiktok": "https://tiktok.com/@abc",
    "zalo": "0901234567",
    "address": "123 Đường ABC, Quận 1, TP.HCM"
  },
  "telegram": {
    "botToken": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  }
}
```

### `data/consultations.json`

```json
[
  {
    "id": "uuid-v4",
    "carId": "vf3",
    "carName": "VF 3",
    "name": "Trần Thị B",
    "phone": "0987654321",
    "address": "Hà Nội",
    "notes": "Muốn hỏi về màu Đen",
    "status": "pending",
    "createdAt": "2026-05-25T10:00:00Z"
  }
]
```

### `data/visits.json`

```json
[
  {
    "id": "uuid-v4",
    "page": "/",
    "ip": "113.160.x.x",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "referrer": "https://google.com",
    "sessionId": "sess-abc123",
    "timestamp": "2026-05-25T10:00:00Z"
  }
]
```

**Giải thích các trường:**

| Trường | Mô tả |
|--------|-------|
| `page` | Trang người dùng đang xem (`/`, `/cars.html`, `/car-detail.html?id=vf3`) |
| `ip` | Lấy từ header `X-Real-IP` do Nginx forward (ẩn phần cuối để bảo vệ riêng tư) |
| `userAgent` | Trình duyệt và thiết bị |
| `referrer` | Nguồn dẫn đến trang (Google, Facebook, trực tiếp...) |
| `sessionId` | UUID lưu trong `sessionStorage` của trình duyệt — mỗi tab/cửa sổ mới là 1 session |

---

## 4. API Endpoints

| Method | Endpoint | Mô tả | Rate limit |
|--------|----------|-------|------------|
| `GET` | `/api/cars` | Danh sách xe (filter: `type`, `minPrice`, `maxPrice`, `search`) | — |
| `GET` | `/api/cars/:id` | Chi tiết 1 xe | — |
| `GET` | `/api/banners` | Danh sách banner | — |
| `GET` | `/api/settings` | Thông tin liên hệ (không trả token Telegram) | — |
| `POST` | `/api/consultations` | Gửi form tư vấn → lưu JSON + gửi Telegram | 5 req/phút/IP |
| `POST` | `/api/track` | Ghi nhận 1 lượt truy cập (gọi từ JS phía client) | 30 req/phút/IP |
| `GET` | `/api/stats` | Thống kê lượt truy cập tổng hợp | — |

**Ví dụ query filter:**
```
GET /api/cars?type=suv&minPrice=500000000&search=VF8
```

---

## 5. Luồng xử lý — Form Tư Vấn

```
User điền form
      │
      ▼
Frontend validate (name + phone required)
      │
      ▼
POST /api/consultations  ←── rate limit: 5 req/phút/IP (trả 429 nếu vượt)
      │
      ├─► Ghi vào consultations.json (write có lock, không mất dữ liệu khi đồng thời)
      │
      └─► Gọi Telegram Bot API (non-blocking, fire-and-forget)
            botToken + chatId từ biến môi trường .env
            HTML trong message được escape để tránh injection
            Gửi message: tên, SĐT, xe quan tâm, ghi chú
```

**Tin nhắn Telegram mẫu:**
```
🚗 YÊU CẦU TƯ VẤN MỚI
──────────────────────
Xe: VF 3
Khách hàng: Trần Thị B
SĐT: 0987654321
Địa chỉ: Hà Nội
Ghi chú: Hỏi về màu Đen
──────────────────────
⏰ 25/05/2026 10:00
```

---

## 6. Luồng xử lý — Visitor Tracking

### Tại sao dùng beacon từ frontend thay vì middleware backend?

Frontend được Nginx serve trực tiếp (không qua Express), nên Express middleware **không thấy** các request trang HTML. Giải pháp: mỗi trang HTML nhúng `tracker.js`, file này gửi beacon đến backend khi trang load xong.

### Luồng hoạt động

```
Browser load trang (/, /cars.html, /car-detail.html)
      │
      ▼
tracker.js chạy:
  1. Kiểm tra sessionStorage có sessionId chưa?
     - Chưa có → tạo UUID mới, lưu vào sessionStorage
     - Có rồi → dùng lại
  2. Gửi POST /api/track  ←── rate limit: 30 req/phút/IP
     { page, referrer, sessionId, userAgent }
      │
      ▼
Backend (track.js):
  1. Lấy IP từ header X-Real-IP (Nginx forward)
  2. Ghi bản ghi mới vào visits.json (write có lock)
     - Giới hạn tối đa 10.000 bản ghi (records cũ bị cắt bỏ)
  3. Trả về 204 No Content (không block UI)
```

### Response từ `GET /api/stats`

```json
{
  "totalVisits": 1250,
  "uniqueSessions": 430,
  "visitsByPage": {
    "/": 600,
    "/cars.html": 400,
    "/car-detail.html": 250
  },
  "visitsByDay": {
    "2026-05-25": 85,
    "2026-05-24": 120,
    "2026-05-23": 98
  },
  "topReferrers": {
    "google.com": 310,
    "facebook.com": 180,
    "direct": 760
  }
}
```

> `GET /api/stats` chỉ tính toán tổng hợp từ `visits.json` mỗi lần gọi — không cache, phù hợp với lưu lượng nhỏ.

---

## 7. UI Pages

| Trang | Nội dung |
|-------|----------|
| **Trang chủ** (`/`) | Banner carousel tự động, section xe nổi bật, footer |
| **Danh sách xe** (`/cars.html`) | Bộ lọc (loại xe, khoảng giá, tìm kiếm tên), grid thẻ xe |
| **Chi tiết xe** (`/car-detail.html?id=vf3`) | Gallery ảnh, thông số kỹ thuật, nút "Nhận Tư Vấn" → mở modal form |
| **Footer** (tất cả trang) | Tên tư vấn, SĐT, Facebook, TikTok, Zalo, địa chỉ cơ sở |

> Tất cả các trang đều nhúng `tracker.js` để ghi nhận lượt truy cập tự động.

### Vị trí hiển thị tên miền trong UI

```
┌─────────────────────────────────────────────────────────┐
│  HEADER                                                 │
│  [Logo VinFast]   vinfastmanhhien.click   [Menu: Xe | ...]│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  FOOTER                                                 │
│  © 2026 VinFast Mạnh Hiển                              │
│  🌐 vinfastmanhhien.click  ← link có thể click           │
│  📞 0901234567                                          │
│  📍 123 Đường ABC, Quận 1, TP.HCM                      │
└─────────────────────────────────────────────────────────┘
```

Cả header lẫn footer đều hiển thị `vinfastmanhhien.click` dưới dạng thẻ `<a href="https://vinfastmanhhien.click">` để người dùng có thể click vào để reload về trang chủ.

---

## 8. Docker Setup

### `docker-compose.yml`

> Volume `./backend/data` đảm bảo `visits.json` không bị mất khi restart container.

```yaml
services:
  backend:
    build: ./backend
    volumes:
      - ./backend/data:/app/data      # JSON files persist
      - ./storage:/app/storage        # ảnh persist
    environment:
      - NODE_ENV=production

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./frontend:/usr/share/nginx/html
      - ./storage:/usr/share/nginx/html/storage
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
```

### `nginx/nginx.conf`

```nginx
server {
    listen 80;
    server_name vinfastmanhhien.click www.vinfastmanhhien.click;

    # Redirect www → non-www
    if ($host = www.vinfastmanhhien.click) {
        return 301 https://vinfastmanhhien.click$request_uri;
    }

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        resolver           127.0.0.11 valid=10s;   # Docker DNS nội bộ, re-resolve sau 10s
        set $upstream      http://backend:3000;
        proxy_pass         $upstream;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
    }

    location /storage/ {
        alias /usr/share/nginx/html/storage/;
    }
}
```

> **Lưu ý HTTPS:** Sau khi deploy, dùng [Certbot](https://certbot.eff.org/) để cấp SSL miễn phí cho `vinfastmanhhien.click`. Nginx sẽ tự redirect HTTP → HTTPS.

---

## 9. Công nghệ sử dụng

| Layer | Công nghệ | Lý do |
|-------|-----------|-------|
| Frontend | HTML5 + CSS3 + Vanilla JS | Nhẹ, không cần build, dễ triển khai |
| Backend | Node.js + Express | Nhanh, xử lý JSON tốt |
| Database | JSON files | Đơn giản, không cần cài DB |
| Image store | Thư mục `/storage` | Mount volume trong Docker |
| Notification | Telegram Bot API | Miễn phí, real-time |
| Reverse proxy | Nginx | Serve static + proxy API |
| Container | Docker + Compose | Dễ deploy, môi trường nhất quán |

---

## 10. Các bước triển khai

1. Chuẩn bị ảnh xe và banner vào thư mục `storage/`
2. Điền dữ liệu xe vào `backend/data/cars.json`
3. Tạo file `.env` từ `.env.example`, điền `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID`
4. Cập nhật thông tin tư vấn viên vào `backend/data/settings.json`
5. Trỏ DNS của `vinfastmanhhien.click` về IP server (A record)
6. Build và chạy Docker:
   ```bash
   docker compose up -d --build
   ```
7. Cấp SSL miễn phí bằng Certbot:
   ```bash
   docker exec -it nginx certbot --nginx -d vinfastmanhhien.click -d www.vinfastmanhhien.click
   ```
8. Truy cập `https://vinfastmanhhien.click` để kiểm tra
