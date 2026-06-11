# VinFast Mạnh Hiển — Website Giới Thiệu Xe

Website giới thiệu xe điện VinFast chính hãng, xây dựng bằng HTML/CSS/JS + Node.js + Nginx, triển khai qua Docker + Cloudflare Tunnel.

---

## Yêu cầu

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) đã cài và đang chạy
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) đã cài
- Cổng **80** chưa bị chiếm

---

## Cấu trúc thư mục

```
website_vinfast/
├── frontend/          # Giao diện (HTML, CSS, JS)
│   ├── admin/         # Trang quản trị admin
│   │   ├── index.html # Dashboard quản lý xe
│   │   └── login.html # Trang đăng nhập admin
│   ├── robots.txt
│   └── sitemap.xml
├── backend/           # API Node.js + Express
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT middleware
│   │   └── routes/
│   │       ├── admin.js       # API đăng nhập
│   │       ├── upload.js      # API upload ảnh
│   │       └── ...
│   └── data/          # Dữ liệu JSON (xe, banner, đơn tư vấn...)
├── storage/           # Ảnh xe và banner
│   ├── banners/
│   └── cars/
├── nginx/
│   └── nginx-http-only.conf   # Config đang dùng (Cloudflare Tunnel)
├── certbot/           # Chứng chỉ SSL Let's Encrypt (dự phòng)
├── docker-compose.yml
└── README.md
```

---

## Chạy trên localhost

### Bước 1 — Khởi động

```bash
docker compose up -d --build
```

### Bước 2 — Truy cập

Mở trình duyệt vào: **http://localhost**

### Dừng server

```bash
docker compose down
```

### Xem log

```bash
# Log tất cả service
docker compose logs -f

# Chỉ log nginx
docker logs vinfast-nginx -f

# Chỉ log backend
docker logs vinfast-backend -f
```

---

## Chạy với domain (vinfastmanhhien.click)

Website dùng **Cloudflare Tunnel** để expose ra internet — không cần port forwarding, không cần IP tĩnh.

### Bước 1 — Khởi động Docker

```bash
docker compose up -d --build
```

### Bước 2 — Chạy Cloudflare Tunnel

```bash
cloudflared tunnel run vinfast
```

Giữ terminal này mở. Khi thấy `Registered tunnel connection` là tunnel đang hoạt động.

Truy cập: **https://vinfastmanhhien.click**

---

## Cấu hình biến môi trường

Tạo file `.env` từ template:

```bash
cp .env.example .env
```

Sau đó điền giá trị thật vào `.env`:

```env
TELEGRAM_BOT_TOKEN=token_bot_của_bạn
TELEGRAM_CHAT_ID=chat_id_của_bạn
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=vinfastmanhhien_secret_key
```

> **Lưu ý bảo mật:** File `.env` đã được thêm vào `.gitignore` — không bao giờ commit file này lên git.

Sau khi sửa `.env`, cần rebuild lại backend:

```bash
docker compose up -d --build backend
```

---

## Cấu hình nội dung

Thông tin liên hệ được cấu hình tại `backend/data/settings.json`:

```json
{
  "site": { "domain": "vinfastmanhhien.click", "url": "https://vinfastmanhhien.click", "title": "VinFast Mạnh Hiển" },
  "consultant": {
    "name": "Tư vấn bán hàng: Đào Mạnh Hiển",
    "phone": "0912475576",
    "facebook": "https://...",
    "tiktok": "https://...",
    "zalo": "0912475576",
    "address": "Địa chỉ showroom"
  }
}
```

> Sau khi sửa `settings.json`, không cần restart — backend đọc file mỗi lần có request.

---

## Trang quản trị Admin

Truy cập trang admin qua link **Đăng nhập** ở chân trang web, hoặc trực tiếp:

```
https://vinfastmanhhien.click/admin/login.html
```

Đăng nhập bằng tài khoản cấu hình trong `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`).

Sau khi đăng nhập, dashboard cho phép:
- Thêm / sửa / xóa xe
- Upload ảnh xe trực tiếp từ trình duyệt
- Đặt xe nổi bật

Token đăng nhập có hiệu lực **8 giờ**, lưu trong `localStorage` của trình duyệt — mỗi máy/trình duyệt cần đăng nhập riêng.

---

## Thêm / sửa xe

Chỉnh sửa file `backend/data/cars.json`. Mỗi xe có cấu trúc:

```json
{
  "id": "vf3",
  "name": "VinFast VF3",
  "type": "VF3",
  "priceFrom": 302000000,
  "priceTo": 315000000,
  "description": "Mô tả xe...",
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
  "colors": ["Trắng Ngọc Trai", "Đỏ Đậm"],
  "thumbnail": "/storage/cars/vf3/mint01.png",
  "images": ["/storage/cars/vf3/mint01.png"],
  "featured": true
}
```

**Danh sách xe hiện có:**

| ID | Tên |
|----|-----|
| `vf3` | VinFast VF3 |
| `vf5` | VinFast VF5 |
| `vf6` | VinFast VF6 |
| `vf7` | VinFast VF7 |
| `vf8` | VinFast VF8 |
| `vf9` | VinFast VF9 |
| `minio-green` | VinFast Minio Green |
| `herio-green` | VinFast Herio Green |
| `nerio-green` | VinFast Nerio Green |
| `limo-green` | VinFast Limo Green |
| `ec-van` | VinFast EC Van |

Ảnh xe đặt vào thư mục: `storage/cars/<id>/`

---

## Thêm / sửa banner

Chỉnh sửa file `backend/data/banners.json`:

```json
{
  "id": 1,
  "title": "Tiêu đề banner",
  "subtitle": "Mô tả ngắn",
  "image": "/storage/banners/ten-anh.jpg",
  "link": "/cars.html",
  "order": 1
}
```

Ảnh banner đặt vào: `storage/banners/`

> Ảnh banner khuyến nghị: **1920×1080px**, tỷ lệ 16:9.

---

## API Endpoints

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| GET | `/api/cars` | Danh sách xe | — |
| GET | `/api/cars/:id` | Chi tiết xe | — |
| GET | `/api/banners` | Danh sách banner | — |
| GET | `/api/settings` | Thông tin liên hệ | — |
| POST | `/api/consultations` | Gửi form tư vấn | — |
| POST | `/api/track` | Ghi nhận lượt truy cập | — |
| GET | `/api/stats` | Thống kê lượt truy cập | — |
| POST | `/api/telegram/webhook` | Nhận lệnh từ Telegram Bot | — |
| POST | `/api/admin/login` | Đăng nhập admin, trả về JWT | — |
| POST | `/api/upload` | Upload ảnh xe | JWT |
| PUT | `/api/cars/:id` | Cập nhật xe | JWT |
| DELETE | `/api/cars/:id` | Xóa xe | JWT |

---

## Telegram Bot — Thống kê

Bot Telegram hỗ trợ tra cứu thống kê truy cập và tư vấn qua lệnh chat.

### Đăng ký webhook (chạy 1 lần sau khi deploy)

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://vinfastmanhhien.click/api/telegram/webhook"
```

### Các lệnh hỗ trợ

| Lệnh | Mô tả |
|------|-------|
| `/thongke` | Tổng quan hôm nay / tháng / quý / năm |
| `/thongke ngay` | Hôm nay |
| `/thongke ngay 02/06/2026` | Ngày cụ thể |
| `/thongke thang` | Tháng này |
| `/thongke thang 06/2026` | Tháng cụ thể |
| `/thongke quy` | Quý này |
| `/thongke quy 2/2026` | Quý cụ thể (1–4) |
| `/thongke nam` | Năm này |
| `/thongke nam 2026` | Năm cụ thể |
| `/help` | Danh sách lệnh |

---

## SEO

- `frontend/robots.txt` — cho phép Google crawl toàn bộ, trỏ đến sitemap
- `frontend/sitemap.xml` — liệt kê tất cả URL cần index
- Submit sitemap tại **Google Search Console** → Sitemaps → `sitemap.xml`

---

## Xử lý sự cố

| Triệu chứng | Kiểm tra |
|-------------|----------|
| Trang trắng | `docker logs vinfast-nginx` |
| API lỗi 502 | `docker compose restart nginx` |
| API lỗi 500 | `docker logs vinfast-backend` |
| API lỗi 401 | Token hết hạn hoặc chưa đăng nhập — vào lại `/admin/login.html` |
| API lỗi 429 | Rate limit: 5 req/phút (`/api/consultations`), 30 req/phút (`/api/track`), 10 req/phút (`/api/admin`) |
| JS/CSS không cập nhật | Ctrl+Shift+R (nginx đã cấu hình `no-cache` cho JS/CSS) |
| Ảnh không hiện | Kiểm tra đường dẫn trong JSON khớp với file trong `storage/` |
| Bot Telegram không phản hồi | Kiểm tra `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` và webhook đã đăng ký chưa |
| Container không khởi động | `docker compose ps` xem trạng thái |
