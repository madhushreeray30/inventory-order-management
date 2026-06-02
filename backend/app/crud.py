"""Data-access layer and business-rule enforcement."""
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app import models, schemas

# Products at or below this stock level are flagged as "low stock".
LOW_STOCK_THRESHOLD = 5


# ---------- Products ----------
def list_products(db: Session) -> list[models.Product]:
    return list(db.scalars(select(models.Product).order_by(models.Product.id)))


def get_product(db: Session, product_id: int) -> models.Product:
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return product


def create_product(db: Session, data: schemas.ProductCreate) -> models.Product:
    if db.scalar(select(models.Product).where(models.Product.sku == data.sku)):
        raise HTTPException(status.HTTP_409_CONFLICT, f"SKU '{data.sku}' already exists")
    product = models.Product(**data.model_dump())
    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, f"SKU '{data.sku}' already exists")
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, data: schemas.ProductUpdate) -> models.Product:
    product = get_product(db, product_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> None:
    product = get_product(db, product_id)
    db.delete(product)
    db.commit()


# ---------- Customers ----------
def list_customers(db: Session) -> list[models.Customer]:
    return list(db.scalars(select(models.Customer).order_by(models.Customer.id)))


def get_customer(db: Session, customer_id: int) -> models.Customer:
    customer = db.get(models.Customer, customer_id)
    if customer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")
    return customer


def create_customer(db: Session, data: schemas.CustomerCreate) -> models.Customer:
    if db.scalar(select(models.Customer).where(models.Customer.email == data.email)):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Email '{data.email}' already exists")
    customer = models.Customer(**data.model_dump())
    db.add(customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, f"Email '{data.email}' already exists")
    db.refresh(customer)
    return customer


def update_customer(db: Session, customer_id: int, data: schemas.CustomerUpdate) -> models.Customer:
    customer = get_customer(db, customer_id)
    payload = data.model_dump(exclude_unset=True)
    new_email = payload.get("email")
    if new_email and new_email != customer.email:
        if db.scalar(select(models.Customer).where(models.Customer.email == new_email)):
            raise HTTPException(status.HTTP_409_CONFLICT, f"Email '{new_email}' already exists")
    for field, value in payload.items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer


def delete_customer(db: Session, customer_id: int) -> None:
    customer = get_customer(db, customer_id)
    db.delete(customer)
    db.commit()


# ---------- Orders ----------
def list_orders(db: Session) -> list[models.Order]:
    return list(
        db.scalars(
            select(models.Order)
            .options(selectinload(models.Order.items))
            .order_by(models.Order.id.desc())
        )
    )


def get_order(db: Session, order_id: int) -> models.Order:
    order = db.scalar(
        select(models.Order)
        .options(selectinload(models.Order.items))
        .where(models.Order.id == order_id)
    )
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return order


def create_order(db: Session, data: schemas.OrderCreate) -> models.Order:
    # Validate customer, check stock for every line, reduce stock, and compute
    # the total. If any line has insufficient stock the whole order is rejected
    # and nothing is changed.
    get_customer(db, data.customer_id)

    # Sum quantities if the same product appears on more than one line.
    requested: dict[int, int] = {}
    for item in data.items:
        requested[item.product_id] = requested.get(item.product_id, 0) + item.quantity

    order = models.Order(customer_id=data.customer_id, status="placed", total_amount=0)
    total = 0.0

    try:
        for product_id, qty in requested.items():
            product = db.get(models.Product, product_id, with_for_update=True)
            if product is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, f"Product {product_id} not found")
            if product.stock < qty:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    f"Insufficient stock for '{product.name}' (SKU {product.sku}): "
                    f"requested {qty}, available {product.stock}",
                )
            product.stock -= qty
            line_price = float(product.price)
            total += line_price * qty
            order.items.append(
                models.OrderItem(product_id=product_id, quantity=qty, unit_price=line_price)
            )

        order.total_amount = total
        db.add(order)
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(order)
    return get_order(db, order.id)


def delete_order(db: Session, order_id: int) -> None:
    # Cancelling an order returns its items back to stock.
    order = get_order(db, order_id)
    for item in order.items:
        product = db.get(models.Product, item.product_id)
        if product is not None:
            product.stock += item.quantity
    db.delete(order)
    db.commit()


def get_stats(db: Session) -> dict:
    products = list_products(db)
    low_stock = [p for p in products if p.stock <= LOW_STOCK_THRESHOLD]
    return {
        "total_products": len(products),
        "total_customers": db.scalar(select(func.count()).select_from(models.Customer)),
        "total_orders": db.scalar(select(func.count()).select_from(models.Order)),
        "low_stock_count": len(low_stock),
        "low_stock_products": [
            {"id": p.id, "sku": p.sku, "name": p.name, "stock": p.stock} for p in low_stock
        ],
    }
