# Common Ground — KU Peace Hub

One unified project combining the previously separate pages (home, what-breaks-peace,
youth pledge, signature map, login) into a single site with one Express backend,
separated CSS/JS, and Bootstrap 5 for layout and components.

## Structure

```
peace-hub/
├── backend/
│   ├── server.js        # Express app — serves /public and all APIs
│   ├── package.json
│   └── data/             # flat JSON "database" (auto-created)
│       ├── signatures.json
│       ├── pledges.json
│       └── users.json
└── public/
    ├── index.html         # Home — hero, three kinds of peace, ripple demo
    ├── about.html          # "What breaks peace" — disruptors + solver tool
    ├── pledge.html         # Youth Peace Pledge — daily practices + pledge form
    ├── map.html            # Messengers of Peace — signature map
    ├── login.html          # Log in / sign up / password reset
    ├── css/
    │   ├── styles.css     # shared tokens, navbar, footer, buttons, forms
    │   ├── home.css
    │   ├── about.css
    │   ├── pledge.css
    │   ├── map.css
    │   └── auth.css
    └── js/
        ├── main.js         # shared: scroll reveals, active nav link, toasts
        ├── home.js
        ├── about.js
        ├── pledge.js
        ├── map.js
        └── auth.js
```

Bootstrap 5 (via CDN) drives the navbar, grid, and form primitives; the
custom CSS layers the Common Ground look (Fraunces + Karla type, sage/gold
palette) on top.

## Run it

```bash
cd backend
npm install
npm start
```

Then open **http://localhost:3000** — the backend serves the whole `public/`
folder itself, so there's nothing else to start.

## APIs

| Endpoint | Method | Used by |
|---|---|---|
| `/api/signatures` | GET / POST | map.html — list / add a signature |
| `/api/signatures/recent?limit=8` | GET | map.html — recent signatures list |
| `/api/signatures/count` | GET | map.html — running total |
| `/api/pledges` | POST | pledge.html — submit a pledge |
| `/api/pledges/count` | GET | pledge.html — running total |
| `/api/auth/signup` | POST | login.html — create an account |
| `/api/auth/login` | POST | login.html — log in |

Data is stored in flat JSON files under `backend/data/` — enough to run and
demo the whole site with zero external dependencies. Swap in a real database
(and a real session/JWT strategy for auth) before taking this to production.

## Notes / things to swap before going live

- **Images**: every page currently uses `placehold.co` placeholder images
  (logo, map, banners). Replace the `src` attributes with your real assets.
- **Google sign-in** and **phone/SMS verification** on `login.html` are
  front-end demos only — the buttons are disabled / the phone flow doesn't
  send a real code. Wire up a real OAuth client and SMS provider to enable
  them; email log in/sign up already talk to the real backend.
- **The solver tool** on `about.html` is a simple client-side keyword
  matcher, not an AI call — it's fast and needs no API key, but it's a
  starting point, not a substitute for the disclaimer already on the page.
