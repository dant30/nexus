"""
Admin routes for global operational datasets.
Exposes system-wide users/accounts/trades analytics for admin-only UI.
"""
from datetime import timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from asgiref.sync import sync_to_async
from django.db.models import Q
from django.utils import timezone

import django
django.setup()

from django.contrib.auth import get_user_model
from django_core.accounts.models import Account
from django_core.trades.models import Trade
from fastapi_app.deps import CurrentUser, get_current_user
from shared.utils.logger import log_error, get_logger

logger = get_logger("admin")
User = get_user_model()

router = APIRouter(tags=["Admin"])


def _to_decimal(value) -> Decimal:
    try:
        return Decimal(str(value or 0))
    except Exception:
        return Decimal("0")


def _to_float(value) -> float:
    return float(_to_decimal(value))


def _safe_win_rate(wins: int, total: int) -> float:
    return float((wins / total) * 100) if total > 0 else 0.0


def _derive_symbol(trade: Trade) -> str:
    signal_id = str(getattr(trade, "signal_id", "") or "")
    if signal_id.startswith("sig-"):
        parts = signal_id.split("-")
        if len(parts) >= 2 and parts[1]:
            return parts[1]
    return "UNKNOWN"


@sync_to_async
def _require_admin_user(user_id: int):
    user = User.objects.filter(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not (bool(getattr(user, "is_staff", False)) or bool(getattr(user, "is_superuser", False))):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/overview")
async def get_admin_overview(current_user: CurrentUser = Depends(get_current_user)):
    """Global admin overview metrics."""
    try:
        await _require_admin_user(current_user.user_id)

        total_users = await sync_to_async(User.objects.count)()
        total_accounts = await sync_to_async(Account.objects.count)()
        open_trades = await sync_to_async(Trade.objects.filter(status=Trade.STATUS_OPEN).count)()
        closed_trades = await sync_to_async(
            Trade.objects.exclude(status=Trade.STATUS_OPEN).count
        )()

        closed_rows = await sync_to_async(
            list
        )(Trade.objects.exclude(status=Trade.STATUS_OPEN).only("profit", "stake"))
        wins = 0
        total_profit = Decimal("0")
        total_stake = Decimal("0")
        for trade in closed_rows:
            profit = _to_decimal(getattr(trade, "profit", 0))
            stake = _to_decimal(getattr(trade, "stake", 0))
            if profit > 0:
                wins += 1
            total_profit += profit
            total_stake += stake

        return {
            "users": total_users,
            "accounts": total_accounts,
            "open_trades": open_trades,
            "closed_trades": closed_trades,
            "win_rate": _safe_win_rate(wins, closed_trades),
            "net_profit": _to_float(total_profit),
            "roi": float((total_profit / total_stake) * 100) if total_stake > 0 else 0.0,
        }
    except HTTPException:
        raise
    except Exception as exc:
        log_error("Failed to fetch admin overview", exception=exc)
        raise HTTPException(status_code=500, detail="Failed to fetch admin overview")


@router.get("/users")
async def list_admin_users(
    search: str = "",
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Global user list with account/trade metrics."""
    try:
        await _require_admin_user(current_user.user_id)

        user_qs = User.objects.all().order_by("-id")
        if search:
            token = search.strip()
            user_qs = user_qs.filter(
                Q(username__icontains=token)
                | Q(email__icontains=token)
                | Q(first_name__icontains=token)
                | Q(last_name__icontains=token)
            )

        total = await sync_to_async(user_qs.count)()
        users = await sync_to_async(list)(user_qs[offset : offset + limit])
        user_ids = [u.id for u in users]

        accounts = await sync_to_async(list)(
            Account.objects.filter(user_id__in=user_ids).only("id", "user_id", "currency")
        )
        trades = await sync_to_async(list)(
            Trade.objects.filter(user_id__in=user_ids).only("id", "user_id", "status", "profit", "stake")
        )

        account_count: Dict[int, int] = {}
        currencies: Dict[int, set] = {}
        for account in accounts:
            account_count[account.user_id] = account_count.get(account.user_id, 0) + 1
            currencies.setdefault(account.user_id, set()).add(account.currency or "USD")

        trade_agg: Dict[int, Dict[str, Decimal | int]] = {}
        for trade in trades:
            agg = trade_agg.setdefault(
                trade.user_id,
                {
                    "total": 0,
                    "closed": 0,
                    "open": 0,
                    "wins": 0,
                    "losses": 0,
                    "net": Decimal("0"),
                    "stake": Decimal("0"),
                },
            )
            agg["total"] = int(agg["total"]) + 1
            status = str(trade.status or "").upper()
            profit = _to_decimal(getattr(trade, "profit", 0))
            stake = _to_decimal(getattr(trade, "stake", 0))

            if status == Trade.STATUS_OPEN:
                agg["open"] = int(agg["open"]) + 1
            else:
                agg["closed"] = int(agg["closed"]) + 1
                agg["net"] = _to_decimal(agg["net"]) + profit
                agg["stake"] = _to_decimal(agg["stake"]) + stake
                if profit > 0:
                    agg["wins"] = int(agg["wins"]) + 1
                elif profit < 0:
                    agg["losses"] = int(agg["losses"]) + 1

        rows: List[Dict] = []
        for user in users:
            agg = trade_agg.get(user.id, {})
            full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
            role = "superadmin" if getattr(user, "is_superuser", False) else "admin" if getattr(user, "is_staff", False) else "user"
            closed_trades = int(agg.get("closed", 0))
            wins = int(agg.get("wins", 0))
            net = _to_decimal(agg.get("net", 0))
            user_currencies = sorted(list(currencies.get(user.id, {"USD"})))

            rows.append(
                {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "name": full_name or user.username,
                    "role": role,
                    "is_active": bool(user.is_active),
                    "is_staff": bool(user.is_staff),
                    "is_superuser": bool(user.is_superuser),
                    "account_count": account_count.get(user.id, 0),
                    "total_trades": int(agg.get("total", 0)),
                    "closed_trades": closed_trades,
                    "open_trades": int(agg.get("open", 0)),
                    "wins": wins,
                    "losses": int(agg.get("losses", 0)),
                    "win_rate": _safe_win_rate(wins, closed_trades),
                    "net_profit": _to_float(net),
                    "gross_stake": _to_float(agg.get("stake", 0)),
                    "currencies": user_currencies,
                    "created_at": user.created_at.isoformat() if hasattr(user, "created_at") else None,
                    "updated_at": user.updated_at.isoformat() if hasattr(user, "updated_at") else None,
                }
            )

        return {
            "items": rows,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except HTTPException:
        raise
    except Exception as exc:
        log_error("Failed to list admin users", exception=exc)
        raise HTTPException(status_code=500, detail="Failed to list users")


@router.get("/accounts")
async def list_admin_accounts(
    search: str = "",
    limit: int = Query(default=80, ge=1, le=300),
    offset: int = Query(default=0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Global accounts list with trade metrics."""
    try:
        await _require_admin_user(current_user.user_id)

        account_qs = Account.objects.select_related("user").all().order_by("-updated_at")
        if search:
            token = search.strip()
            account_qs = account_qs.filter(
                Q(account_id__icontains=token)
                | Q(user__username__icontains=token)
                | Q(user__email__icontains=token)
            )

        total = await sync_to_async(account_qs.count)()
        accounts = await sync_to_async(list)(account_qs[offset : offset + limit])
        account_ids = [acc.id for acc in accounts]

        trades = await sync_to_async(list)(
            Trade.objects.filter(account_id__in=account_ids).only("account_id", "status", "profit", "stake")
        )

        per_account: Dict[int, Dict[str, Decimal | int]] = {}
        for trade in trades:
            agg = per_account.setdefault(
                trade.account_id,
                {
                    "total": 0,
                    "closed": 0,
                    "open": 0,
                    "wins": 0,
                    "losses": 0,
                    "net": Decimal("0"),
                },
            )
            agg["total"] = int(agg["total"]) + 1
            status = str(trade.status or "").upper()
            profit = _to_decimal(getattr(trade, "profit", 0))
            if status == Trade.STATUS_OPEN:
                agg["open"] = int(agg["open"]) + 1
            else:
                agg["closed"] = int(agg["closed"]) + 1
                agg["net"] = _to_decimal(agg["net"]) + profit
                if profit > 0:
                    agg["wins"] = int(agg["wins"]) + 1
                elif profit < 0:
                    agg["losses"] = int(agg["losses"]) + 1

        rows = []
        for account in accounts:
            agg = per_account.get(account.id, {})
            closed_trades = int(agg.get("closed", 0))
            wins = int(agg.get("wins", 0))
            rows.append(
                {
                    "id": account.id,
                    "account_id": account.account_id,
                    "account_type": account.account_type,
                    "currency": account.currency,
                    "balance": _to_float(account.balance),
                    "is_default": bool(account.is_default),
                    "status": account.status,
                    "user_id": account.user_id,
                    "user_username": getattr(account.user, "username", None),
                    "user_email": getattr(account.user, "email", None),
                    "trades": int(agg.get("total", 0)),
                    "closed_trades": closed_trades,
                    "open_trades": int(agg.get("open", 0)),
                    "wins": wins,
                    "losses": int(agg.get("losses", 0)),
                    "win_rate": _safe_win_rate(wins, closed_trades),
                    "net_profit": _to_float(agg.get("net", 0)),
                    "recovery_active": bool(account.recovery_active),
                    "recovery_level": int(account.recovery_level or 0),
                    "updated_at": account.updated_at.isoformat() if account.updated_at else None,
                    "created_at": account.created_at.isoformat() if account.created_at else None,
                }
            )

        return {
            "items": rows,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except HTTPException:
        raise
    except Exception as exc:
        log_error("Failed to list admin accounts", exception=exc)
        raise HTTPException(status_code=500, detail="Failed to list accounts")


@router.get("/analytics")
async def get_admin_analytics(
    days: int = Query(default=30, ge=1, le=365),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Global analytics summary and grouped datasets."""
    try:
        await _require_admin_user(current_user.user_id)

        since = timezone.now() - timedelta(days=days)
        trades = await sync_to_async(list)(
            Trade.objects.filter(created_at__gte=since).select_related("account")
        )
        accounts = await sync_to_async(list)(
            Account.objects.select_related("user").all()
        )

        closed = [t for t in trades if str(t.status or "").upper() != Trade.STATUS_OPEN]
        wins = 0
        net_profit = Decimal("0")
        for trade in closed:
            profit = _to_decimal(trade.profit)
            net_profit += profit
            if profit > 0:
                wins += 1

        per_account: Dict[int, Dict] = {}
        account_lookup = {acc.id: acc for acc in accounts}
        for trade in closed:
            key = int(trade.account_id or 0)
            if not key:
                continue
            row = per_account.setdefault(
                key,
                {"account_id": key, "trades": 0, "wins": 0, "losses": 0, "pnl": Decimal("0")},
            )
            profit = _to_decimal(trade.profit)
            row["trades"] += 1
            row["pnl"] += profit
            if profit > 0:
                row["wins"] += 1
            elif profit < 0:
                row["losses"] += 1

        per_symbol: Dict[str, Dict] = {}
        for trade in closed:
            symbol = _derive_symbol(trade)
            row = per_symbol.setdefault(
                symbol, {"symbol": symbol, "trades": 0, "wins": 0, "losses": 0, "pnl": Decimal("0")}
            )
            profit = _to_decimal(trade.profit)
            row["trades"] += 1
            row["pnl"] += profit
            if profit > 0:
                row["wins"] += 1
            elif profit < 0:
                row["losses"] += 1

        accounts_rows = []
        for account_id, row in per_account.items():
            account = account_lookup.get(account_id)
            trades_count = int(row["trades"])
            wins_count = int(row["wins"])
            accounts_rows.append(
                {
                    "id": account_id,
                    "account_label": (account.account_id if account else account_id),
                    "account_type": (account.account_type if account else "UNKNOWN"),
                    "currency": (account.currency if account else "USD"),
                    "balance": _to_float(account.balance if account else 0),
                    "trades": trades_count,
                    "wins": wins_count,
                    "losses": int(row["losses"]),
                    "win_rate": _safe_win_rate(wins_count, trades_count),
                    "pnl": _to_float(row["pnl"]),
                }
            )

        symbols_rows = []
        for symbol, row in per_symbol.items():
            trades_count = int(row["trades"])
            wins_count = int(row["wins"])
            symbols_rows.append(
                {
                    "symbol": symbol,
                    "trades": trades_count,
                    "wins": wins_count,
                    "losses": int(row["losses"]),
                    "win_rate": _safe_win_rate(wins_count, trades_count),
                    "pnl": _to_float(row["pnl"]),
                }
            )

        symbols_rows.sort(key=lambda r: r["trades"], reverse=True)
        accounts_rows.sort(key=lambda r: r["trades"], reverse=True)

        return {
            "summary": {
                "closed_trades": len(closed),
                "open_trades": len(trades) - len(closed),
                "win_rate": _safe_win_rate(wins, len(closed)),
                "net_profit": _to_float(net_profit),
            },
            "accounts": accounts_rows,
            "symbols": symbols_rows,
            "window_days": days,
        }
    except HTTPException:
        raise
    except Exception as exc:
        log_error("Failed to fetch admin analytics", exception=exc)
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")


@router.get("/commissions")
async def get_admin_commissions(
    limit: int = Query(default=100, ge=1, le=300),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Global commission rows (latest settled trades) and totals."""
    try:
        await _require_admin_user(current_user.user_id)

        qs = Trade.objects.exclude(status=Trade.STATUS_OPEN).select_related("account", "user").order_by("-updated_at")
        total = await sync_to_async(qs.count)()
        all_rows = await sync_to_async(list)(qs[: max(limit, 300)])

        totals_commission = Decimal("0")
        totals_profit = Decimal("0")
        rows = []
        for trade in all_rows:
            commission = _to_decimal(trade.commission_applied)
            profit = _to_decimal(trade.profit)
            totals_commission += commission
            totals_profit += profit
            rows.append(
                {
                    "id": trade.id,
                    "time": trade.updated_at.isoformat() if trade.updated_at else None,
                    "account_label": getattr(trade.account, "account_id", None) or trade.account_id,
                    "account_id": trade.account_id,
                    "user_id": trade.user_id,
                    "username": getattr(trade.user, "username", None),
                    "symbol": _derive_symbol(trade),
                    "stake": _to_float(trade.stake),
                    "commission": _to_float(commission),
                    "profit": _to_float(profit),
                    "status": trade.status,
                    "currency": getattr(trade.account, "currency", "USD"),
                }
            )

        return {
            "items": rows[:limit],
            "total": total,
            "totals": {
                "commission": _to_float(totals_commission),
                "profit": _to_float(totals_profit),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        log_error("Failed to fetch admin commissions", exception=exc)
        raise HTTPException(status_code=500, detail="Failed to fetch commissions")


@router.get("/audit")
async def get_admin_audit(
    limit: int = Query(default=120, ge=10, le=500),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Synthetic audit feed from latest trade/account/user changes.
    """
    try:
        await _require_admin_user(current_user.user_id)

        trade_rows = await sync_to_async(list)(
            Trade.objects.select_related("account", "user").order_by("-updated_at")[:limit]
        )
        account_rows = await sync_to_async(list)(
            Account.objects.select_related("user").order_by("-updated_at")[:limit]
        )
        user_rows = await sync_to_async(list)(
            User.objects.order_by("-updated_at")[:limit]
        )

        events: List[Dict] = []

        for trade in trade_rows:
            status = str(trade.status or "").upper()
            level = "ERROR" if status in {Trade.STATUS_FAILED, Trade.STATUS_CANCELLED} else "INFO"
            events.append(
                {
                    "id": f"trade-{trade.id}-{int(trade.updated_at.timestamp()) if trade.updated_at else 0}",
                    "timestamp": trade.updated_at.isoformat() if trade.updated_at else None,
                    "level": level,
                    "category": "trade",
                    "account_label": getattr(trade.account, "account_id", None) or trade.account_id,
                    "user": getattr(trade.user, "username", None),
                    "message": f"Trade {trade.id} updated to {status}",
                    "meta": f"symbol={_derive_symbol(trade)} pnl={_to_float(trade.profit):.2f}",
                }
            )

        for account in account_rows:
            events.append(
                {
                    "id": f"account-{account.id}-{int(account.updated_at.timestamp()) if account.updated_at else 0}",
                    "timestamp": account.updated_at.isoformat() if account.updated_at else None,
                    "level": "INFO",
                    "category": "account",
                    "account_label": account.account_id,
                    "user": getattr(account.user, "username", None),
                    "message": f"Account {account.account_id} updated",
                    "meta": f"balance={_to_float(account.balance):.2f} {account.currency}",
                }
            )

        for user in user_rows:
            events.append(
                {
                    "id": f"user-{user.id}-{int(user.updated_at.timestamp()) if user.updated_at else 0}",
                    "timestamp": user.updated_at.isoformat() if user.updated_at else None,
                    "level": "INFO",
                    "category": "user",
                    "account_label": "-",
                    "user": user.username,
                    "message": f"User {user.username} profile updated",
                    "meta": f"is_staff={bool(user.is_staff)}",
                }
            )

        events = [e for e in events if e.get("timestamp")]
        events.sort(key=lambda e: e["timestamp"], reverse=True)

        return {
            "items": events[:limit],
            "total": len(events),
            "limit": limit,
        }
    except HTTPException:
        raise
    except Exception as exc:
        log_error("Failed to fetch admin audit feed", exception=exc)
        raise HTTPException(status_code=500, detail="Failed to fetch audit feed")
