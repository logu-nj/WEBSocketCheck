import logging
from typing import Dict, List
from starlette.websockets import WebSocket, WebSocketDisconnect
from models import MessageModel, MessageType
from datetime import datetime

class WebsocketManager:
    def __init__(self):
        self.connected_clients: Dict[str, WebSocket] = {}
        self.message_models: List[MessageModel] = []

    async def connect(self, user_name: str, websocket: WebSocket):
        await websocket.accept()
        self.connected_clients[user_name] = websocket
        await self.send_existing_message(user_name)
        await self.broadcast_user_status(user_name, 'online')

    async def send_existing_message(self, user_name: str):
        """Send previous chat history to a newly connected user."""
        websocket = self.connected_clients.get(user_name)
        if not websocket:
            return

        for msg in self.message_models:
            if msg.from_user == user_name or msg.to_user == user_name:
                try:
                    await websocket.send_json(msg.model_dump(mode="json", by_alias=True))
                except Exception as e:
                    logging.warning(f"Failed to send history to {user_name}: {e}")

    async def disconnect(self, user_name: str):
        if user_name in self.connected_clients:
            del self.connected_clients[user_name]
        await self.broadcast_user_status(user_name, 'offline')

    async def broadcast_message(self, msg_model: MessageModel):
        """Send message to target user if connected."""
        to_socket = self.connected_clients.get(msg_model.to_user)
        if to_socket:
            try:
                await to_socket.send_json(msg_model.model_dump(mode="json", by_alias=True))
                self.message_models.append(msg_model)
            except Exception as e:
                logging.error(f"Failed to send to {msg_model.to_user}: {e}")
        else:
            # Store message for later delivery
            self.message_models.append(msg_model)
            logging.info(f"User {msg_model.to_user} is offline. Message queued.")

    async def broadcast_user_status(self, user_name: str, status: str):
        """Notify all clients when someone goes online/offline."""
        for client_name, socket in self.connected_clients.items():
            if client_name == user_name:
                continue

            msg = MessageModel(
                message=f"{user_name} is {status}.",
                from_user=user_name,
                to_user=client_name,
                type=MessageType.NOTIFICATION,
                time=datetime.now().isoformat()
            )
            try:
                await socket.send_json(msg.model_dump(mode="json", by_alias=True))
            except Exception as e:
                logging.warning(f"Failed to send status to {client_name}: {e}")
