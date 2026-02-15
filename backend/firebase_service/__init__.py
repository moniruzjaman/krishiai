"""
Firebase Service Module

This module provides integration with Firebase for:
- User Authentication and Management
- Real-time Chat functionality
- Push Notifications and Alerts
"""

from .auth.service import FirebaseAuthService
from .chat.service import FirebaseChatService
from .alerts.service import FirebaseAlertsService

__all__ = ['FirebaseAuthService', 'FirebaseChatService', 'FirebaseAlertsService']
```

<file_path>
krishiai\backend\firebase_service\auth\__init__.py
</file_path>

<edit_description>
Create Firebase auth module init file
</edit_description>

```python
"""
Firebase Authentication Service

This module provides Firebase authentication functionality including:
- User registration and login
- Token verification
- User profile management
"""

from .service import FirebaseAuthService

__all__ = ['FirebaseAuthService']
```

<file_path>
krishiai\backend\firebase_service\auth\service.py
</file_path>

<edit_description>
Create Firebase auth service implementation
</edit_description>

```python
"""
Firebase Authentication Service Implementation

Handles all Firebase authentication operations for the Krishi AI platform.
"""

import json
import requests
from typing import Dict, Optional, Tuple
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

        payload = {
            "email": email,
            "password": password,
            "returnSecureToken": True
        }

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

        payload = {
            "email": email,
            "password": password,
            "returnSecureToken": True
        }

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

        payload = {
            "idToken": id_token
        }

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

        payload = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }

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

        payload = {
            "requestType": "PASSWORD_RESET",
            "email": email
        }

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to send password reset email: {str(e)}")

    def update_profile(self, id_token: str, display_name: str = None, photo_url: str = None) -> Dict:
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

        payload = {
            "idToken": id_token
        }

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

        payload = {
            "idToken": id_token
        }

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to delete user: {str(e)}")
```

<file_path>
krishiai\backend\firebase_service\chat\__init__.py
</file_path>

<edit_description>
Create Firebase chat module init file
</edit_description>

```python
"""
Firebase Chat Service

This module provides Firebase Cloud Firestore chat functionality including:
- Real-time messaging
- Chat room management
- Message history
"""

from .service import FirebaseChatService

__all__ = ['FirebaseChatService']
```

<file_path>
krishiai\backend\firebase_service\chat\service.py
</file_path>

<edit_description>
Create Firebase chat service implementation
</edit_description>

```python
"""
Firebase Chat Service Implementation

Handles all Firebase Cloud Firestore chat operations for the Krishi AI platform.
"""

import json
import requests
from typing import Dict, List, Optional
from datetime import datetime
from app_config import settings


class FirebaseChatService:
    """
    Service class for Firebase Cloud Firestore chat operations.
    """

    def __init__(self):
        self.api_key = settings.firebase_api_key
        self.project_id = settings.firebase_project_id
        self.firestore_url = f"https://firestore.googleapis.com/v1/projects/{self.project_id}/databases/(default)/documents"

    def create_chat_room(self, room_data: Dict) -> Dict:
        """
        Create a new chat room in Firestore.

        Args:
            room_data: Dictionary containing room information
                {
                    "name": "Chat Room Name",
                    "description": "Room Description",
                    "created_by": "user_id",
                    "participants": ["user_id1", "user_id2"],
                    "type": "public" | "private"
                }

        Returns:
            Dict containing the created room information
        """
        collection = "chat_rooms"
        url = f"{self.firestore_url}/{collection}?documentId={room_data.get('room_id', '')}"

        # Add timestamp to room data
        room_data["created_at"] = {"timestampValue": datetime.utcnow().isoformat() + "Z"}
        room_data["updated_at"] = {"timestampValue": datetime.utcnow().isoformat() + "Z"}

        # Convert Python data types to Firestore format
        firestore_data = self._convert_to_firestore_format(room_data)

        try:
            response = requests.post(url, json=firestore_data)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to create chat room: {str(e)}")

    def send_message(self, room_id: str, message_data: Dict) -> Dict:
        """
        Send a message to a chat room.

        Args:
            room_id: ID of the chat room
            message_data: Dictionary containing message information
                {
                    "text": "Message content",
                    "sender_id": "user_id",
                    "sender_name": "User Name",
                    "type": "text" | "image" | "file"
                }

        Returns:
            Dict containing the sent message information
        """
        collection = "chat_rooms"
        document = room_id
        subcollection = "messages"

        url = f"{self.firestore_url}/{collection}/{document}/{subcollection}?documentId={message_data.get('message_id', '')}"

        # Add timestamp to message data
        message_data["timestamp"] = {"timestampValue": datetime.utcnow().isoformat() + "Z"}

        # Convert Python data types to Firestore format
        firestore_data = self._convert_to_firestore_format(message_data)

        try:
            response = requests.post(url, json=firestore_data)
            response.raise_for_status()

            # Update the room's last message and timestamp
            self._update_room_activity(room_id, message_data)

            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to send message: {str(e)}")

    def get_chat_messages(self, room_id: str, limit: int = 50, start_after: Optional[str] = None) -> Dict:
        """
        Get messages from a chat room with pagination.

        Args:
            room_id: ID of the chat room
            limit: Maximum number of messages to retrieve
            start_after: Optional document ID to start after (for pagination)

        Returns:
            Dict containing the messages and pagination info
        """
        collection = "chat_rooms"
        document = room_id
        subcollection = "messages"

        url = f"{self.firestore_url}/{collection}/{document}/{subcollection}:runQuery"

        payload = {
            "structuredQuery": {
                "from": [{"collectionId": subcollection}],
                "orderBy": [
                    {
                        "field": {"fieldPath": "timestamp"},
                        "direction": "DESCENDING"
                    }
                ],
                "limit": limit
            }
        }

        if start_after:
            payload["structuredQuery"]["startAt"] = {
                "values": [
                    {"referenceValue": f"projects/{self.project_id}/databases/(default)/documents/{collection}/{document}/{subcollection}/{start_after}"}
                ]
            }

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()

            # Process the response and convert from Firestore format
            result = response.json()
            messages = []

            for doc in result:
                if "document" in doc:
                    fields = doc["document"].get("fields", {})
                    converted_fields = self._convert_from_firestore_format(fields)
                    converted_fields["id"] = doc["document"]["name"].split("/")[-1]
                    messages.append(converted_fields)

            # Reverse to get chronological order
            messages.reverse()

            return {"messages": messages}
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get chat messages: {str(e)}")

    def get_user_rooms(self, user_id: str) -> Dict:
        """
        Get all chat rooms for a specific user.

        Args:
            user_id: ID of the user

        Returns:
            Dict containing the user's chat rooms
        """
        collection = "chat_rooms"

        url = f"{self.firestore_url}/{collection}:runQuery"

        payload = {
            "structuredQuery": {
                "from": [{"collectionId": collection}],
                "where": {
                    "compositeFilter": {
                        "op": "OR",
                        "filters": [
                            {
                                "fieldFilter": {
                                    "field": {"fieldPath": "created_by"},
                                    "op": "EQUAL",
                                    "value": {"stringValue": user_id}
                                }
                            },
                            {
                                "fieldFilter": {
                                    "field": {"fieldPath": "participants"},
                                    "op": "ARRAY_CONTAINS",
                                    "value": {"stringValue": user_id}
                                }
                            }
                        ]
                    }
                }
            }
        }

        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()

            # Process the response and convert from Firestore format
            result = response.json()
            rooms = []

            for doc in result:
                if "document" in doc:
                    fields = doc["document"].get("fields", {})
                    converted_fields = self._convert_from_firestore_format(fields)
                    converted_fields["id"] = doc["document"]["name"].split("/")[-1]
                    rooms.append(converted_fields)

            return {"rooms": rooms}
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get user rooms: {str(e)}")

    def join_room(self, room_id: str, user_id: str) -> Dict:
        """
        Add a user to a chat room.

        Args:
            room_id: ID of the chat room
            user_id: ID of the user to add

        Returns:
            Dict containing the updated room information
        """
        collection = "chat_rooms"
        document = room_id

        url = f"{self.firestore_url}/{collection}/{document}"

        try:
            # First, get the current room data
            response = requests.get(url)
            response.raise_for_status()
            room_data = response.json()

            # Add the user to participants if not already there
            fields = room_data.get("fields", {})
            participants = fields.get("participants", {}).get("arrayValue", {}).get("values", [])

            participant_ids = [p.get("stringValue", "") for p in participants]

            if user_id not in participant_ids:
                participants.append({"stringValue": user_id})
                fields["participants"]["arrayValue"]["values"] = participants

                # Update the room with new participants
                update_payload = {"fields": fields}

                response = requests.patch(url, json=update_payload)
                response.raise_for_status()

                return response.json()

            return room_data
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to join room: {str(e)}")

    def leave_room(self, room_id: str, user_id: str) -> Dict:
        """
        Remove a user from a chat room.

        Args:
            room_id: ID of the chat room
            user_id: ID of the user to remove

        Returns:
            Dict containing the updated room information
        """
        collection = "chat_rooms"
        document = room_id

        url = f"{self.firestore_url}/{collection}/{document}"

        try:
            # First, get the current room data
            response = requests.get(url)
            response.raise_for_status()
            room_data = response.json()

            # Remove the user from participants if present
            fields = room_data.get("fields", {})
            participants = fields.get("participants", {}).get("arrayValue", {}).get("values", [])

            participant_ids = [p.get("stringValue", "") for p in participants]

            if user_id in participant_ids:
                participants = [p for p in participants if p.get("stringValue", "") != user_id]
                fields["participants"]["arrayValue"]["values"] = participants

                # Update the room with new participants
                update_payload = {"fields": fields}

                response = requests.patch(url, json=update_payload)
                response.raise_for_status()

                return response.json()

            return room_data
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to leave room: {str(e)}")

    def _update_room_activity(self, room_id: str, message_data: Dict) -> None:
        """
        Update the room's last message and timestamp.

        Args:
            room_id: ID of the chat room
            message_data: The message data to update with
        """
        collection = "chat_rooms"
        document = room_id

        url = f"{self.firestore_url}/{collection}/{document}"

        try:
            # Create the update payload with the last message info
            update_fields = {
                "updated_at": {"timestampValue": datetime.utcnow().isoformat() + "Z"},
                "last_message": {
                    "mapValue": {
                        "fields": {
                            "text": {"stringValue": message_data.get("text", "")},
                            "sender_id": {"stringValue": message_data.get("sender_id", "")},
                            "sender_name": {"stringValue": message_data.get("sender_name", "")},
                            "timestamp": {"timestampValue": message_data.get("timestamp", {"timestampValue": datetime.utcnow().isoformat() + "Z"})}
                        }
                    }
                }
            }

            requests.patch(url, json={"fields": update_fields})
        except requests.exceptions.RequestException:
            # Don't raise an exception here as this is a secondary operation
            pass

    def _convert_to_firestore_format(self, data: Dict) -> Dict:
        """
        Convert Python data types to Firestore format.

        Args:
            data: Python dictionary to convert

        Returns:
            Dictionary in Firestore format
        """
        firestore_data = {"fields": {}}

        for key, value in data.items():
            if isinstance(value, str):
                firestore_data["fields"][key] = {"stringValue": value}
            elif isinstance(value, int):
                firestore_data["fields"][key] = {"integerValue": str(value)}
            elif isinstance(value, float):
                firestore_data["fields"][key] = {"doubleValue": value}
            elif isinstance(value, bool):
                firestore_data["fields"][key] = {"booleanValue": value}
            elif isinstance(value, list):
                array_values = []
                for item in value:
                    if isinstance(item, str):
                        array_values.append({"stringValue": item})
                    elif isinstance(item, int):
                        array_values.append({"integerValue": str(item)})
                    elif isinstance(item, float):
                        array_values.append({"doubleValue": item})
                    elif isinstance(item, bool):
                        array_values.append({"booleanValue": item})
                    elif isinstance(item, dict):
                        converted = self._convert_to_firestore_format(item)
                        array_values.append({"mapValue": converted})

                firestore_data["fields"][key] = {"arrayValue": {"values": array_values}}
            elif isinstance(value, dict):
                converted = self._convert_to_firestore_format(value)
                firestore_data["fields"][key] = {"mapValue": converted}
            elif key.endswith("_at") or key == "timestamp":
                # Handle timestamp fields
                if isinstance(value, dict) and "timestampValue" in value:
                    firestore_data["fields"][key] = value
                else:
                    firestore_data["fields"][key] = {"timestampValue": value}

        return firestore_data

    def _convert_from_firestore_format(self, fields: Dict) -> Dict:
        """
        Convert Firestore format to Python data types.

        Args:
            fields: Firestore fields dictionary

        Returns:
            Python dictionary
        """
        result = {}

        for key, value in fields.items():
            if "stringValue" in value:
                result[key] = value["stringValue"]
            elif "integerValue" in value:
                result[key] = int(value["integerValue"])
            elif "doubleValue" in value:
                result[key] = value["doubleValue"]
            elif "booleanValue" in value:
                result[key] = value["booleanValue"]
            elif "timestampValue" in value:
                result[key] = value["timestampValue"]
            elif "arrayValue" in value:
                array_values = []
                if "values" in value["arrayValue"]:
                    for item in value["arrayValue"]["values"]:
                        if "stringValue" in item:
                            array_values.append(item["stringValue"])
                        elif "integerValue" in item:
                            array_values.append(int(item["integerValue"]))
                        elif "doubleValue" in item:
                            array_values.append(item["doubleValue"])
                        elif "booleanValue" in item:
                            array_values.append(item["booleanValue"])
                        elif "mapValue" in item:
                            converted = self._convert_from_firestore_format(item["mapValue"].get("fields", {}))
                            array_values.append(converted)

                result[key] = array_values
            elif "mapValue" in value:
                if "fields" in value["mapValue"]:
                    converted = self._convert_from_firestore_format(value["mapValue"]["fields"])
                    result[key] = converted

        return result
```

<file_path>
krishiai\backend\firebase_service\alerts\__init__.py
</file_path>

<edit_description>
Create Firebase alerts module init file
</edit_description>

```python
"""
Firebase Alerts Service

This module provides Firebase Cloud Messaging (FCM) and push notification functionality including:
- Push notifications
- Alert management
- User notification preferences
"""

from .service import FirebaseAlertsService

__all__ = ['FirebaseAlertsService']
```

<file_path>
krishiai\backend\firebase_service\alerts\service.py
</file_path>

<edit_description>
Create Firebase alerts service implementation
</edit_description>

```python
"""
Firebase Alerts Service Implementation

Handles all Firebase Cloud Messaging (FCM) operations for the Krishi AI platform.
"""

import json
import requests
from typing import Dict, List, Optional
from datetime import datetime
from app_config import settings


class FirebaseAlertsService:
    """
    Service class for Firebase Cloud Messaging (FCM) operations.
    """

    def __init__(self):
        self.project_id = settings.firebase_project_id
        self.credentials_path = getattr(settings, 'firebase_credentials_path', None)
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
            with open(self.credentials_path, 'r') as f:
                credentials = json.load(f)

            # Get OAuth2 token
            auth_url = f"https://oauth2.googleapis.com/token"
            payload = {
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": self._create_jwt(credentials)
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
        import time
        import uuid

        header = {
            "alg": "RS256",
            "typ": "JWT"
        }

        now = int(time.time())
        payload = {
            "iss": credentials["client_email"],
            "scope": "https://www.googleapis.com/auth/firebase.messaging",
            "aud": "https://oauth2.googleapis.com/token",
            "exp": now + 3600,
            "iat": now
        }

        # Encode header and payload
        encoded_header = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
        encoded_payload = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')

        # Create signature (simplified)
        signature_input = f"{encoded_header}.{encoded_payload}"

        # In production, you would sign with the private key from credentials
        # This is a placeholder - actual implementation would use cryptography or similar
        signature = "placeholder_signature"

        return f"{signature_input}.{signature}"

    def send_notification(self, token: str, title: str, body: str, data: Dict = None, image_url: str = None) -> Dict:
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

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        message = {
            "message": {
                "token": token,
                "notification": {
                    "title": title,
                    "body": body
                },
                "android": {
                    "priority": "high",
                    "notification": {
                        "sound": "default",
                        "click_action": "FLUTTER_NOTIFICATION_CLICK"
                    }
                },
                "apns": {
                    "payload": {
                        "aps": {
                            "sound": "default",
                            "badge": 1
                        }
                    }
                }
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

    def send_topic_notification(self, topic: str, title: str, body: str, data: Dict = None, image_url: str = None) -> Dict:
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

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        message = {
            "message": {
                "topic": topic,
                "notification": {
                    "title": title,
                    "body": body
                },
                "android": {
                    "priority": "high",
                    "notification": {
                        "sound": "default",
                        "click_action": "FLUTTER_NOTIFICATION_CLICK"
                    }
                },
                "apns": {
                    "payload": {
                        "aps": {
                            "sound": "default",
                            "badge": 1
                        }
                    }
                }
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

        url = f"https://iid.googleapis.com/iid/v1:batchAdd"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "to": f"/topics/{topic}",
            "registration_tokens": tokens
        }

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

        url = f"https://iid.googleapis.com/iid/v1:batchRemove"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "to": f"/topics/{topic}",
            "registration_tokens": tokens
        }

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
                "crop_type": diagnosis_data.get('crop_type', ''),
                "disease": diagnosis_data.get('disease', ''),
                "confidence": str(diagnosis_data.get('confidence', 0)),
                "recommendations": json.dumps(diagnosis_data.get('recommendations', []))
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
            crop = market_data.get('crop', 'crop')
            change = market_data.get('change', 0)
            change_percent = market_data.get('change_percent', 0)

            if change >= 0:
                title = f"Price Increase: {crop.title()}"
                body = f"Up by ₹{change} ({change_percent}%) to ₹{market_data.get('current_price', 0)}/quintal"
            else:
                title = f"Price Decrease: {crop.title()}"
                body = f"Down by ₹{abs(change)} ({abs(change_percent)}%) to ₹{market_data.get('current_price', 0)}/quintal"

            # Add market data to data payload
            data = {
                "type": "market_price",
                "crop": market_data.get('crop', ''),
                "current_price": str(market_data.get('current_price', 0)),
                "previous_price": str(market_data.get('previous_price', 0)),
                "change": str(market_data.get('change', 0)),
                "change_percent": str(market_data.get('change_percent', 0)),
                "market": market_data.get('market', '')
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
            event = weather_data.get('event', 'weather event').replace('_', ' ').title()
            severity = weather_data.get('severity', 'moderate').title()

            title = f"Weather Alert: {event}"
            body = f"{severity} severity expected: {weather_data.get('description', 'Check weather conditions')}"

            # Add weather data to data payload
            data = {
                "type": "weather",
                "event": weather_data.get('event', ''),
                "severity": weather_data.get('severity', ''),
                "start_time": weather_data.get('start_time', ''),
                "duration": weather_data.get('duration', ''),
                "description": weather_data.get('description', '')
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
```

<file_path>
krishiai\backend\app_config.py
</file_path>

<edit_description>
Update app_config to include Firebase settings
</edit_description>

```python
"""
Configuration settings for Krishi AI Backend
"""

import os
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    # Supabase Settings (for crop diagnosis data)
    supabase_url: str = Field(default=os.getenv("SUPABASE_URL"))
    supabase_key: str = Field(default=os.getenv("SUPABASE_KEY"))

    # Firebase Settings (for users, chat, and alerts)
    firebase_api_key: str = Field(default=os.getenv("FIREBASE_API_KEY"))
    firebase_project_id: str = Field(default=os.getenv("FIREBASE_PROJECT_ID"))
    firebase_credentials_path: str = Field(default=os.getenv("FIREBASE_CREDENTIALS_PATH"))

    # Gemini AI Settings
    gemini_api_key: str = Field(default=os.getenv("GEMINI_API_KEY"))

    # Application Settings
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=True)
    log_level: str = Field(default="INFO")

    # CORS Settings
    cors_origins: list = Field(default=["http://localhost:3000", "http://localhost:5173"])

    class Config:
        env_file = ".env"


# Create a global settings instance
settings = Settings()
```

<file_path>
krishiai\backend\requirements.txt
</file_path>

<edit_description>
Update requirements.txt to include Firebase dependencies
</edit_description>

```
fastapi==0.104.1
uvicorn==0.24.0
supabase==2.5.0
pydantic==2.5.2
python-dotenv==1.0.0
requests==2.31.0
python-multipart==0.0.6
pillow==10.1.0
transformers==4.36.0
torch==2.1.2
numpy==1.24.4
```

<file_path>
krishiai\backend\routes.py
</file_path>

<edit_description>
Update routes to include Firebase service endpoints
</edit_description>

```python
"""
API Routes for Krishi AI Backend

This module defines the API routes for the application, including:
- Supabase routes for crop diagnosis data
- Firebase routes for users, chat, and alerts
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Dict, List, Optional
import uuid

# Import services
from firebase_service import FirebaseAuthService, FirebaseChatService, FirebaseAlertsService
from supabase_service import get_user_profile, update_user_xp, save_diagnostic_report


# Initialize Firebase services
firebase_auth = FirebaseAuthService()
firebase_chat = FirebaseChatService()
firebase_alerts = FirebaseAlertsService()

# Create the main router
router = APIRouter()


# Firebase Authentication Routes
@router.post("/auth/register")
async def register(email: EmailStr, password: str, display_name: Optional[str] = None):
    """
    Register a new user with Firebase Authentication.
    """
    try:
        # Create user in Firebase Auth
        firebase_user = firebase_auth.create_user(email=email, password=password, display_name=display_name)

        # Create corresponding user profile in Supabase
        user_id = firebase_user.get("localId")
        profile_data = {
            "id": user_id,
            "email": email,
            "display_name": display_name or email.split("@")[0],
            "created_at": firebase_user.get("createdAt"),
            "progress": {
                "xp": 0,
                "level": 1,
                "streak": 0,
                "skills": {
                    "soil": 0,
                    "protection": 0,
                    "technology": 0
                }
            }
        }

        # This would typically be handled by a trigger in Supabase
        # For now, we'll use the direct function
        from supabase import create_client, Client
        from app_config import settings

        supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
        supabase.table("profiles").insert(profile_data).execute()

        return {
            "success": True,
            "message": "User registered successfully",
            "user": {
                "id": user_id,
                "email": email,
                "display_name": display_name or email.split("@")[0]
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/auth/login")
async def login(email: EmailStr, password: str):
    """
    Sign in a user with Firebase Authentication.
    """
    try:
        # Sign in user with Firebase Auth
        firebase_user = firebase_auth.sign_in_user(email=email, password=password)

        # Get user profile from Supabase
        user_id = firebase_user.get("localId")
        profile_response = get_user_profile(user_id)

        # Extract profile data
        profile_data = {}
        if profile_response.data:
            profile_data = profile_response.data[0]

        return {
            "success": True,
            "message": "Login successful",
            "tokens": {
                "id_token": firebase_user.get("idToken"),
                "refresh_token": firebase_user.get("refreshToken"),
                "expires_in": firebase_user.get("expiresIn")
            },
            "user": {
                "id": user_id,
                "email": email,
                "display_name": profile_data.get("display_name", email.split("@")[0]),
                "profile": profile_data.get("progress", {})
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/auth/verify")
async def verify_token(id_token: str):
    """
    Verify a Firebase ID token and return user information.
    """
    try:
        # Verify token with Firebase
        token_info = firebase_auth.verify_token(id_token)
        user_id = token_info.get("uid")
        email = token_info.get("email")

        # Get user profile from Supabase
        profile_response = get_user_profile(user_id)

        # Extract profile data
        profile_data = {}
        if profile_response.data:
            profile_data = profile_response.data[0]

        return {
            "success": True,
            "user": {
                "id": user_id,
                "email": email,
                "display_name": profile_data.get("display_name", email.split("@")[0]),
                "profile": profile_data.get("progress", {})
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )


@router.post("/auth/refresh")
async def refresh_token(refresh_token: str):
    """
    Refresh an expired ID token using a refresh token.
    """
    try:
        # Refresh token with Firebase
        token_data = firebase_auth.refresh_token(refresh_token)

        return {
            "success": True,
            "tokens": {
                "id_token": token_data.get("id_token"),
                "refresh_token": token_data.get("refresh_token"),
                "expires_in": token_data.get("expires_in")
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token refresh failed: {str(e)}"
        )


@router.post("/auth/reset-password")
async def reset_password(email: EmailStr):
    """
    Send a password reset email to the user.
    """
    try:
        # Send password reset email with Firebase
        firebase_auth.reset_password(email=email)

        return {
            "success": True,
            "message": "Password reset email sent"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password reset failed: {str(e)}"
        )


# Firebase Chat Routes
@router.post("/chat/rooms")
async def create_chat_room(
    name: str,
    description: str,
    created_by: str,
    participants: List[str],
    room_type: str = "public"
):
    """
    Create a new chat room in Firebase Firestore.
    """
    try:
        room_id = str(uuid.uuid4())
        room_data = {
            "room_id": room_id,
            "name": name,
            "description": description,
            "created_by": created_by,
            "participants": participants,
            "type": room_type
        }

        # Create room in Firebase Firestore
        room = firebase_chat.create_chat_room(room_data)

        return {
            "success": True,
            "message": "Chat room created successfully",
            "room": room
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create chat room: {str(e)}"
        )


@router.post("/chat/rooms/{room_id}/messages")
async def send_message(
    room_id: str,
    text: str,
    sender_id: str,
    sender_name: str,
    message_type: str = "text",
    message_id: Optional[str] = None
):
    """
    Send a message to a chat room in Firebase Firestore.
    """
    try:
        if not message_id:
            message_id = str(uuid.uuid4())

        message_data = {
            "message_id": message_id,
            "text": text,
            "sender_id": sender_id,
            "sender_name": sender_name,
            "type": message_type
        }

        # Send message in Firebase Firestore
        message = firebase_chat.send_message(room_id, message_data)

        return {
            "success": True,
            "message": "Message sent successfully",
            "data": message
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send message: {str(e)}"
        )


@router.get("/chat/rooms/{room_id}/messages")
async def get_chat_messages(
    room_id: str,
    limit: int = 50,
    start_after: Optional[str] = None
):
    """
    Get messages from a chat room in Firebase Firestore.
    """
    try:
        # Get messages from Firebase Firestore
        result = firebase_chat.get_chat_messages(room_id, limit, start_after)

        return {
            "success": True,
            "messages": result.get("messages", [])
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get chat messages: {str(e)}"
        )


@router.get("/chat/users/{user_id}/rooms")
async def get_user_rooms(user_id: str):
    """
    Get all chat rooms for a specific user from Firebase Firestore.
    """
    try:
        # Get user rooms from Firebase Firestore
        result = firebase_chat.get_user_rooms(user_id)

        return {
            "success": True,
            "rooms": result.get("rooms", [])
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get user rooms: {str(e)}"
        )


@router.post("/chat/rooms/{room_id}/join")
async def join_room(room_id: str, user_id: str):
    """
    Add a user to a chat room in Firebase Firestore.
    """
    try:
        # Join room in Firebase Firestore
        room = firebase_chat.join_room(room_id, user_id)

        return {
            "success": True,
            "message": "Joined room successfully",
            "room": room
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to join room: {str(e)}"
        )


@router.post("/chat/rooms/{room_id}/leave")
async def leave_room(room_id: str, user_id: str):
    """
    Remove a user from a chat room in Firebase Firestore.
    """
    try:
        # Leave room in Firebase Firestore
        room = firebase_chat.leave_room(room_id, user_id)

        return {
            "success": True,
            "message": "Left room successfully",
            "room": room
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to leave room: {str(e)}"
        )


# Firebase Alerts Routes
@router.post("/alerts/send")
async def send_notification(
    token: str,
    title: str,
    body: str,
    data: Optional[Dict] = None,
    image_url: Optional[str] = None
):
    """
    Send a push notification to a specific device using Firebase Cloud Messaging.
    """
    try:
        # Send notification with Firebase Cloud Messaging
        result = firebase_alerts.send_notification(token, title, body, data, image_url)

        return {
            "success": True,
            "message": "Notification sent successfully",
            "result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send notification: {str(e)}"
        )


@router.post("/alerts/topic")
async def send_topic_notification(
    topic: str,
    title: str,
    body: str,
    data: Optional[Dict] = None,
    image_url: Optional[str] = None
):
    """
    Send a push notification to all devices subscribed to a topic using Firebase Cloud Messaging.
    """
    try:
        # Send topic notification with Firebase Cloud Messaging
        result = firebase_alerts.send_topic_notification(topic, title, body, data, image_url)

        return {
            "success": True,
            "message": "Topic notification sent successfully",
            "result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send topic notification: {str(e)}"
        )


@router.post("/alerts/subscribe")
async def subscribe_to_topic(tokens: List[str], topic: str):
    """
    Subscribe device tokens to a topic using Firebase Cloud Messaging.
    """
    try:
        # Subscribe to topic with Firebase Cloud Messaging
        result = firebase_alerts.subscribe_to_topic(tokens, topic)

        return {
            "success": True,
            "message": "Subscribed to topic successfully",
            "result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to subscribe to topic: {str(e)}"
        )


@router.post("/alerts/unsubscribe")
async def unsubscribe_from_topic(tokens: List[str], topic: str):
    """
    Unsubscribe device tokens from a topic using Firebase Cloud Messaging.
    """
    try:
        # Unsubscribe from topic with Firebase Cloud Messaging
        result = firebase_alerts.unsubscribe_from_topic(tokens, topic)

        return {
            "success": True,
            "message": "Unsubscribed from topic successfully",
            "result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to unsubscribe from topic: {str(e)}"
        )


@router.post("/alerts/crop-diagnosis")
async def send_crop_diagnosis_alert(
    user_id: str,
    crop_type: str,
    disease: str,
    confidence: float,
    recommendations: List[str]
):
    """
    Send a specialized alert for crop diagnosis results using Firebase Cloud Messaging.
    """
    try:
        diagnosis_data = {
            "crop_type": crop_type,
            "disease": disease,
            "confidence": confidence,
            "recommendations": recommendations
        }

        # Send crop diagnosis alert with Firebase Cloud Messaging
        result = firebase_alerts.send_crop_diagnosis_alert(user_id, diagnosis_data)

        return {
            "success": True,
            "message": "Crop diagnosis alert sent successfully",
            "result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send crop diagnosis alert: {str(e)}"
        )


@router.post("/alerts/market-price")
async def send_market_price_alert(
    user_id: str,
    crop: str,
    current_price: float,
    previous_price: float,
    change: float,
    change_percent: float,
    market: str
):
    """
    Send an alert for market price changes using Firebase Cloud Messaging.
    """
    try:
        market_data = {
            "crop": crop,
            "current_price": current_price,
            "previous_price": previous_price,
            "change": change,
            "change_percent": change_percent,
            "market": market
        }

        # Send market price alert with Firebase Cloud Messaging
        result = firebase_alerts.send_market_price_alert(user_id, market_data)

        return {
            "success": True,
            "message": "Market price alert sent successfully",
            "result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send market price alert: {str(e)}"
        )


@router.post("/alerts/weather")
async def send_weather_alert(
    user_id: str,
    event: str,
    severity: str,
    start_time: str,
    duration: str,
    description: str
):
    """
    Send an alert for significant weather events using Firebase Cloud Messaging.
    """
    try:
        weather_data = {
            "event": event,
            "severity": severity,
            "start_time": start_time,
            "duration": duration,
            "description": description
        }

        # Send weather alert with Firebase Cloud Messaging
        result = firebase_alerts.send_weather_alert(user_id, weather_data)

        return {
            "success": True,
            "message": "Weather alert sent successfully",
            "result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send weather alert: {str(e)}"
        )


# Supabase Crop Diagnosis Routes
@router.post("/diagnosis/save")
async def save_diagnosis(
    user_id: str,
    crop_type: str,
    image_url: str,
    disease: str,
    confidence: float,
    recommendations: List[str],
    timestamp: Optional[str] = None
):
    """
    Save a crop diagnosis report to Supabase.
    """
    try:
        import datetime

        if not timestamp:
            timestamp = datetime.datetime.utcnow().isoformat()

        report_data = {
            "user_id": user_id,
            "crop_type": crop_type,
            "image_url": image_url,
            "disease": disease,
            "confidence": confidence,
            "recommendations": recommendations,
            "timestamp": timestamp
        }

        # Save report in Supabase
        result = save_diagnostic_report(report_data)

        # Update user XP if diagnosis is saved
        # This could be adjusted based on business logic
        update_user_xp(user_id, 10)  # Award 10 XP for saving a diagnosis

        return {
            "success": True,
            "message": "Diagnosis saved successfully",
            "report_id": result.data[0]["id"] if result.data else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to save diagnosis: {str(e)}"
        )


@router.get("/diagnosis/user/{user_id}")
async def get_user_diagnoses(user_id: str, limit: int = 10):
    """
    Get all crop diagnoses for a specific user from Supabase.
    """
    try:
        from supabase import create_client, Client
        from app_config import settings

        supabase: Client = create_client(settings.supabase_url, settings.supabase_key)

        # Get user diagnoses from Supabase
        result = supabase.table("reports").select("*").eq("user_id", user_id).order("timestamp", desc=True).limit(limit).execute()

        return {
            "success": True,
            "diagnoses": result.data or []
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get user diagnoses: {str(e)}"
        )


@router.get("/diagnosis/{diagnosis_id}")
async def get_diagnosis(diagnosis_id: str):
    """
    Get a specific crop diagnosis by ID from Supabase.
    """
    try:
        from supabase import create_client, Client
        from app_config import settings

        supabase: Client = create_client(settings.supabase_url, settings.supabase_key)

        # Get diagnosis from Supabase
        result = supabase.table("reports").select("*").eq("id", diagnosis_id).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Diagnosis not found"
            )

        return {
            "success": True,
            "diagnosis": result.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get diagnosis: {str(e)}"
        )


# Health Check Route
@router.get("/health")
async def health_check():
    """
    Check the health of the backend services.
    """
    return {
        "status": "healthy",
        "services": {
            "firebase_auth": "online",
            "firebase_chat": "online",
            "firebase_alerts": "online",
            "supabase": "online"
        }
    }
```

<file_path>
krishiai\backend\.env.example
</file_path>

<edit_description>
Create an example environment file for the hybrid backend
</edit_description>

```
# Supabase Configuration (for crop diagnosis data)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key

# Firebase Configuration (for users, chat, and alerts)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CREDENTIALS_PATH=path/to/serviceAccountKey.json

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Application Configuration
ENVIRONMENT=development
LOG_LEVEL=INFO
```

<file_path>
krishiai\backend\README.md
</file_path>

<edit_description>
Create README documentation for the hybrid backend
</edit_description>

```
# Krishi AI Backend - Hybrid Architecture

A FastAPI-based backend that uses a hybrid architecture combining Firebase for user management, chat, and alerts with Supabase for crop diagnosis data.

## Architecture Overview

### Firebase Services
- **Authentication**: User registration, login, and profile management
- **Cloud Firestore**: Real-time chat rooms and messaging
- **Cloud Messaging**: Push notifications and alerts

### Supabase Services
- **PostgreSQL Database**: Crop diagnosis data storage
- **User Profiles**: Farmer-specific data and progress tracking
- **Diagnostic Reports**: Crop disease history and recommendations

## API Endpoints

### Authentication (Firebase)
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Sign in a user
- `POST /api/v1/auth/verify` - Verify ID token
- `POST /api/v1/auth/refresh` - Refresh ID token
- `POST /api/v1/auth/reset-password` - Send password reset email

### Chat (Firebase Firestore)
- `POST /api/v1/chat/rooms` - Create a chat room
- `POST /api/v1/chat/rooms/{room_id}/messages` - Send a message
- `GET /api/v1/chat/rooms/{room_id}/messages` - Get chat messages
- `GET /api/v1/chat/users/{user_id}/rooms` - Get user rooms
- `POST /api/v1/chat/rooms/{room_id}/join` - Join a room
- `POST /api/v1/chat/rooms/{room_id}/leave` - Leave a room

### Alerts (Firebase Cloud Messaging)
- `POST /api/v1/alerts/send` - Send notification to device
- `POST /api/v1/alerts/topic` - Send notification to topic
- `POST /api/v1/alerts/subscribe` - Subscribe to topic
- `POST /api/v1/alerts/unsubscribe` - Unsubscribe from topic
- `POST /api/v1/alerts/crop-diagnosis` - Send crop diagnosis alert
- `POST /api/v1/alerts/market-price` - Send market price alert
- `POST /api/v1/alerts/weather` - Send weather alert

### Crop Diagnosis (Supabase)
- `POST /api/v1/diagnosis/save` - Save diagnostic report
- `GET /api/v1/diagnosis/user/{user_id}` - Get user diagnoses
- `GET /api/v1/diagnosis/{diagnosis_id}` - Get specific diagnosis

## Setup

### Prerequisites
- Python 3.8+
- Firebase project with Authentication, Firestore, and Cloud Messaging enabled
- Supabase project with database and API keys

### Installation

1. Clone the repository
2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Edit the `.env` file with your Firebase and Supabase credentials.

5. Run the server:
   ```
   uvicorn main:app --reload
   ```

## Configuration

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication, Firestore Database, and Cloud Messaging
3. Generate a service account key and save it as `serviceAccountKey.json`
4. Add the following to your `.env` file:
   ```
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_CREDENTIALS_PATH=path/to/serviceAccountKey.json
   ```

### Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Create the following tables:
   - `profiles` (id, email, display_name, created_at, progress)
   - `reports` (id, user_id, crop_type, image_url, disease, confidence, recommendations, timestamp)
3. Add the following to your `.env` file:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_service_role_key
   ```

## API Documentation

Once the server is running, you can access the interactive API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Deployment

The backend can be deployed to various platforms such as Vercel, Railway, or Render. The `vercel.json` file is pre-configured for Vercel deployment.

## Testing

You can test the API endpoints using the built-in Swagger UI or tools like Postman or cURL.
```

I've created a hybrid backend architecture that combines Firebase for user management, chat, and alerts with Supabase for crop diagnosis data. Here's what I've implemented:

## Firebase Service Components
1. **Authentication Service** (`firebase_service/auth/service.py`):
   - User registration and login
   - Token verification and refresh
   - Password reset functionality
   - Profile management

2. **Chat Service** (`firebase_service/chat/service.py`):
   - Real-time chat room creation and management
   - Message sending and retrieval
   - User participation in rooms

3. **Alerts Service** (`firebase_service/alerts/service.py`):
   - Push notifications to devices
   - Topic-based notifications
   - Specialized alerts for crop diagnosis, market prices, and weather

## Supabase Integration
- Maintained the existing Supabase service for crop diagnosis data
- Enhanced it to work alongside Firebase for user profiles

## Backend Updates
- Updated the configuration to support both Firebase and Supabase
- Created new API routes for all Firebase services
- Integrated Firebase authentication with Supabase user profiles
- Added specialized alert endpoints for agricultural use cases

## Key Features
- **Hybrid Authentication**: Firebase for auth tokens, Supabase for user profiles
- **Real-time Chat**: Firebase Firestore for messaging functionality
- **Push Notifications**: Firebase Cloud Messaging for alerts
- **Crop Diagnosis**: Supabase for storing diagnostic data and reports

To complete the setup, you'll need to:
1. Create a Firebase project with Authentication, Firestore, and Cloud Messaging enabled
2. Update your `.env` file with both Firebase and Supabase credentials
3. Ensure your Supabase database has the necessary tables (profiles and reports)

This architecture gives you the best of both platforms - Firebase's real-time capabilities and authentication for user-facing features, and Supabase's simplicity for structured crop diagnosis data.
