Hybrid API Routes for Krishi AI Backend

This module defines the API routes for the application, including:
- Firebase routes for users, chat, and alerts
- Supabase routes for crop diagnosis data
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
