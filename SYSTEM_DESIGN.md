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
                         │ HTTP/HTTPS (qua Cloudflare Tunnel)
┌────────────────────────▼────────────────────────────────┐
│                   Nginx (port 80)                       │
│   Static files (frontend)  │  /api/* → proxy backend   │
│   JS/CSS: no-cache header  │                            │
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
               │
    ┌──────────▼──────────────────────────┐
    │         Telegram Bot API            │
    │  - Gửi thông báo tư vấn mới        │
    │  - Nhận lệnh thống kê (/thongke)   │
    └─────────────────────────────────────┘
```

---

## 2. Cấu trúc thư mục

```
website_vinfast/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT verify middleware (requireAdmin)
│   │   ├── routes/
│   │   │   ├── admin.js          # auth, stats, visits, sessions, consultations (JWT)
│   │   │   ├── upload.js         # POST /api/upload → lưu ảnh xe (auth)
│   │   │   ├── cars.js           # CRUD xe (PUT/DELETE yêu cầu auth)
│   │   │   ├── banners.js        # banner
│   │   │   ├── consultations.js  # form tư vấn + gửi Telegram
│   │   │   ├── settings.js       # thông tin liên hệ
│   │   │   ├── track.js          # ghi nhận lượt truy cập
│   │   │   ├── stats.js          # thống kê truy cập (API)
│   │   │   └── telegram.js       # webhook bot: nhận lệnh /thongke
│   │   ├── services/
│   │   │   ├── fileDb.js         # đọc/ghi JSON (appendJson có write lock)
│   │   │   └── telegram.js       # gửi tin nhắn Telegram (TLS verified)
│   │   └── app.js
│   ├── data/
│   │   ├── cars.json             # danh sách 11 xe
│   │   ├── banners.json          # 9 banner
│   │   ├── consultations.json    # đơn tư vấn (gitignore)
│   │   ├── settings.json         # thông tin liên hệ
│   │   └── visits.json           # log lượt truy cập (gitignore)
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── admin/
│   │   ├── index.html            # dashboard quản lý xe (auth required)
│   │   └── login.html            # trang đăng nhập admin
│   ├── index.html                # trang chủ (banner + xe nổi bật)
│   ├── cars.html                 # danh sách + tìm kiếm xe
│   ├── car-detail.html           # chi tiết xe
│   ├── robots.txt                # SEO crawl rules
│   ├── sitemap.xml               # SEO sitemap (11 xe)
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── main.js               # banner carousel (autoplay liên tục)
│       ├── cars.js               # filter/search
│       ├── car-detail.js         # gallery + thông số kỹ thuật
│       ├── consultation.js       # submit form + validation
│       └── tracker.js            # gửi beacon khi trang load
├── storage/
│   ├── banners/                  # 9 ảnh banner
│   ├── cars/
│   │   ├── vf3/
│   │   ├── vf5/
│   │   ├── vf6/
│   │   ├── vf7/
│   │   ├── vf8/
│   │   ├── vf9/
│   │   ├── minio-green/
│   │   ├── herio-green/
│   │   ├── nerio-green/
│   │   ├── limo-green/
│   │   └── ec-van/
│   └── logos/
├── nginx/
│   └── nginx-http-only.conf      # no-cache cho JS/CSS; HTML: no-store (app.js)
└── docker-compose.yml
```

---

## 3. Data Models (JSON)

### `data/cars.json`

11 xe hiện có: `vf3`, `vf5`, `vf6`, `vf7`, `vf8`, `vf9`, `minio-green`, `herio-green`, `nerio-green`, `limo-green`, `ec-van`.

```json
{
  "id": "vf3",
  "name": "VinFast VF3",
  "type": "VF3",
  "priceFrom": 302000000,
  "priceTo": 315000000,
  "description": "...",
  "specs": {
    "dimensions": "3.190 x 1.679 x 1.622 mm",
    "wheelbase": "2.075 mm",
    "ground_clearance": "191 mm",
    "engine": "Động cơ điện",
    "max_power": "32 kW (43 hp)",
    "max_torque": "110 Nm",
    "battery": "18,64 kWh",
    "range": "210 km (NEDC)",
    "top_speed": "100 km/h",
    "seats": 4,
    "charging": "36 phút (10% - 70%)",
    "drive": "RWD"
  },
  "colors": ["Trắng Ngọc Trai", "Đỏ Đậm", "..."],
  "thumbnail": "/storage/cars/vf3/mint01.png",
  "images": ["/storage/cars/vf3/mint01.png", "..."],
  "featured": true
}
```

### `data/banners.json`

9 banner, mỗi banner có `id`, `title`, `subtitle`, `image`, `link`, `order`.

### `data/settings.json`

```json
{
  "site": { "domain": "vinfastmanhhien.click", "url": "https://vinfastmanhhien.click", "title": "VinFast Mạnh Hiển" },
  "consultant": {
    "name": "Tư vấn bán hàng: Đào Mạnh Hiển",
    "phone": "0912475576",
    "facebook": "https://...",
    "tiktok": "https://...",
    "zalo": "0912475576",
    "address": "Số 8 Phạm Hùng, Mai Dịch, Cầu Giấy, Hà Nội"
  }
}
```

### `data/consultations.json`

```json
[
  {
    "id": "uuid-v4",
    "carId": "vf3",
    "carName": "VinFast VF3",
    "name": "Trần Thị B",
    "phone": "0987654321",
    "address": "Hà Nội",
    "notes": "Muốn hỏi về màu Đen",
    "status": "pending",
    "createdAt": "2026-06-02T10:00:00Z"
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
    "userAgent": "Mozilla/5.0...",
    "referrer": "https://google.com",
    "sessionId": "sess-abc123",
    "timestamp": "2026-06-02T10:00:00Z"
  }
]
```

---

## 4. API Endpoints

| Method | Endpoint | Mô tả | Auth | Rate limit |
|--------|----------|-------|------|------------|
| `POST` | `/api/admin/login` | Đăng nhập admin → trả JWT (8h) | — | 200 req/phút/IP |
| `GET` | `/api/admin/stats` | Thống kê theo kỳ (`period`, `value`) — trả tổng + breakdown 3 cột | JWT | 200 req/phút/IP |
| `GET` | `/api/admin/stats/detail` | Chi tiết lượt/phiên/tư vấn trong 1 ngày, phân trang 20 hàng | JWT | 200 req/phút/IP |
| `GET` | `/api/admin/visits` | Danh sách lượt truy cập, filter theo kỳ, phân trang | JWT | 200 req/phút/IP |
| `GET` | `/api/admin/sessions` | Danh sách phiên (group theo sessionId), filter + phân trang | JWT | 200 req/phút/IP |
| `GET` | `/api/admin/consultations` | Danh sách đơn tư vấn, filter theo kỳ, phân trang | JWT | 200 req/phút/IP |
| `GET` | `/api/cars` | Danh sách xe (filter: `type`, `minPrice`, `maxPrice`, `search`) | — | — |
| `GET` | `/api/cars/:id` | Chi tiết 1 xe | — | — |
| `POST` | `/api/cars` | Thêm xe mới | JWT | — |
| `PUT` | `/api/cars/:id` | Cập nhật xe | JWT | — |
| `DELETE` | `/api/cars/:id` | Xóa xe | JWT | — |
| `POST` | `/api/upload` | Upload ảnh xe → lưu vào `storage/cars/<id>/` | JWT | — |
| `GET` | `/api/banners` | Danh sách banner | — | — |
| `GET` | `/api/settings` | Thông tin liên hệ | — | — |
| `POST` | `/api/consultations` | Gửi form tư vấn → lưu JSON + gửi Telegram | — | 5 req/phút/IP |
| `POST` | `/api/track` | Ghi nhận lượt truy cập | — | 30 req/phút/IP |
| `GET` | `/api/stats` | Thống kê lượt truy cập tổng hợp | — | — |
| `POST` | `/api/telegram/webhook` | Nhận lệnh từ Telegram Bot | — | — |

---

## 5. Telegram Bot

### Gửi thông báo tư vấn

Khi có form tư vấn mới, backend tự động gửi Telegram (non-blocking):

```
🚗 YÊU CẦU TƯ VẤN MỚI
──────────────────────
Xe: VinFast VF3
Khách hàng: Trần Thị B
SĐT: 0987654321
Địa chỉ: Hà Nội
Ghi chú: Hỏi về màu Đen
──────────────────────
⏰ 02/06/2026 10:00
```

### Nhận lệnh thống kê (webhook)

Bot lắng nghe tại `POST /api/telegram/webhook`. Webhook đã đăng ký với Telegram để nhận tin nhắn realtime.

Chỉ phản hồi đúng `TELEGRAM_CHAT_ID` được cấu hình trong `.env`.

**Các lệnh hỗ trợ:**

| Lệnh | Mô tả |
|------|-------|
| `/thongke` | Tổng quan hôm nay / tháng / quý / năm |
| `/thongke ngay` | Hôm nay |
| `/thongke ngay dd/mm/yyyy` | Ngày cụ thể |
| `/thongke thang` | Tháng này |
| `/thongke thang mm/yyyy` | Tháng cụ thể |
| `/thongke quy` | Quý này |
| `/thongke quy q/yyyy` | Quý cụ thể (q: 1–4) |
| `/thongke nam` | Năm này |
| `/thongke nam yyyy` | Năm cụ thể |
| `/help` | Danh sách lệnh |

**Mẫu phản hồi:**
```
📊 THỐNG KÊ — HÔM NAY
──────────────────
👁 Lượt truy cập: 45
👤 Phiên duy nhất: 32
📋 Yêu cầu tư vấn: 3
──────────────────
⏰ 02/06/2026 14:30
```

---

## 6. Xác thực Admin (JWT)

Admin đăng nhập qua `POST /api/admin/login`. Backend verify credentials từ env vars (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) và trả về JWT token có hiệu lực **8 giờ**.

```
POST /api/admin/login
  { username, password }
        │
        ▼
  Verify vs ADMIN_USERNAME / ADMIN_PASSWORD (env)
        │
        ├─► Sai → 401 { error }
        │
        └─► Đúng → 200 { token: "eyJ..." }
```

Frontend lưu token vào `localStorage`. Mọi request có auth kèm header:
```
Authorization: Bearer <token>
```

Middleware `requireAdmin` (auth.js) verify JWT bằng `JWT_SECRET`. Token hết hạn → 401, frontend redirect về `/admin/login.html`.

---

## 7. Luồng xử lý — Form Tư Vấn

```
User điền form
      │
      ▼
Frontend validate (name + phone required)
      │
      ▼
POST /api/consultations  ←── rate limit: 5 req/phút/IP
      │
      ├─► Ghi vào consultations.json (write lock)
      │
      └─► Gửi Telegram (non-blocking, fire-and-forget)
```

---

## 8. Luồng xử lý — Visitor Tracking

```
Browser load trang
      │
      ▼
tracker.js:
  1. Tạo/lấy sessionId từ sessionStorage
  2. POST /api/track  ←── rate limit: 30 req/phút/IP
      │
      ▼
Backend (track.js):
  1. Lấy IP từ X-Real-IP (Nginx forward)
  2. Ghi vào visits.json (write lock, tối đa 10.000 records)
  3. Trả 204 No Content
```

---

## 9. Nginx — Cấu hình quan trọng

```nginx
# JS/CSS không bị cache cứng — trình duyệt luôn kiểm tra phiên bản mới
location ~* \.(js|css)$ {
    try_files $uri =404;
    add_header Cache-Control "no-cache, must-revalidate";
}

# Ảnh storage cache 7 ngày
location /storage/ {
    alias /usr/share/nginx/html/storage/;
    expires 7d;
    add_header Cache-Control "public";
}
```

---

## 10. SEO

| File | Mô tả |
|------|-------|
| `frontend/robots.txt` | Cho phép tất cả crawler, trỏ đến sitemap |
| `frontend/sitemap.xml` | 13 URL: trang chủ, danh sách xe, 11 trang chi tiết xe |

**Submit sitemap:** Google Search Console → Sitemaps → nhập `sitemap.xml` → Submit.

Mỗi trang HTML có đầy đủ: `<title>`, `<meta description>`, `<meta keywords>`, Open Graph, Schema.org structured data.

---

## 11. UI Pages

| Trang | Nội dung |
|-------|----------|
| **Trang chủ** (`/`) | Banner carousel tự động (không dừng khi hover), section xe nổi bật, footer |
| **Danh sách xe** (`/cars.html`) | Bộ lọc (loại xe, khoảng giá, tìm kiếm tên), grid 11 xe |
| **Chi tiết xe** (`/car-detail.html?id=...`) | Gallery ảnh, 12 trường thông số kỹ thuật, màu sắc, form tư vấn |
| **Đăng nhập admin** (`/admin/login.html`) | Form username/password, `noindex` — không hiện trên Google |
| **Dashboard admin** (`/admin/`) | Quản lý xe (thêm/sửa/xóa/upload ảnh); thống kê theo ngày/tháng/quý/năm với phân trang; tab Truy cập / Phiên / Tư vấn có bộ lọc kỳ và phân trang 20 hàng/trang |

---

## 12. Docker Setup

```yaml
services:
  backend:
    build: ./backend
    volumes:
      - ./backend/data:/app/data
      - ./storage:/app/storage
    environment:
      - NODE_ENV=production
      - TELEGRAM_BOT_TOKEN
      - TELEGRAM_CHAT_ID
      - ADMIN_USERNAME        # từ .env
      - ADMIN_PASSWORD        # từ .env
      - JWT_SECRET            # từ .env

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./frontend:/usr/share/nginx/html
      - ./storage:/usr/share/nginx/html/storage
      - ./nginx/nginx-http-only.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
```

> **Quan trọng:** Sau khi thêm hoặc sửa file trong `backend/src/`, phải rebuild image:
> ```bash
> docker compose up -d --build backend
> ```
> Nginx tự nhận file frontend mới ngay (volume mount), không cần rebuild.

---

## 13. Công nghệ sử dụng

| Layer | Công nghệ | Lý do |
|-------|-----------|-------|
| Frontend | HTML5 + CSS3 + Vanilla JS | Nhẹ, không cần build, dễ triển khai |
| Backend | Node.js + Express | Nhanh, xử lý JSON tốt |
| Auth | JWT (`jsonwebtoken`) | Stateless, không cần session/DB |
| Database | JSON files | Đơn giản, không cần cài DB |
| Image store | Thư mục `/storage` | Mount volume trong Docker |
| Notification | Telegram Bot API | Miễn phí, real-time |
| Bot commands | Telegram Webhook | Tra cứu thống kê qua chat |
| Reverse proxy | Nginx | Serve static + proxy API + cache control |
| Container | Docker + Compose | Dễ deploy, môi trường nhất quán |
| Tunnel | Cloudflare Tunnel | Không cần IP tĩnh, HTTPS tự động |

---

## 14. Các bước triển khai

1. Đặt ảnh xe vào `storage/cars/<id>/`, ảnh banner vào `storage/banners/`
2. Điền dữ liệu xe vào `backend/data/cars.json`
3. Tạo file `.env` từ template:
   ```bash
   cp .env.example .env
   # Điền TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ADMIN_PASSWORD, JWT_SECRET
   ```
4. Cập nhật thông tin tư vấn viên vào `backend/data/settings.json`
5. Build và chạy Docker:
   ```bash
   docker compose up -d --build
   ```
6. Đăng ký Telegram webhook:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://vinfastmanhhien.click/api/telegram/webhook"
   ```
7. Submit sitemap tại Google Search Console
8. Truy cập `https://vinfastmanhhien.click` để kiểm tra
9. Đăng nhập admin tại `https://vinfastmanhhien.click/admin/login.html`
