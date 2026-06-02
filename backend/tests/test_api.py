"""Business-rule tests against an in-memory SQLite database.

Run from the backend/ directory:  pytest
"""
import os

# Point the app's own engine at SQLite so importing it never tries to reach a
# real Postgres host. Tests use the separate in-memory engine defined below.
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture
def client():
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_unique_sku(client):
    payload = {"sku": "A1", "name": "Thing", "price": 10, "stock": 5}
    assert client.post("/products", json=payload).status_code == 201
    assert client.post("/products", json=payload).status_code == 409


def test_unique_email(client):
    payload = {"name": "Jane", "email": "jane@example.com"}
    assert client.post("/customers", json=payload).status_code == 201
    assert client.post("/customers", json=payload).status_code == 409


def test_order_reduces_stock(client):
    pid = client.post("/products", json={"sku": "B1", "name": "Widget", "price": 5, "stock": 10}).json()["id"]
    cid = client.post("/customers", json={"name": "Joe", "email": "joe@example.com"}).json()["id"]

    res = client.post("/orders", json={"customer_id": cid, "items": [{"product_id": pid, "quantity": 3}]})
    assert res.status_code == 201
    assert res.json()["total_amount"] == 15.0
    assert client.get(f"/products/{pid}").json()["stock"] == 7


def test_order_rejected_when_insufficient_stock(client):
    pid = client.post("/products", json={"sku": "C1", "name": "Rare", "price": 5, "stock": 2}).json()["id"]
    cid = client.post("/customers", json={"name": "Sam", "email": "sam@example.com"}).json()["id"]

    res = client.post("/orders", json={"customer_id": cid, "items": [{"product_id": pid, "quantity": 5}]})
    assert res.status_code == 409
    assert client.get(f"/products/{pid}").json()["stock"] == 2  # untouched


def test_cancel_order_restores_stock(client):
    pid = client.post("/products", json={"sku": "D1", "name": "Pen", "price": 1, "stock": 10}).json()["id"]
    cid = client.post("/customers", json={"name": "Liz", "email": "liz@example.com"}).json()["id"]

    oid = client.post("/orders", json={"customer_id": cid, "items": [{"product_id": pid, "quantity": 4}]}).json()["id"]
    assert client.get(f"/products/{pid}").json()["stock"] == 6
    assert client.delete(f"/orders/{oid}").status_code == 204
    assert client.get(f"/products/{pid}").json()["stock"] == 10
