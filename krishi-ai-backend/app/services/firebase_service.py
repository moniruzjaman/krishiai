"""
Firebase Service for Krishi AI Backend
Handles Firebase authentication, real-time database, and cloud messaging
"""

import json
import logging
import os
from typing import Any, Dict, Optional

try:
    import firebase_admin
    from firebase_admin import auth, credentials, firestore, messaging
    from firebase_admin import db as rtdb
except ImportError:
    firebase_admin = None
    auth = None
    credentials = None
    firestore = None
    messaging = None
    rtdb = None

logger = logging.getLogger(__name__)


class FirebaseService:
    """
    Service class to handle all Firebase operations
    """

    def __init__(self):
        self.app = None
        self.db = None
        self._initialize_firebase()

    def _initialize_firebase(self):
        """
        Initialize Firebase Admin SDK
        """
        if firebase_admin is None:
            logger.warning("Firebase Admin SDK not installed. Skipping initialization.")
            return

        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Get credentials from environment variable or file
                cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")

                if cred_path and os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    self.app = firebase_admin.initialize_app(cred)
                else:
                    # Try to initialize with environment variables
                    firebase_config_str = os.getenv("FIREBASE_CONFIG")
                    if firebase_config_str:
                        firebase_config = json.loads(firebase_config_str)
                        cred = credentials.Certificate(firebase_config)
                        self.app = firebase_admin.initialize_app(cred)
                    else:
                        logger.warning(
                            "Firebase credentials not found. Skipping initialization."
                        )
                        return

            self.db = firestore.client()
            logger.info("Firebase initialized successfully")

        except Exception as e:
            logger.error(f"Error initializing Firebase: {e}")
            raise

    def verify_token(self, token: str) -> Optional[Any]:
        """
        Verify Firebase ID token
        """
        if firebase_admin is None:
            logger.error("Firebase Admin SDK not installed.")
            return None

        try:
            decoded_token = auth.verify_id_token(token)
            user = auth.get_user(decoded_token["uid"])
            return user
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return None

    def create_user(
        self, email: str, password: str = None, display_name: str = None
    ) -> Optional[Any]:
        """
        Create a new user in Firebase Authentication
        """
        if firebase_admin is None:
            logger.error("Firebase Admin SDK not installed.")
            return None

        try:
            user = auth.create_user(
                email=email, password=password, display_name=display_name
            )
            return user
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return None

    def get_user(self, uid: str) -> Optional[Any]:
        """
        Get user by UID
        """
        if firebase_admin is None:
            logger.error("Firebase Admin SDK not installed.")
            return None

        try:
            user = auth.get_user(uid)
            return user
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None

    def update_user(self, uid: str, **kwargs) -> Optional[Any]:
        """
        Update user properties
        """
        if firebase_admin is None:
            logger.error("Firebase Admin SDK not installed.")
            return None

        try:
            user = auth.update_user(uid, **kwargs)
            return user
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            return None

    def delete_user(self, uid: str) -> bool:
        """
        Delete user from Firebase Authentication
        """
        if firebase_admin is None:
            logger.error("Firebase Admin SDK not installed.")
            return False

        try:
            auth.delete_user(uid)
            return True
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return False

    def send_push_notification(
        self, tokens: list, title: str, body: str, data: dict = None
    ) -> Dict[str, Any]:
        """
        Send push notification to device tokens
        """
        if firebase_admin is None:
            logger.error("Firebase Admin SDK not installed.")
            return {
                "success_count": 0,
                "failure_count": len(tokens),
                "error": "Firebase Admin SDK not installed",
            }

        try:
            message = messaging.MulticastMessage(
                tokens=tokens,
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
            )

            response = messaging.send_multicast(message)
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count,
                "responses": [resp.as_dict() for resp in response.responses],
            }
        except Exception as e:
            logger.error(f"Error sending push notification: {e}")
            return {"success_count": 0, "failure_count": len(tokens), "error": str(e)}

    def subscribe_to_topic(self, tokens: list, topic: str) -> Dict[str, Any]:
        """
        Subscribe devices to a topic
        """
        if firebase_admin is None:
            logger.error("Firebase Admin SDK not installed.")
            return {
                "success_count": 0,
                "failure_count": len(tokens),
                "error": "Firebase Admin SDK not installed",
            }

        try:
            response = messaging.subscribe_to_topic(tokens, topic)
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count,
            }
        except Exception as e:
            logger.error(f"Error subscribing to topic: {e}")
            return {"success_count": 0, "failure_count": len(tokens), "error": str(e)}

    def unsubscribe_from_topic(self, tokens: list, topic: str) -> Dict[str, Any]:
        """
        Unsubscribe devices from a topic
        """
        if firebase_admin is None:
            logger.error("Firebase Admin SDK not installed.")
            return {
                "success_count": 0,
                "failure_count": len(tokens),
                "error": "Firebase Admin SDK not installed",
            }

        try:
            response = messaging.unsubscribe_from_topic(tokens, topic)
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count,
            }
        except Exception as e:
            logger.error(f"Error unsubscribing from topic: {e}")
            return {"success_count": 0, "failure_count": len(tokens), "error": str(e)}

    def set_document(
        self, collection: str, document_id: str, data: Dict[str, Any]
    ) -> bool:
        """
        Set document in Firestore
        """
        if firebase_admin is None:
            logger.error("Firebase Admin SDK not installed.")
            return False

        try:
            doc_ref = self.db.collection(collection).document(document_id)
            doc_ref.set(data)
            return True
        except Exception as e:
            logger.error(f"Error setting document: {e}")
            return False

    def get_document(
        self, collection: str, document_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get document from Firestore
        """
        if firebase_admin is None:
            logger.error("Firebase Admin SDK not installed.")
            return None

        try:
            doc_ref = self.db.collection(collection).document(document_id)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error getting document: {e}")
            return None

    def update_document(
        self, collection: str, document_id: str, data: Dict[str, Any]
    ) -> bool:
        """
        Update document in Firestore
        """
        if firebase_admin is None:
            logger.error("Firebase Admin SDK not installed.")
            return False

        try:
            doc_ref = self.db.collection(collection).document(document_id)
            doc_ref.update(data)
            return True
        except Exception as e:
            logger.error(f"Error updating document: {e}")
            return False

    def delete_document(self, collection: str, document_id: str) -> bool:
        """
        Delete document from Firestore
        """
        if firebase_admin is None:
            logger.error("Firebase Admin SDK not installed.")
            return False

        try:
            doc_ref = self.db.collection(collection).document(document_id)
            doc_ref.delete()
            return True
        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            return False

    def query_collection(
        self, collection: str, filters: list = None, limit: int = None
    ) -> list:
        """
        Query documents from a collection
        """
        if firebase_admin is None:
            logger.error("Firebase Admin SDK not installed.")
            return []

        try:
            query = self.db.collection(collection)

            if filters:
                for field, op, value in filters:
                    query = query.where(field, op, value)

            if limit:
                query = query.limit(limit)

            docs = query.stream()
            return [{"id": doc.id, **doc.to_dict()} for doc in docs]
        except Exception as e:
            logger.error(f"Error querying collection: {e}")
            return []

    def set_rt_db_value(self, path: str, data: Any) -> bool:
        """
        Set value in Realtime Database
        """
        if firebase_admin is None or rtdb is None:
            logger.error("Firebase Admin SDK or Realtime Database not installed.")
            return False

        try:
            ref = rtdb.reference(path)
            ref.set(data)
            return True
        except Exception as e:
            logger.error(f"Error setting RTDB value: {e}")
            return False

    def get_rt_db_value(self, path: str) -> Any:
        """
        Get value from Realtime Database
        """
        if firebase_admin is None or rtdb is None:
            logger.error("Firebase Admin SDK or Realtime Database not installed.")
            return None

        try:
            ref = rtdb.reference(path)
            return ref.get()
        except Exception as e:
            logger.error(f"Error getting RTDB value: {e}")
            return None

    def update_rt_db_value(self, path: str, data: Any) -> bool:
        """
        Update value in Realtime Database
        """
        if firebase_admin is None or rtdb is None:
            logger.error("Firebase Admin SDK or Realtime Database not installed.")
            return False

        try:
            ref = rtdb.reference(path)
            ref.update(data)
            return True
        except Exception as e:
            logger.error(f"Error updating RTDB value: {e}")
            return False

    def push_rt_db_value(self, path: str, data: Any) -> str:
        """
        Push value to Realtime Database (creates unique child key)
        """
        if firebase_admin is None or rtdb is None:
            logger.error("Firebase Admin SDK or Realtime Database not installed.")
            return ""

        try:
            ref = rtdb.reference(path)
            new_ref = ref.push(data)
            return new_ref.key
        except Exception as e:
            logger.error(f"Error pushing RTDB value: {e}")
            return ""


# Global instance
firebase_service = None


def get_firebase_service():
    """
    Get the global Firebase service instance
    """
    global firebase_service
    if firebase_service is None:
        firebase_service = FirebaseService()
    return firebase_service
