# LendLoop – Rental Marketplace

A peer-to-peer rental platform for cameras, tools and more — with live availability calendars, booking approvals, Supabase auth/database, and a beautiful login page with intro animation.

Built for **NIAT Generative AI Project #24** using plain HTML, CSS and JavaScript (no build step).

---

## ✨ Features

1. **Login / Sign-up page** – email+password and Google OAuth via Supabase Auth
2. **Intro animation** – animated logo + progress bar on every page load
3. **Item listings** – browse, filter by category, search. Owners can add new listings.
4. **Availability calendar** – month view per item. Approved bookings are blocked.
5. **Booking requests** – renters pick a date range, add a message, send a request.
6. **Owner approve/decline** – owners approve or decline; approving blocks dates and auto-declines overlapping pending requests.
7. **Supabase backend** – data persisted in Postgres with Row Level Security; fallback to localStorage when offline.
8. **Rich footer** – social links (GitHub, LinkedIn, Email), tech stack, project info.

Two-sided roles: switch between **Renter** and **Owner** in the header.

---

## 🚀 Supabase Setup

1. Create a free project at **https://supabase.com**
2. Go to **Settings → API** and copy your **Project URL** and **anon/public key**
3. Open `supabase.js` and replace:
   ```js
   const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';
   ```
4. Run the SQL from the schema comments inside `supabase.js` in the **Supabase SQL Editor** to create the `items` and `requests` tables with RLS policies.
5. To enable **Google OAuth**, go to **Auth → Providers → Google** and add your OAuth credentials.

---

## 🔌 Recommended Free APIs for a Rental Marketplace

| API | Purpose | Free Tier |
|---|---|---|
| **[Open Exchange Rates](https://openexchangerates.org)** | Multi-currency pricing display | 1,000 req/month |
| **[Cloudinary](https://cloudinary.com)** | Item photo uploads & CDN delivery | 25 GB storage + 25 GB bandwidth |
| **[OpenStreetMap / Nominatim](https://nominatim.org)** | Geocoding & map display for item pickup location | Unlimited (fair use) |
| **[Leaflet.js](https://leafletjs.com)** | Interactive map UI (pairs with OSM) | Free & open-source |
| **[Abstract API – Email Validation](https://www.abstractapi.com/email-validation-api)** | Validate renter email on signup | 100 req/day free |
| **[Twilio / Resend](https://resend.com)** | Email notifications (booking status) | 3,000 emails/month free (Resend) |
| **[Razorpay](https://razorpay.com)** | Payment gateway for deposit/rental fee | No monthly fee, 2% per transaction |
| **[Supabase Storage](https://supabase.com/storage)** | Store item images in S3-compatible buckets | 1 GB included in free plan |

> 💡 **Recommended stack to implement next:** Cloudinary for image uploads + OSM/Leaflet for pickup location + Resend for email notifications.

---

## 📁 Project structure

```
index.html     Main marketplace page
login.html     Login / sign-up page with intro animation
style.css      All styles (intro, header, footer, components)
app.js         App logic with Supabase sync + localStorage fallback
supabase.js    Supabase client, auth helpers, DB helpers + SQL schema
data.js        Seed listings (shown on first load)
README.md
```

---

## 🖥️ Run locally

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/login.html
```

Or just open `login.html` directly in a browser.

---

## 🌐 Deploy

1. Push this folder to a **public** GitHub repository.
2. Import into **Vercel**, **Netlify**, or **GitHub Pages** – no build command needed; output folder is the repo root.
3. Set the **Site URL** in Supabase to your deployment URL (Auth → URL Configuration).

---

## 🔐 How data is stored

- **Supabase Postgres** – items and requests when credentials are configured
- **localStorage** – offline fallback; data stays in the browser, not shared across devices
- To reset, clear site data in browser settings

---

## 👤 Author

**Mukund Kumar Soni** · [GitHub: muku7848](https://github.com/muku7848) · NIAT Generative AI Project #24
