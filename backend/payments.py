"""Foydalanuvchi balansi, ish haqi (wage) va pul yechish (payout) tizimi.

Barcha mablag'lar so'mda butun son sifatida saqlanadi. Balans yangilanishlari
`FOR UPDATE` qillyanadi, kiritilishi va yechilishi bir tranzaksiya ichida amalga oshadi.
"""
import os
from datetime import datetime, timezone

from fastapi import HTTPException, Request
from pydantic import BaseModel, Field

MIN_PAYOUT = int(os.getenv("MIN_PAYOUT_AMOUNT", "10000"))


class PayoutRequest(BaseModel):
    amount: int = Field(ge=1, le=10**12)
    method: str = Field(pattern=r"^(karta|click|payme|naqd)$")
    details: str = Field(min_length=1, max_length=200)


class WageAccrual(BaseModel):
    user_id: int = Field(ge=1)
    amount: int = Field(ge=1, le=10**12)
    reference: str = Field(min_length=1, max_length=200)


def _admin(request: Request, account):
    user = account(request)
    allowed = {
        value.strip()
        for value in os.getenv("PAYOUT_ADMIN_IDS", "").split(",")
        if value.strip()
    }
    if str(user["id"]) not in allowed:
        raise HTTPException(403, "Bu amal faqat administrator uchun.")
    return user


def install_payments(app, db, account):
    @app.get("/api/payments/balance")
    def balance(request: Request):
        user = account(request)
        with db() as conn:
            conn.execute(
                "INSERT INTO balances(user_id,amount) VALUES(%s,0) ON CONFLICT(user_id) DO NOTHING",
                (user["id"],),
            )
            row = conn.execute(
                "SELECT amount FROM balances WHERE user_id=%s", (user["id"],)
            ).fetchone()
        return {"amount": row["amount"], "currency": "UZS"}

    @app.get("/api/payments/transactions")
    def transactions(request: Request):
        user = account(request)
        with db() as conn:
            rows = conn.execute(
                """SELECT type, amount, reference, created
                   FROM transactions WHERE user_id=%s
                   ORDER BY created DESC LIMIT 200""",
                (user["id"],),
            ).fetchall()
        labels = {
            "wage": "Ish haqi",
            "payout": "Pul yechildi",
            "deposit": "To'ldirish",
            "commission": "Komissiya",
        }
        return [
            {
                "type": row["type"],
                "label": labels.get(row["type"], row["type"]),
                "amount": row["amount"],
                "reference": row["reference"],
                "created": row["created"].isoformat(),
            }
            for row in rows
        ]

    @app.post("/api/payments/payout-request")
    def payout_request(data: PayoutRequest, request: Request):
        user = account(request)
        if data.amount < MIN_PAYOUT:
            raise HTTPException(
                422,
                f"Minimal yechiladigan miqdor {MIN_PAYOUT:,} so'm.".replace(",", " "),
            )
        with db() as conn:
            row = conn.execute(
                "SELECT amount FROM balances WHERE user_id=%s FOR UPDATE",
                (user["id"],),
            ).fetchone()
            current = row["amount"] if row else 0
            if current < data.amount:
                raise HTTPException(409, "Balansda yetarli mablag' yo'q.")
            inserted = conn.execute(
                """INSERT INTO payout_requests(user_id,amount,method,details,status)
                   VALUES(%s,%s,%s,%s,'pending') RETURNING id""",
                (user["id"], data.amount, data.method, data.details),
            ).fetchone()
        return {
            "ok": True,
            "id": inserted["id"],
            "status": "pending",
            "detail": "Pul yechish arizangiz qabul qilindi. Administratori tasdiqlaganda mablag' yechiladi.",
        }

    @app.get("/api/payments/access")
    def access(request: Request):
        user = _admin(request, account)
        return {"admin": True, "userId": user["id"]}

    @app.get("/api/payments/payout-requests")
    def payout_requests(request: Request):
        _admin(request, account)
        with db() as conn:
            rows = conn.execute(
                """SELECT pr.id, pr.user_id, u.email, u.phone, u.name,
                          pr.amount, pr.method, pr.details, pr.status,
                          pr.created, pr.processed_at, pr.processed_by
                   FROM payout_requests pr
                   JOIN users u ON u.id = pr.user_id
                   ORDER BY pr.created DESC LIMIT 200"""
            ).fetchall()
        return [
            {
                "id": row["id"],
                "userId": row["user_id"],
                "user": row["email"] or row["phone"] or f"Foydalanuvchi #{row['user_id']}",
                "userName": row["name"],
                "amount": row["amount"],
                "method": row["method"],
                "details": row["details"],
                "status": row["status"],
                "created": row["created"].isoformat(),
                "processedAt": row["processed_at"].isoformat() if row["processed_at"] else None,
            }
            for row in rows
        ]

    @app.post("/api/payments/payout-requests/{request_id}/approve")
    def approve_payout(request_id: int, request: Request):
        admin = _admin(request, account)
        with db() as conn:
            req = conn.execute(
                """SELECT * FROM payout_requests
                   WHERE id=%s AND status='pending' FOR UPDATE""",
                (request_id,),
            ).fetchone()
            if not req:
                raise HTTPException(404, "Kutilayotgan ariz topilmadi.")
            bal = conn.execute(
                "SELECT amount FROM balances WHERE user_id=%s FOR UPDATE",
                (req["user_id"],),
            ).fetchone()
            current = bal["amount"] if bal else 0
            if current < req["amount"]:
                raise HTTPException(409, "Foydalanuvchi balansida yetarli mablag' yo'q.")
            conn.execute(
                """INSERT INTO balances(user_id,amount)
                   VALUES(%s,0) ON CONFLICT(user_id) DO NOTHING""",
                (req["user_id"],),
            )
            conn.execute(
                "UPDATE balances SET amount=amount-%s, updated=now() WHERE user_id=%s",
                (req["amount"], req["user_id"]),
            )
            conn.execute(
                """INSERT INTO transactions(user_id,type,amount,reference)
                   VALUES(%s,'payout',%s,%s)""",
                (
                    req["user_id"],
                    -req["amount"],
                    f"Pul yechildi ({req['method']}): {req['details']}",
                ),
            )
            conn.execute(
                """UPDATE payout_requests
                   SET status='paid', processed_at=now(), processed_by=%s
                   WHERE id=%s""",
                (admin["id"], request_id),
            )
        return {"ok": True, "status": "paid"}

    @app.post("/api/payments/payout-requests/{request_id}/reject")
    def reject_payout(request_id: int, request: Request):
        admin = _admin(request, account)
        with db() as conn:
            row = conn.execute(
                """UPDATE payout_requests
                   SET status='rejected', processed_at=now(), processed_by=%s
                   WHERE id=%s AND status='pending'
                   RETURNING id""",
                (admin["id"], request_id),
            ).fetchone()
            if not row:
                raise HTTPException(404, "Kutilayotgan ariz topilmadi yoki allaqachon hal qilingan.")
        return {"ok": True, "status": "rejected"}

    @app.post("/api/payments/wages")
    def accrue_wage(data: WageAccrual, request: Request):
        admin = _admin(request, account)
        with db() as conn:
            target = conn.execute(
                "SELECT id FROM users WHERE id=%s", (data.user_id,)
            ).fetchone()
            if not target:
                raise HTTPException(404, "Foydalanuvchi topilmadi.")
            conn.execute(
                """INSERT INTO balances(user_id,amount)
                   VALUES(%s,%s)
                   ON CONFLICT(user_id) DO UPDATE
                   SET amount=balances.amount+EXCLUDED.amount, updated=now()""",
                (data.user_id, data.amount),
            )
            conn.execute(
                """INSERT INTO transactions(user_id,type,amount,reference)
                   VALUES(%s,'wage',%s,%s)""",
                (data.user_id, data.amount, data.reference),
            )
            conn.execute(
                """INSERT INTO wages(user_id,amount,reference,processed_by,created)
                   VALUES(%s,%s,%s,%s,now())""",
                (data.user_id, data.amount, data.reference, admin["id"]),
            )
        return {
            "ok": True,
            "userId": data.user_id,
            "amount": data.amount,
            "detail": f"Ish haqi {data.amount:,} so'm hisobga o'tkazildi.".replace(",", " "),
        }

    @app.get("/api/payments/wages")
    def list_wages(request: Request):
        _admin(request, account)
        with db() as conn:
            rows = conn.execute(
                """SELECT w.id, w.user_id, u.email, u.phone, u.name,
                          w.amount, w.reference, w.created, w.processed_by
                   FROM wages w JOIN users u ON u.id = w.user_id
                   ORDER BY w.created DESC LIMIT 200"""
            ).fetchall()
        return [
            {
                "id": row["id"],
                "userId": row["user_id"],
                "user": row["email"] or row["phone"] or f"Foydalanuvchi #{row['user_id']}",
                "userName": row["name"],
                "amount": row["amount"],
                "reference": row["reference"],
                "created": row["created"].isoformat(),
            }
            for row in rows
        ]