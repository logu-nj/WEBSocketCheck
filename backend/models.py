from datetime import datetime
from enum import IntEnum
from pydantic import BaseModel, Field, ConfigDict

class MessageType(IntEnum):
    MESSAGE = 0
    NOTIFICATION = 1

class MessageModel(BaseModel):
    message: str
    from_user: str = Field(alias="fromUser")
    to_user: str = Field(alias="toUser")
    type: int
    time: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True  # 👈 allows both fromUser or from_user
        json_encoders = {datetime: lambda v: v.isoformat()}