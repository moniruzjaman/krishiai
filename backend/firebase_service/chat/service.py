"""
Firebase Chat Service Implementation

Handles all Firebase Cloud Firestore chat operations for the Krishi AI platform.
"""

import json
from datetime import datetime
from typing import Dict, List, Optional

import requests
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
        room_data["created_at"] = {
            "timestampValue": datetime.utcnow().isoformat() + "Z"
        }
        room_data["updated_at"] = {
            "timestampValue": datetime.utcnow().isoformat() + "Z"
        }

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
        message_data["timestamp"] = {
            "timestampValue": datetime.utcnow().isoformat() + "Z"
        }

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

    def get_chat_messages(
        self, room_id: str, limit: int = 50, start_after: Optional[str] = None
    ) -> Dict:
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
                    {"field": {"fieldPath": "timestamp"}, "direction": "DESCENDING"}
                ],
                "limit": limit,
            }
        }

        if start_after:
            payload["structuredQuery"]["startAt"] = {
                "values": [
                    {
                        "referenceValue": f"projects/{self.project_id}/databases/(default)/documents/{collection}/{document}/{subcollection}/{start_after}"
                    }
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
                                    "value": {"stringValue": user_id},
                                }
                            },
                            {
                                "fieldFilter": {
                                    "field": {"fieldPath": "participants"},
                                    "op": "ARRAY_CONTAINS",
                                    "value": {"stringValue": user_id},
                                }
                            },
                        ],
                    }
                },
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
            participants = (
                fields.get("participants", {}).get("arrayValue", {}).get("values", [])
            )

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
            participants = (
                fields.get("participants", {}).get("arrayValue", {}).get("values", [])
            )

            participant_ids = [p.get("stringValue", "") for p in participants]

            if user_id in participant_ids:
                participants = [
                    p for p in participants if p.get("stringValue", "") != user_id
                ]
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
                            "sender_id": {
                                "stringValue": message_data.get("sender_id", "")
                            },
                            "sender_name": {
                                "stringValue": message_data.get("sender_name", "")
                            },
                            "timestamp": {
                                "timestampValue": message_data.get(
                                    "timestamp",
                                    {
                                        "timestampValue": datetime.utcnow().isoformat()
                                        + "Z"
                                    },
                                )
                            },
                        }
                    }
                },
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
                            converted = self._convert_from_firestore_format(
                                item["mapValue"].get("fields", {})
                            )
                            array_values.append(converted)

                result[key] = array_values
            elif "mapValue" in value:
                if "fields" in value["mapValue"]:
                    converted = self._convert_from_firestore_format(
                        value["mapValue"]["fields"]
                    )
                    result[key] = converted

        return result
