import logging
import os

import inngest.fast_api
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import api_router
from app.shared.database import check_database_connection
from app.shared.inngest.client import inngest_client
from app.shared.inngest.functions import support_agent_inngest_functions

load_dotenv()


class _HideInngestAccessLogs(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        return "/api/inngest" not in message


logging.getLogger("uvicorn.access").addFilter(_HideInngestAccessLogs())


app = FastAPI(title="API 5 Semestre")

default_cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
]
cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOW_ORIGINS", ",".join(default_cors_origins)).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

inngest.fast_api.serve(
    app,
    inngest_client,
    support_agent_inngest_functions,
)

app.include_router(api_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    database_status = "ok" if check_database_connection() else "error"

    return {"status": "ok", "database": database_status}
