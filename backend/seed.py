"""Seed the database with a few sample products and customers.

Run after the API/DB are up:  python seed.py
Safe to re-run — it skips rows that already exist.
"""
from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import Customer, Product

Base.metadata.create_all(bind=engine)

PRODUCTS = [
    {"sku": "SKU-001", "name": "Wireless Mouse", "description": "Ergonomic 2.4GHz mouse", "price": 24.99, "stock": 50},
    {"sku": "SKU-002", "name": "Mechanical Keyboard", "description": "RGB, blue switches", "price": 79.99, "stock": 30},
    {"sku": "SKU-003", "name": "USB-C Hub", "description": "7-in-1 adapter", "price": 39.50, "stock": 0},
    {"sku": "SKU-004", "name": "27\" Monitor", "description": "1440p IPS display", "price": 229.00, "stock": 12},
]

CUSTOMERS = [
    {"name": "Alice Johnson", "email": "alice@example.com", "phone": "555-0101"},
    {"name": "Bob Smith", "email": "bob@example.com", "phone": "555-0102"},
]


def main() -> None:
    db = SessionLocal()
    try:
        for p in PRODUCTS:
            if not db.scalar(select(Product).where(Product.sku == p["sku"])):
                db.add(Product(**p))
        for c in CUSTOMERS:
            if not db.scalar(select(Customer).where(Customer.email == c["email"])):
                db.add(Customer(**c))
        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
