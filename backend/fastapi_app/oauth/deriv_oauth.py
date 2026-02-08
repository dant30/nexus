"""
Deriv OAuth2 client and handlers.
"""

from typing import Optional, Dict
import httpx
import urllib.parse

from fastapi_app.config import settings
from fastapi_app.middleware.auth import TokenManager
from shared.utils.logger import log_info, log_error, get_logger

logger = get_logger("oauth")


class DerivOAuthClient:
    """
    Deriv OAuth2 client.
    Handles authorization flow and token exchange.
    """
    
    AUTHORIZE_URL = "https://oauth.deriv.com/oauth2/authorize"
    TOKEN_URL = "https://oauth.deriv.com/oauth2/token"
    
    def __init__(self):
        """Initialize OAuth client."""
        self.app_id = settings.DERIV_APP_ID
        self.app_secret = settings.DERIV_API_KEY
        self.callback_url = settings.DERIV_OAUTH_CALLBACK_URL
    
    def get_authorization_url(self) -> str:
        """
        Generate OAuth authorization URL.
        
        Returns:
        - Authorization URL for frontend redirect
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
    
    async def exchange_code(self, code: str) -> Optional[Dict]:
        """
        Exchange authorization code for access token.
        
        Args:
        - code: Authorization code from Deriv
        
        Returns:
        - Dict with access_token, expires_in, etc. or None on error
        """
        try:
            data = {
                "grant_type": "authorization_code",
                "code": code,
                "app_id": self.app_id,
                "app_secret": self.app_secret,
                "redirect_uri": self.callback_url,
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(self.TOKEN_URL, data=data)
                
                if response.status_code == 200:
                    token_data = response.json()
                    log_info("OAuth token exchanged successfully")
                    return token_data
                else:
                    log_error(
                        "Token exchange failed",
                        status_code=response.status_code,
                        response=response.text,
                    )
                    return None
        
        except Exception as e:
            log_error("Token exchange error", exception=e)
            return None
    
    async def get_user_info(self, access_token: str) -> Optional[Dict]:
        """
        Get user info from Deriv using access token.
        
        Args:
        - access_token: OAuth access token
        
        Returns:
        - Dict with user info or None on error
        """
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.deriv.com/api/v3/accounts/user",
                    headers=headers,
                )
                
                if response.status_code == 200:
                    user_data = response.json()
                    log_info("User info fetched from Deriv")
                    return user_data
                else:
                    log_error(
                        "Failed to get user info",
                        status_code=response.status_code,
                    )
                    return None
        
        except Exception as e:
            log_error("User info fetch error", exception=e)
            return None
