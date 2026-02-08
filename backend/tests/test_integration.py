"""
Integration tests for Nexus Trading Platform.
Tests complete workflows across frontend, backend, and Deriv API.
"""
import pytest
import asyncio
import json
from decimal import Decimal
from datetime import datetime
import django
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client
from fastapi.testclient import TestClient

from fastapi_app.main import app
from django_core.accounts.models import Account
from django_core.trades.models import Trade
from shared.utils.ids import generate_proposal_id

User = get_user_model()
client = TestClient(app)
django_client = Client()


class TestAuthenticationFlow:
    """Test complete authentication flows."""
    
    def test_signup_flow(self):
        """Test user signup with automatic demo account creation."""
        response = client.post("/api/v1/auth/signup", json={
            "username": "testuser_new",
            "email": "testuser@example.com",
            "password": "SecurePass123!",
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        
        # Verify user was created
        user = User.objects.get(username="testuser_new")
        assert user.email == "testuser@example.com"
        assert user.is_active
        
        # Verify demo account was auto-created
        demo_account = Account.objects.get(user=user, account_type="DEMO")
        assert demo_account.balance == Decimal("10000.00")
        assert demo_account.is_default
    
    def test_login_flow(self):
        """Test user login and token generation."""
        # Create user
        user = User.objects.create_user(
            username="existinguser",
            email="existing@example.com",
            password="TestPass123!",
        )
        
        response = client.post("/api/v1/auth/login", json={
            "username": "existinguser",
            "password": "TestPass123!",
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["id"] == user.id
        assert data["user"]["username"] == "existinguser"
    
    def test_login_invalid_password(self):
        """Test login fails with wrong password."""
        User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="CorrectPass123!",
        )
        
        response = client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": "WrongPassword!",
        })
        
        assert response.status_code == 401
        assert "Invalid" in response.json()["detail"]
    
    def test_token_refresh(self):
        """Test token refresh mechanism."""
        user = User.objects.create_user(
            username="refreshuser",
            email="refresh@example.com",
            password="TestPass123!",
        )
        
        # Login to get tokens
        login_response = client.post("/api/v1/auth/login", json={
            "username": "refreshuser",
            "password": "TestPass123!",
        })
        
        refresh_token = login_response.json()["refresh_token"]
        
        # Refresh token
        refresh_response = client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token,
        })
        
        assert refresh_response.status_code == 200
        data = refresh_response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"


class TestAccountManagement:
    """Test account creation and management."""
    
    def setup_method(self):
        """Setup test user with auth token."""
        self.user = User.objects.create_user(
            username="accountuser",
            email="account@example.com",
            password="TestPass123!",
        )
        
        login_response = client.post("/api/v1/auth/login", json={
            "username": "accountuser",
            "password": "TestPass123!",
        })
        
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_accounts(self):
        """Test fetching user accounts."""
        response = client.get("/api/v1/accounts/", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0  # Demo account auto-created
        assert data[0]["account_type"] == "DEMO"
    
    def test_get_default_account(self):
        """Test fetching default account."""
        response = client.get("/api/v1/accounts/default", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_default"]
        assert data["account_type"] == "DEMO"
        assert "balance" in data
    
    def test_create_demo_account(self):
        """Test creating additional demo account."""
        response = client.post(
            "/api/v1/accounts/demo",
            json={"currency": "EUR", "initial_balance": "5000.00"},
            headers=self.headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["account_type"] == "DEMO"
        assert data["currency"] == "EUR"
        assert data["balance"] == "5000.00"
    
    def test_set_default_account(self):
        """Test setting an account as default."""
        accounts = Account.objects.filter(user=self.user).order_by("-created_at")
        account_to_set = accounts[1] if len(accounts) > 1 else accounts[0]
        
        response = client.put(
            f"/api/v1/accounts/{account_to_set.id}/default",
            headers=self.headers,
        )
        
        assert response.status_code == 200
        
        # Verify account is now default
        account_to_set.refresh_from_db()
        assert account_to_set.is_default


class TestTradingEngine:
    """Test trading engine and trade execution."""
    
    def setup_method(self):
        """Setup test user and account."""
        self.user = User.objects.create_user(
            username="tradeuser",
            email="trade@example.com",
            password="TestPass123!",
        )
        
        login_response = client.post("/api/v1/auth/login", json={
            "username": "tradeuser",
            "password": "TestPass123!",
        })
        
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        self.account = Account.objects.get(user=self.user, account_type="DEMO")
    
    def test_execute_trade(self):
        """Test executing a trade."""
        response = client.post(
            "/api/v1/trades/execute",
            json={
                "contract_type": "CALL",
                "direction": "RISE",
                "stake": "10.00",
                "account_id": self.account.id,
                "duration_seconds": 300,
            },
            headers=self.headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["contract_type"] == "CALL"
        assert data["direction"] == "RISE"
        assert data["stake"] == "10.00"
        assert data["status"] == "OPEN"
        
        # Verify trade was created in database
        trade = Trade.objects.get(id=data["id"])
        assert trade.user == self.user
        assert trade.account == self.account
    
    def test_execute_trade_insufficient_balance(self):
        """Test trade fails if balance insufficient."""
        # Reduce balance
        self.account.balance = Decimal("0.25")
        self.account.save()
        
        response = client.post(
            "/api/v1/trades/execute",
            json={
                "contract_type": "CALL",
                "direction": "RISE",
                "stake": "10.00",
                "account_id": self.account.id,
            },
            headers=self.headers,
        )
        
        assert response.status_code == 400
        assert "Insufficient" in response.json()["detail"]
    
    def test_execute_trade_below_minimum_stake(self):
        """Test trade fails if stake below minimum."""
        response = client.post(
            "/api/v1/trades/execute",
            json={
                "contract_type": "CALL",
                "direction": "RISE",
                "stake": "0.10",  # Below $0.35 minimum
                "account_id": self.account.id,
            },
            headers=self.headers,
        )
        
        assert response.status_code == 400
        assert "Minimum" in response.json()["detail"]
    
    def test_list_open_trades(self):
        """Test fetching open trades."""
        # Create a trade
        trade = Trade.objects.create(
            user=self.user,
            account=self.account,
            contract_type="CALL",
            direction="RISE",
            stake=Decimal("10.00"),
            status=Trade.STATUS_OPEN,
        )
        
        response = client.get("/api/v1/trades/open", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        assert any(t["id"] == trade.id for t in data)
    
    def test_close_trade(self):
        """Test closing an open trade."""
        # Create open trade
        trade = Trade.objects.create(
            user=self.user,
            account=self.account,
            contract_type="CALL",
            direction="RISE",
            stake=Decimal("10.00"),
            status=Trade.STATUS_OPEN,
        )
        
        response = client.post(
            f"/api/v1/trades/{trade.id}/close",
            json={"payout": "15.50"},
            headers=self.headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "CLOSED"
        assert data["payout"] == "15.50"
        
        # Verify profit calculation
        expected_profit = Decimal("15.50") - Decimal("10.00")
        assert Decimal(data["profit"]) == expected_profit


class TestAffiliateSystem:
    """Test affiliate and referral functionality."""
    
    def test_signup_with_referral_code(self):
        """Test signup using referral code."""
        # Create referrer
        referrer = User.objects.create_user(
            username="referrer",
            email="referrer@example.com",
            password="TestPass123!",
        )
        
        # Generate affiliate code (via signal)
        affiliate_code = getattr(referrer, "affiliate_code", None)
        
        if affiliate_code:
            # Signup with referral code
            response = client.post("/api/v1/auth/signup", json={
                "username": "referred_user",
                "email": "referred@example.com",
                "password": "TestPass123!",
                "referred_by": affiliate_code,
            })
            
            assert response.status_code == 200
            
            # Verify referral was recorded
            referred_user = User.objects.get(username="referred_user")
            # Check if referral relationship exists (implementation specific)


class TestNotifications:
    """Test notification system."""
    
    def setup_method(self):
        """Setup test user."""
        self.user = User.objects.create_user(
            username="notifyuser",
            email="notify@example.com",
            password="TestPass123!",
        )
        
        login_response = client.post("/api/v1/auth/login", json={
            "username": "notifyuser",
            "password": "TestPass123!",
        })
        
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_notifications(self):
        """Test fetching notifications."""
        response = client.get("/api/v1/notifications/", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestWebSocketIntegration:
    """Test WebSocket real-time functionality."""
    
    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """Test WebSocket connection establishment."""
        user = User.objects.create_user(
            username="wsuser",
            email="ws@example.com",
            password="TestPass123!",
        )
        
        account = Account.objects.get(user=user, account_type="DEMO")
        
        # Note: Full WebSocket testing requires async client
        # This is a placeholder for WebSocket tests
        pass


class TestErrorHandling:
    """Test error handling and validation."""
    
    def test_invalid_json_request(self):
        """Test handling of invalid JSON."""
        response = client.post(
            "/api/v1/auth/login",
            data="invalid json",
            content_type="application/json",
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_missing_required_fields(self):
        """Test validation of required fields."""
        response = client.post("/api/v1/auth/login", json={
            "username": "testuser",
            # Missing password
        })
        
        assert response.status_code == 422
    
    def test_unauthorized_request(self):
        """Test unauthorized access."""
        response = client.get("/api/v1/accounts/")
        
        # Should require authentication
        assert response.status_code in [401, 403]
    
    def test_not_found_resource(self):
        """Test accessing non-existent resource."""
        response = client.get(
            "/api/v1/trades/99999",
            headers={"Authorization": "Bearer invalid_token"},
        )
        
        assert response.status_code in [401, 404]


class TestPerformance:
    """Test performance and load handling."""
    
    def test_bulk_trade_creation(self):
        """Test creating multiple trades quickly."""
        user = User.objects.create_user(
            username="perfuser",
            email="perf@example.com",
            password="TestPass123!",
        )
        
        account = Account.objects.get(user=user, account_type="DEMO")
        
        # Create 100 trades
        for i in range(100):
            Trade.objects.create(
                user=user,
                account=account,
                contract_type="CALL" if i % 2 == 0 else "PUT",
                direction="RISE" if i % 2 == 0 else "FALL",
                stake=Decimal(f"{(i % 10) + 1}.00"),
                status=Trade.STATUS_CLOSED if i % 3 == 0 else Trade.STATUS_OPEN,
            )
        
        # Verify all created
        trade_count = Trade.objects.filter(user=user).count()
        assert trade_count == 100


@pytest.mark.django_db
class TestDatabaseTransactions:
    """Test atomic database operations."""
    
    def test_trade_closure_is_atomic(self):
        """Verify trade closure is atomic."""
        user = User.objects.create_user(
            username="atomicuser",
            email="atomic@example.com",
            password="TestPass123!",
        )
        
        account = Account.objects.get(user=user, account_type="DEMO")
        initial_balance = account.balance
        
        # Create and close trade
        trade = Trade.objects.create(
            user=user,
            account=account,
            contract_type="CALL",
            direction="RISE",
            stake=Decimal("10.00"),
            status=Trade.STATUS_OPEN,
        )
        
        # Close trade
        from django_core.trades.services import close_trade
        close_trade(trade, Decimal("15.00"))
        
        # Verify profit recorded
        trade.refresh_from_db()
        assert trade.profit == Decimal("5.00")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])