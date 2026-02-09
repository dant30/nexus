"""
Deriv OAuth2 client and handlers.
"""

from typing import Optional, Dict
import asyncio
import json
import httpx
import urllib.parse
import websockets
import socket

from fastapi_app.config import settings
from shared.utils.logger import log_info, log_error, get_logger

socket.setdefaulttimeout(15)
logger = get_logger("oauth")


class DerivOAuthClient:
    """
    Deriv OAuth2 client.
    Handles authorization flow, token exchange, and account data.
    """

    AUTHORIZE_URL = "https://oauth.deriv.com/oauth2/authorize"
    TOKEN_URL = "https://oauth.deriv.com/oauth2/token"
    WS_BASE_URL = "wss://ws.derivws.com/websockets/v3"

    def __init__(self):
        self.app_id = settings.DERIV_APP_ID
        self.app_secret = settings.DERIV_API_KEY
        self.callback_url = settings.DERIV_OAUTH_CALLBACK_URL

    # ------------------------------------------------------------------
    # OAuth Authorization
    # ------------------------------------------------------------------

    def get_authorization_url(self) -> str:
        """
        Generate OAuth authorization URL for frontend redirect.
        """
        params = {
            "app_id": self.app_id,
            "scope": "read write",
            "redirect_uri": self.callback_url,
            "response_type": "code",
        }

        url = f"{self.AUTHORIZE_URL}?{urllib.parse.urlencode(params)}"
        log_info("OAuth authorization URL generated")
        return url

    # ------------------------------------------------------------------
    # Token Exchange
    # ------------------------------------------------------------------

    async def exchange_code(self, code: str) -> Optional[Dict]:
        """
        Exchange authorization code for access token.
        """
        try:
            data = {
                "grant_type": "authorization_code",
                "code": code,
                "app_id": self.app_id,
                "app_secret": self.app_secret,
                "redirect_uri": self.callback_url,
            }

            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(self.TOKEN_URL, data=data)

            if response.status_code != 200:
                log_error(
                    "Token exchange failed",
                    status_code=response.status_code,
                    response=response.text,
                )
                return None

            log_info("OAuth token exchanged successfully")
            return response.json()

        except Exception as e:
            log_error("Token exchange error", exception=e)
            return None

    # ------------------------------------------------------------------
    # User Info
    # ------------------------------------------------------------------

    async def get_user_info(self, access_token: str) -> Optional[Dict]:
        """
        Fetch authenticated user info from Deriv.
        """
        ws_url = f"{self.WS_BASE_URL}?app_id={self.app_id}"

        try:
            async with websockets.connect(
                ws_url,
                ping_interval=20,
                close_timeout=10,
                max_queue=32,
            ) as ws:
                await ws.send(json.dumps({"authorize": access_token}))
                raw = await asyncio.wait_for(ws.recv(), timeout=10)

            response = json.loads(raw)

            if response.get("error"):
                log_error(
                    "Deriv authorize failed",
                    code=response["error"].get("code"),
                    message=response["error"].get("message"),
                )
                return None

            user = response.get("authorize")
            if not user:
                log_error("Unexpected Deriv authorize response", response=response)
                return None

            log_info(
                "User info fetched from Deriv",
                deriv_user_id=user.get("user_id"),
            )
            return user

        except socket.gaierror as e:
            log_error(
                "Deriv WebSocket DNS resolution failed",
                exception=e,
                ws_url=ws_url,
            )
            return None

        except asyncio.TimeoutError as e:
            log_error(
                "Deriv WebSocket timeout",
                exception=e,
                ws_url=ws_url,
            )
            return None

        except Exception as e:
            log_error("User info fetch error", exception=e)
            return None

    # ------------------------------------------------------------------
    # Balance
    # ------------------------------------------------------------------

    async def get_balance(self, access_token: str) -> Optional[Dict]:
        """
        Fetch live account balance from Deriv.
        """
        ws_url = f"{self.WS_BASE_URL}?app_id={self.app_id}"

        try:
            async with websockets.connect(
                ws_url,
                ping_interval=20,
                close_timeout=10,
                max_queue=32,
            ) as ws:
                # Authorize
                await ws.send(json.dumps({"authorize": access_token}))
                raw_auth = await asyncio.wait_for(ws.recv(), timeout=10)
                auth_response = json.loads(raw_auth)

                if auth_response.get("error"):
                    log_error(
                        "Deriv authorize failed (balance)",
                        code=auth_response["error"].get("code"),
                        message=auth_response["error"].get("message"),
                    )
                    return None

                # Request balance
                await ws.send(json.dumps({"balance": 1}))
                raw_balance = await asyncio.wait_for(ws.recv(), timeout=10)

            balance_response = json.loads(raw_balance)

            if balance_response.get("error"):
                log_error(
                    "Deriv balance fetch failed",
                    code=balance_response["error"].get("code"),
                    message=balance_response["error"].get("message"),
                )
                return None

            balance = balance_response.get("balance")
            if not balance:
                log_error(
                    "Unexpected Deriv balance response",
                    response=balance_response,
                )
                return None

            return balance

        except socket.gaierror as e:
            log_error(
                "Deriv WebSocket DNS resolution failed (balance)",
                exception=e,
                ws_url=ws_url,
                environment="render",
            )
            return None

        except asyncio.TimeoutError as e:
            log_error(
                "Deriv WebSocket timeout (balance)",
                exception=e,
                ws_url=ws_url,
            )
            return None

        except Exception as e:
            log_error("Balance fetch error", exception=e)
            return None
