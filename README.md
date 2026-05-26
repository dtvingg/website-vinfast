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
├── backend/           # API Node.js + Express
│   ├── src/
│   └── data/          # Dữ liệu JSON (xe, banner, đơn tư vấn...)
├── storage/           # Ảnh xe và banner
│   ├── banners/
│   └── cars/
├── nginx/
│   ├── nginx-http-only.conf   # Config đang dùng (Cloudflare Tunnel)
│   └── nginx.conf             # Config dự phòng (Let's Encrypt trực tiếp)
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

## Cài tunnel tự động khi khởi động Windows

Để không phải mở terminal mỗi lần, cài tunnel như Windows service:

```powershell
# Chạy PowerShell với quyền Administrator
cloudflared service install
```

Sau đó tunnel tự chạy ngầm mỗi khi Windows khởi động.

Kiểm tra trạng thái:
```powershell
Get-Service cloudflared
```

Dừng / khởi động lại:
```powershell
Stop-Service cloudflared
Start-Service cloudflared
```

---

## Cấu hình biến môi trường

Telegram Bot Token và Chat ID được cấu hình qua file `.env` ở thư mục gốc:

```
.env
```

```env
TELEGRAM_BOT_TOKEN=token_bot_của_bạn
TELEGRAM_CHAT_ID=chat_id_của_bạn
```

> **Lưu ý bảo mật:** File `.env` đã được thêm vào `.gitignore` — không bao giờ commit file này lên git.
> Tham khảo `.env.example` để biết cấu trúc.

Sau khi sửa `.env`, cần rebuild lại backend:

```bash
docker compose up -d --build backend
```

---

## Cấu hình nội dung

Thông tin liên hệ và tên miền được cấu hình tại:

```
backend/data/settings.json
```

```json
{
  "site": {
    "domain": "vinfastmanhhien.click",
    "url": "https://vinfastmanhhien.click",
    "title": "VinFast Mạnh Hiển"
  },
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

## Thêm / sửa xe

Chỉnh sửa file `backend/data/cars.json`. Mỗi xe có cấu trúc:

```json
{
  "id": "vf3",
  "name": "VF 3",
  "type": "mini",
  "priceFrom": 235000000,
  "priceTo": 260000000,
  "description": "Mô tả xe...",
  "specs": {
    "engine": "Điện",
    "power": "42 mã lực",
    "range": "210 km",
    "seats": 4,
    "charging": "Sạc nhanh DC 30 phút"
  },
  "colors": ["Trắng", "Đen", "Xanh"],
  "thumbnail": "/storage/cars/vf3/thumb.jpg",
  "images": [
    "/storage/cars/vf3/img1.jpg",
    "/storage/cars/vf3/img2.jpg"
  ],
  "featured": true
}
```

**Loại xe (`type`):** `mini` | `suv` | `suv-7cho`

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

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/cars` | Danh sách xe |
| GET | `/api/cars/:id` | Chi tiết xe |
| GET | `/api/banners` | Danh sách banner |
| GET | `/api/settings` | Thông tin liên hệ |
| POST | `/api/consultations` | Gửi form tư vấn |
| GET | `/api/stats` | Thống kê lượt truy cập |

---

## Xử lý sự cố

| Triệu chứng | Kiểm tra |
|-------------|----------|
| Trang trắng | `docker logs vinfast-nginx` |
| API lỗi 502 | `docker compose restart nginx` (nginx cần re-resolve DNS sau khi backend restart) |
| API lỗi 500 | `docker logs vinfast-backend` |
| API lỗi 429 | Quá nhiều request từ một IP — rate limit: 5 lần/phút với `/api/consultations`, 30 lần/phút với `/api/track` |
| Tunnel không kết nối | `cloudflared tunnel info vinfast` |
| Ảnh không hiện | Kiểm tra đường dẫn trong JSON có khớp với file trong `storage/` |
| Container không khởi động | `docker compose ps` xem trạng thái |
| Backend không nhận Telegram | Kiểm tra `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` trong file `.env` |
