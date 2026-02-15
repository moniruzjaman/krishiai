"""
Firebase Authentication Service Implementation

Handles all Firebase authentication operations for the Krishi AI platform.
"""

import json
from typing import Dict, Optional, Tuple

import requests
from app_config import settings


class FirebaseAuthService:
    """
    Service class for Firebase Authentication operations.
    """

    def __init__(self):
        self.api_key = settings.firebase_api_key
        self.base_url = f"https://identitytoolkit.googleapis.com/v1/accounts"

    def create_user(self, email: str, password: str, display_name: str = None) -> Dict:
        """
        Create a new user account in Firebase.

        Args:
            email: User's email address
            password: User's password
            display_name: Optional display name for the user

        Returns:
            Dict containing the user creation response
        """
        url = f"{self.base_url}:signUp?key={self.api_key}"

        payload = {"email": email, "password": password, "returnSecureToken": True}

        if display_name:
            payload["displayName"] = display_name

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to create user: {str(e)}")

    def sign_in_user(self, email: str, password: str) -> Dict:
        """
        Sign in an existing user.

        Args:
            email: User's email address
            password: User's password

        Returns:
            Dict containing authentication tokens and user info
        """
        url = f"{self.base_url}:signInWithPassword?key={self.api_key}"

        payload = {"email": email, "password": password, "returnSecureToken": True}

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to sign in user: {str(e)}")

    def verify_token(self, id_token: str) -> Dict:
        """
        Verify a Firebase ID token and get user information.

        Args:
            id_token: Firebase ID token to verify

        Returns:
            Dict containing user information
        """
        url = f"https://identitytoolkit.googleapis.com/v1/token?key={self.api_key}"

        payload = {"idToken": id_token}

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to verify token: {str(e)}")

    def refresh_token(self, refresh_token: str) -> Dict:
        """
        Refresh an expired ID token using a refresh token.

        Args:
            refresh_token: Firebase refresh token

        Returns:
            Dict containing new tokens
        """
        url = f"https://securetoken.googleapis.com/v1/token?key={self.api_key}"

        payload = {"grant_type": "refresh_token", "refresh_token": refresh_token}

        try:
            response = requests.post(url, data=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to refresh token: {str(e)}")

    def reset_password(self, email: str) -> Dict:
        """
        Send a password reset email to the user.

        Args:
            email: User's email address

        Returns:
            Dict containing the response
        """
        url = f"{self.base_url}:sendOobCode?key={self.api_key}"

        payload = {"requestType": "PASSWORD_RESET", "email": email}

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to send password reset email: {str(e)}")

    def update_profile(
        self, id_token: str, display_name: str = None, photo_url: str = None
    ) -> Dict:
        """
        Update a user's profile information.

        Args:
            id_token: Firebase ID token
            display_name: New display name (optional)
            photo_url: New photo URL (optional)

        Returns:
            Dict containing the updated user information
        """
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:update?key={self.api_key}"

        payload = {"idToken": id_token}

        if display_name is not None:
            payload["displayName"] = display_name

        if photo_url is not None:
            payload["photoUrl"] = photo_url

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to update profile: {str(e)}")

    def delete_user(self, id_token: str) -> Dict:
        """
        Delete a user account.

        Args:
            id_token: Firebase ID token

        Returns:
            Dict containing the response
        """
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:delete?key={self.api_key}"

        payload = {"idToken": id_token}

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to delete user: {str(e)}")
