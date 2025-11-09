import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from websocket_manager import WebsocketManager
from models import MessageModel

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # adjust if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = WebsocketManager()


@app.get("/get_users/{user_name}")
async def get_users(user_name: str):
    """Return list of online users except the caller"""
    return [u for u in manager.connected_clients.keys() if u != user_name]


@app.websocket("/ws/chat/{user_name}")
async def websocket_endpoint(websocket: WebSocket, user_name: str):
    """WebSocket connection handler for chat"""
    await manager.connect(user_name, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg = MessageModel(**data)
            logging.info(f"💬 {msg.from_user} -> {msg.to_user}: {msg.message}")
            await manager.broadcast_message(msg)
    except WebSocketDisconnect:
        await manager.disconnect(user_name)
    except Exception as e:
        logging.error(f"Unexpected error for {user_name}: {e}")
        await manager.disconnect(user_name)


if __name__ == "__main__":
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
