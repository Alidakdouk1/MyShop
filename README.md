# MyShop

Full-stack e-commerce app — **React + Vite** frontend and **PHP + MySQL** backend.

> Status: work in progress (not finished yet).

---

## Setup guide (Windows + XAMPP)

Follow these steps to run the project on a fresh laptop.

### 1. Install the tools

- [XAMPP](https://www.apachefriends.org/) (gives you Apache + MySQL + PHP)
- [Node.js](https://nodejs.org/) (v20 or newer)
- [Git](https://git-scm.com/)

### 2. Get the code

Clone the project **into XAMPP's `htdocs` folder** so the path is exactly
`C:\xampp\htdocs\MyShop`:

```bash
cd C:\xampp\htdocs
git clone <REPO_URL> MyShop
cd MyShop
```

### 3. Start XAMPP

Open the **XAMPP Control Panel** and click **Start** on both:

- **Apache**
- **MySQL**

### 4. Create the backend config file

The real `.env` is not in Git (it holds secrets). Create your own from the
example:

```bash
copy backend\.env.example backend\.env
```

For a default local XAMPP install the defaults work as-is (MySQL user `root`,
empty password). Open `backend\.env` and change `JWT_SECRET` to any long random
string.

### 5. Create and seed the database

This single command creates the `myshop` database, builds all tables, and adds
sample data (including an admin account):

```bash
cd backend\database
php migrate.php --seed
cd ..\..
```

> If `php` is not recognised, use the full path:
> `C:\xampp\php\php.exe migrate.php --seed`

### 6. Install frontend dependencies and run

```bash
npm install
npm run dev
```

### 7. Open the app

- Frontend: <http://localhost:5173>
- Backend API (served by Apache): <http://localhost/MyShop/backend>

Both Apache + MySQL (XAMPP) and `npm run dev` must be running at the same time.

---

## Useful commands

| Command | What it does |
|---|---|
| `php backend\database\migrate.php --status` | Show which migrations have run |
| `php backend\database\migrate.php --seed` | Run migrations + seed data |
| `php backend\database\migrate.php --rollback` | Drop all tables (dev only) |
| `npm run dev` | Start the frontend dev server |
| `npm run build` | Build the frontend for production |

## Troubleshooting

- **"Database connection failed"** — Make sure MySQL is started in XAMPP and the
  `DB_*` values in `backend\.env` match your MySQL setup.
- **API requests fail / CORS errors** — Confirm the project folder is exactly
  `C:\xampp\htdocs\MyShop` and Apache is running.
- **`php` not found** — Add `C:\xampp\php` to your PATH, or use the full path
  `C:\xampp\php\php.exe`.
