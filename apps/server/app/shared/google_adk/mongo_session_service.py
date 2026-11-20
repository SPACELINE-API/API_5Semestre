import time
import uuid
from typing import Any

from google.adk.events import Event
from google.adk.sessions import BaseSessionService, Session
from google.adk.sessions.base_session_service import GetSessionConfig, ListSessionsResponse
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection


class MongoSessionService(BaseSessionService):
    """Session service do ADK persistindo em MongoDB (um documento por sessão)."""

    def __init__(self, url: str, db_name: str = "support_agents"):
        self.col: AsyncIOMotorCollection = AsyncIOMotorClient(url)[db_name]["sessions"]

    @staticmethod
    def _id(app_name: str, user_id: str, session_id: str) -> str:
        return f"{app_name}:{user_id}:{session_id}"

    async def ensure_indexes(self) -> None:
        await self.col.create_index([("app_name", 1), ("user_id", 1), ("updated_at", 1)])

    async def create_session(
        self,
        *,
        app_name: str,
        user_id: str,
        state: dict[str, Any] | None = None,
        session_id: str | None = None,
    ) -> Session:
        session = Session(
            id=session_id or str(uuid.uuid4()),
            app_name=app_name,
            user_id=user_id,
            state=state or {},
            events=[],
            last_update_time=time.time(),
        )
        await self._save(session)
        return session

    async def get_session(
        self,
        *,
        app_name: str,
        user_id: str,
        session_id: str,
        config: GetSessionConfig | None = None,
    ) -> Session | None:
        doc = await self.col.find_one({"_id": self._id(app_name, user_id, session_id)})
        if not doc:
            return None
        session = Session.model_validate(doc["data"])
        if config:
            if config.num_recent_events:
                session.events = session.events[-config.num_recent_events :]
            if config.after_timestamp:
                session.events = [e for e in session.events if e.timestamp > config.after_timestamp]
        return session

    async def list_sessions(
        self, *, app_name: str, user_id: str | None = None
    ) -> ListSessionsResponse:
        query: dict[str, Any] = {"app_name": app_name}
        if user_id is not None:
            query["user_id"] = user_id
        sessions = []
        async for doc in self.col.find(query).sort("updated_at", 1):
            s = Session.model_validate(doc["data"])
            s.events = []
            sessions.append(s)
        return ListSessionsResponse(sessions=sessions)

    async def delete_session(self, *, app_name: str, user_id: str, session_id: str) -> None:
        await self.col.delete_one({"_id": self._id(app_name, user_id, session_id)})

    async def append_event(self, session: Session, event: Event) -> Event:
        event = await super().append_event(session, event)
        if event.partial:
            return event
        session.last_update_time = time.time()
        await self._save(session)
        return event

    async def _save(self, session: Session) -> None:
        await self.col.replace_one(
            {"_id": self._id(session.app_name, session.user_id, session.id)},
            {
                "app_name": session.app_name,
                "user_id": session.user_id,
                "updated_at": session.last_update_time,
                "data": session.model_dump(mode="json"),
            },
            upsert=True,
        )
