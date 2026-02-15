Firebase Alerts Service Implementation

Handles all Firebase Cloud Messaging (FCM) operations for the Krishi AI platform.
"""

import json
import time
import uuid
from typing import Dict, List, Optional
from datetime import datetime

import requests
from app_config import settings


class FirebaseAlertsService:
    """
    Service class for Firebase Cloud Messaging (FCM) operations.
    """

    def __init__(self):
        self.project_id = settings.firebase_project_id
        self.credentials_path = getattr(settings, "firebase_credentials_path", None)
        self.access_token = None
        self.token_expiry = None

    def _get_access_token(self) -> str:
        """
        Get OAuth2 access token for Firebase API authentication.

        Returns:
            Access token string
        """
        # Check if we have a valid token and it's not expired
        if self.access_token and self.token_expiry and datetime.now() < self.token_expiry:
            return self.access_token

        # If credentials path is provided, use service account authentication
        if self.credentials_path:
            return self._authenticate_with_service_account()

        # Otherwise use API key (simplified approach)
        return settings.firebase_api_key

    def _authenticate_with_service_account(self) -> str:
        """
        Authenticate using service account credentials.

        Returns:
            Access token string
        """
        try:
            # Load service account credentials
            with open(self.credentials_path, "r") as f:
                credentials = json.load(f)

            # Get OAuth2 token
            auth_url = "https://oauth2.googleapis.com/token"
            payload = {
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": self._create_jwt(credentials),
            }

            response = requests.post(auth_url, data=payload)
            response.raise_for_status()

            token_data = response.json()
            self.access_token = token_data["access_token"]

            # Set token expiry (with a small buffer)
            expires_in = token_data.get("expires_in", 3600)
            self.token_expiry = datetime.now().timestamp() + expires_in - 300

            return self.access_token
        except Exception as e:
            raise Exception(f"Failed to authenticate with service account: {str(e)}")

    def _create_jwt(self, credentials: Dict) -> str:
        """
        Create JWT for service account authentication.

        Args:
            credentials: Service account credentials

        Returns:
            JWT string
        """
        # This is a simplified version of JWT creation
        # In production, you would use a proper JWT library like PyJWT
        import base64
        import hashlib
        import hmac

        header = {"alg": "RS256", "typ": "JWT"}

        now = int(time.time())
        payload = {
            "iss": credentials["client_email"],
            "scope": "https://www.googleapis.com/auth/firebase.messaging",
            "aud": "https://oauth2.googleapis.com/token",
            "exp": now + 3600,
            "iat": now,
        }

        # Encode header and payload
        encoded_header = (
            base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
        )
        encoded_payload = (
            base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
        )

        # Create signature (simplified)
        signature_input = f"{encoded_header}.{encoded_payload}"

        # In production, you would sign with the private key from credentials
        # This is a placeholder - actual implementation would use cryptography or similar
        signature = "placeholder_signature"

        return f"{signature_input}.{signature}"

    def send_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Dict = None,
        image_url: str = None,
    ) -> Dict:
        """
        Send a push notification to a specific device.

        Args:
            token: FCM device token
            title: Notification title
            body: Notification body
            data: Optional additional data payload
            image_url: Optional image URL for the notification

        Returns:
            Dict containing the response
        """
        access_token = self._get_access_token()

        url = f"https://fcm.googleapis.com/v1/projects/{self.project_id}/messages:send"

        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

        message = {
            "message": {
                "token": token,
                "notification": {"title": title, "body": body},
                "android": {
                    "priority": "high",
                    "notification": {
                        "sound": "default",
                        "click_action": "FLUTTER_NOTIFICATION_CLICK",
                    },
                },
                "apns": {
                    "payload": {
                        "aps": {"sound": "default", "badge": 1},
                    }
                },
            }
        }

        # Add image if provided
        if image_url:
            message["message"]["android"]["notification"]["image"] = image_url
            message["message"]["apns"]["fcm_options"] = {"image": image_url}

        # Add data payload if provided
        if data:
            message["message"]["data"] = {k: str(v) for k, v in data.items()}

        try:
            response = requests.post(url, headers=headers, json=message)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to send notification: {str(e)}")

    def send_topic_notification(
        self,
        topic: str,
        title: str,
        body: str,
        data: Dict = None,
        image_url: str = None,
    ) -> Dict:
        """
        Send a push notification to all devices subscribed to a topic.

        Args:
            topic: FCM topic name
            title: Notification title
            body: Notification body
            data: Optional additional data payload
            image_url: Optional image URL for the notification

        Returns:
            Dict containing the response
        """
        access_token = self._get_access_token()

        url = f"https://fcm.googleapis.com/v1/projects/{self.project_id}/messages:send"

        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

        message = {
            "message": {
                "topic": topic,
                "notification": {"title": title, "body": body},
                "android": {
                    "priority": "high",
                    "notification": {
                        "sound": "default",
                        "click_action": "FLUTTER_NOTIFICATION_CLICK",
                    },
                },
                "apns": {
                    "payload": {
                        "aps": {"sound": "default", "badge": 1},
                    }
                },
            }
        }

        # Add image if provided
        if image_url:
            message["message"]["android"]["notification"]["image"] = image_url
            message["message"]["apns"]["fcm_options"] = {"image": image_url}

        # Add data payload if provided
        if data:
            message["message"]["data"] = {k: str(v) for k, v in data.items()}

        try:
            response = requests.post(url, headers=headers, json=message)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to send topic notification: {str(e)}")

    def subscribe_to_topic(self, tokens: List[str], topic: str) -> Dict:
        """
        Subscribe device tokens to a topic.

        Args:
            tokens: List of FCM device tokens
            topic: Topic name to subscribe to

        Returns:
            Dict containing the response
        """
        access_token = self._get_access_token()

        url = "https://iid.googleapis.com/iid/v1:batchAdd"

        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

        payload = {"to": f"/topics/{topic}", "registration_tokens": tokens}

        try:
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to subscribe to topic: {str(e)}")

    def unsubscribe_from_topic(self, tokens: List[str], topic: str) -> Dict:
        """
        Unsubscribe device tokens from a topic.

        Args:
            tokens: List of FCM device tokens
            topic: Topic name to unsubscribe from

        Returns:
            Dict containing the response
        """
        access_token = self._get_access_token()

        url = "https://iid.googleapis.com/iid/v1:batchRemove"

        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

        payload = {"to": f"/topics/{topic}", "registration_tokens": tokens}

        try:
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to unsubscribe from topic: {str(e)}")

    def send_crop_diagnosis_alert(self, user_id: str, diagnosis_data: Dict) -> Dict:
        """
        Send a specialized alert for crop diagnosis results.

        Args:
            user_id: Firebase user ID
            diagnosis_data: Dictionary containing diagnosis information
                {
                    "crop_type": "wheat",
                    "disease": "rust",
                    "confidence": 0.95,
                    "recommendations": ["Use fungicide", "Adjust irrigation"]
                }

        Returns:
            Dict containing the response
        """
        # Get user's FCM tokens from Firestore
        try:
            user_tokens = self._get_user_tokens(user_id)

            if not user_tokens:
                return {"error": "No FCM tokens found for user"}

            # Create notification content based on diagnosis
            title = f"Crop Diagnosis: {diagnosis_data.get('disease', 'Unknown').title()}"
            body = f"Detected in {diagnosis_data.get('crop_type', 'crop')} with {int(diagnosis_data.get('confidence', 0) * 100)}% confidence"

            # Add recommendations to data payload
            data = {
                "type": "crop_diagnosis",
                "crop_type": diagnosis_data.get("crop_type", ""),
                "disease": diagnosis_data.get("disease", ""),
                "confidence": str(diagnosis_data.get("confidence", 0)),
                "recommendations": json.dumps(diagnosis_data.get("recommendations", [])),
            }

            # Send to all user tokens
            results = []
            for token in user_tokens:
                try:
                    result = self.send_notification(token, title, body, data)
                    results.append(result)
                except Exception as e:
                    results.append({"error": str(e)})

            return {"results": results}
        except Exception as e:
            raise Exception(f"Failed to send crop diagnosis alert: {str(e)}")

    def send_market_price_alert(self, user_id: str, market_data: Dict) -> Dict:
        """
        Send an alert for market price changes.

        Args:
            user_id: Firebase user ID
            market_data: Dictionary containing market information
                {
                    "crop": "wheat",
                    "current_price": 2500,
                    "previous_price": 2300,
                    "change": 200,
                    "change_percent": 8.7,
                    "market": "local"
                }

        Returns:
            Dict containing the response
        """
        try:
            user_tokens = self._get_user_tokens(user_id)

            if not user_tokens:
                return {"error": "No FCM tokens found for user"}

            # Create notification content based on market data
            crop = market_data.get("crop", "crop")
            change = market_data.get("change", 0)
            change_percent = market_data.get("change_percent", 0)

            if change >= 0:
                title = f"Price Increase: {crop.title()}"
                body = f"Up by ₹{change} ({change_percent}%) to ₹{market_data.get('current_price', 0)}/quintal"
            else:
                title = f"Price Decrease: {crop.title()}"
                body = f"Down by ₹{abs(change)} ({abs(change_percent)}%) to ₹{market_data.get('current_price', 0)}/quintal"

            # Add market data to data payload
            data = {
                "type": "market_price",
                "crop": market_data.get("crop", ""),
                "current_price": str(market_data.get("current_price", 0)),
                "previous_price": str(market_data.get("previous_price", 0)),
                "change": str(market_data.get("change", 0)),
                "change_percent": str(market_data.get("change_percent", 0)),
                "market": market_data.get("market", ""),
            }

            # Send to all user tokens
            results = []
            for token in user_tokens:
                try:
                    result = self.send_notification(token, title, body, data)
                    results.append(result)
                except Exception as e:
                    results.append({"error": str(e)})

            return {"results": results}
        except Exception as e:
            raise Exception(f"Failed to send market price alert: {str(e)}")

    def send_weather_alert(self, user_id: str, weather_data: Dict) -> Dict:
        """
        Send an alert for significant weather events.

        Args:
            user_id: Firebase user ID
            weather_data: Dictionary containing weather information
                {
                    "event": "heavy_rain",
                    "severity": "high",
                    "start_time": "2023-10-15T14:30:00Z",
                    "duration": "4 hours",
                    "description": "Heavy rainfall expected in your area"
                }

        Returns:
            Dict containing the response
        """
        try:
            user_tokens = self._get_user_tokens(user_id)

            if not user_tokens:
                return {"error": "No FCM tokens found for user"}

            # Create notification content based on weather data
            event = weather_data.get("event", "weather event").replace("_", " ").title()
            severity = weather_data.get("severity", "moderate").title()

            title = f"Weather Alert: {event}"
            body = f"{severity} severity expected: {weather_data.get('description', 'Check weather conditions')}"

            # Add weather data to data payload
            data = {
                "type": "weather",
                "event": weather_data.get("event", ""),
                "severity": weather_data.get("severity", ""),
                "start_time": weather_data.get("start_time", ""),
                "duration": weather_data.get("duration", ""),
                "description": weather_data.get("description", ""),
            }

            # Send to all user tokens
            results = []
            for token in user_tokens:
                try:
                    result = self.send_notification(token, title, body, data)
                    results.append(result)
                except Exception as e:
                    results.append({"error": str(e)})

            return {"results": results}
        except Exception as e:
            raise Exception(f"Failed to send weather alert: {str(e)}")

    def _get_user_tokens(self, user_id: str) -> List[str]:
        """
        Get FCM tokens for a user from Firestore.

        Args:
            user_id: Firebase user ID

        Returns:
            List of FCM tokens
        """
        # This is a placeholder implementation
        # In a real application, you would query Firestore for the user's tokens
        # For now, we'll return an empty list

        # Example implementation (commented out):
        # try:
        #     firestore_url = f"https://firestore.googleapis.com/v1/projects/{self.project_id}/databases/(default)/documents"
        #     url = f"{firestore_url}/users/{user_id}"
        #
        #     response = requests.get(url)
        #     response.raise_for_status()
        #
        #     user_data = response.json()
        #     fields = user_data.get("fields", {})
        #     tokens_field = fields.get("fcm_tokens", {}).get("arrayValue", {}).get("values", [])
        #
        #     return [token.get("stringValue", "") for token in tokens_field]
        # except Exception:
        #     return []

        return []
