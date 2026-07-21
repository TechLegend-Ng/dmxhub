DMXHUB - 170 IbakaTV Movies Deploy Pack
Generated: 2026-07-21
Movies: 170 verified real YouTube IDs

SECURITY FIXES APPLIED:
- Removed exposed API key AIzaSyCCwnxz... from fetch_real_ibaka.py
- Now uses YT_API_KEY env var only
- ACTION REQUIRED: Delete old key in Google Cloud Console > APIs & Services > Credentials > Delete AIzaSyCCwnxz...

WHAT'S INSIDE:
- index.html (fixed, production ready, YouTube CDN posters hqdefault + maxres lazy upgrade)
- watch.html (fixed, tabs Full/Trailer/Poster, related, SEO JSON-LD ready)
- movies-data.js / movies-data.json (170 movies)
- styles.css (original 3000+ lines)
- about.html, contact.html, privacy.html, login.html
- fetch_real_ibaka.py (fixed, env var only)
- .env.example

DEPLOY:
1. Upload entire folder to your hosting (Vercel, Netlify, cPanel, etc)
2. No build step needed - pure HTML/JS
3. Test: open index.html -> search -> click movie -> watch.html?id=XX should embed youtube-nocookie
4. SEO: Each watch page has title with year, meta description from synopsis. Add sitemap.xml pointing to /watch.html?id=1..170

POSTER STRATEGY (space saving):
- poster = https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg (low ~15KB)
- posterHigh = maxresdefault.jpg (high, lazy loaded via IntersectionObserver)
- Saves ~85% vs local images

NEXT STEPS:
- Replace [YOUR_EMAIL] placeholders in contact.html
- Add your domain to canonical tags (currently dmxhub.com)
- Create new YouTube API key and set env: export YT_API_KEY=xxx then python fetch_real_ibaka.py to refresh 170 latest
- Optional: Add ads, analytics, sitemap

© 2026 DMXHUB
