# Inventory & Order Management System

A full-stack app to manage products, customers, orders, and inventory. The
backend is a FastAPI + PostgreSQL REST API, the frontend is a React (Vite) SPA,
and everything runs with Docker Compose.

## Submission links

- **GitHub repo:** https://github.com/madhushreeray30/inventory-order-management
- **Live frontend:** https://inventory-order-management-madhushreeray30s-projects.vercel.app
- **Live backend API:** https://inventory-backend-egns.onrender.com (docs at https://inventory-backend-egns.onrender.com/docs)
- **Docker Hub (backend image):** https://hub.docker.com/r/madhushreeray3004/inventory-backend

## Tech stack

| Layer        | Choice                          |
|--------------|---------------------------------|
| Frontend     | React 18 + Vite, React Router   |
| Backend      | Python 3.12, FastAPI            |
| ORM / DB     | SQLAlchemy 2 + PostgreSQL 16    |
| Container    | Docker, Docker Compose          |

## Project structure

```
.
├── backend/            FastAPI app
│   ├── app/
│   │   ├── main.py     app + router registration
│   │   ├── config.py   env-var settings
│   │   ├── database.py engine / session
│   │   ├── models.py   SQLAlchemy models
│   │   ├── schemas.py  Pydantic request/response models
│   │   ├── crud.py     data access + business rules
│   │   └── routers/    products, customers, orders, stats
│   ├── tests/          business-rule tests (pytest)
│   ├── seed.py         sample data
│   └── Dockerfile
├── frontend/           React app
│   ├── src/
│   │   ├── api.js      fetch wrapper
│   │   └── pages/      Dashboard, Products, Customers, Orders
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── render.yaml         backend + DB deploy blueprint
└── .env.example
```

## API

Base URL: the backend root (e.g. `http://localhost:8000`). Interactive docs at `/docs`.

### Products
| Method | Path             | Description            |
|--------|------------------|------------------------|
| GET    | `/products`      | List all products      |
| GET    | `/products/{id}` | Get one product        |
| POST   | `/products`      | Create a product       |
| PUT    | `/products/{id}` | Update a product       |
| DELETE | `/products/{id}` | Delete a product       |

### Customers
| Method | Path              | Description          |
|--------|-------------------|----------------------|
| GET    | `/customers`      | List all customers   |
| GET    | `/customers/{id}` | Get one customer     |
| POST   | `/customers`      | Create a customer    |
| DELETE | `/customers/{id}` | Delete a customer    |

### Orders
| Method | Path           | Description                          |
|--------|----------------|--------------------------------------|
| GET    | `/orders`      | List all orders                      |
| GET    | `/orders/{id}` | Get one order                        |
| POST   | `/orders`      | Create an order (reduces stock)      |
| DELETE | `/orders/{id}` | Cancel an order (restores stock)     |

### Stats
| Method | Path     | Description                                   |
|--------|----------|-----------------------------------------------|
| GET    | `/stats` | Totals + low-stock products for the dashboard |

## Business rules

- Product SKU is unique (`409` on duplicate).
- Customer email is unique (`409` on duplicate).
- Stock can never go negative (DB check constraint + validation).
- An order is rejected with `409` if any line has insufficient stock — and
  no stock is changed in that case.
- Placing an order reduces product stock automatically.
- The order total is calculated by the backend from each product's price.
- Cancelling an order returns its items to stock.
- Requests are validated with Pydantic; errors use proper HTTP status codes.

## Running locally with Docker

```bash
cp .env.example .env        # then edit POSTGRES_PASSWORD, etc.
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend:  http://localhost:8000  (docs at /docs)

Optional — load sample data:

```bash
docker compose exec backend python seed.py
```

## Running without Docker (dev)

Backend:
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/inventory"
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

## Tests

```bash
cd backend
pip install -r requirements.txt
pytest
```

Tests cover unique SKU, unique email, stock reduction, insufficient-stock
rejection, and stock restore on cancel (using in-memory SQLite).

## Environment variables

| Variable            | Used by         | Example                                            |
|---------------------|-----------------|----------------------------------------------------|
| `POSTGRES_USER`     | compose / db    | `postgres`                                          |
| `POSTGRES_PASSWORD` | compose / db    | `change_me`                                         |
| `POSTGRES_DB`       | compose / db    | `inventory`                                         |
| `DATABASE_URL`      | backend         | `postgresql+psycopg://user:pass@host:5432/inventory`|
| `CORS_ORIGINS`      | backend         | `http://localhost:3000,https://app.vercel.app`      |
| `VITE_API_URL`      | frontend build  | `http://localhost:8000`                             |

No credentials are hardcoded — everything comes from the environment.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions
(Render for the backend + database, Vercel for the frontend, Docker Hub
for the backend image).
