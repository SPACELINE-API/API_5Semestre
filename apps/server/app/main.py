import os
from fastapi import FastAPI
import inngest.fast_api

from app.routes import api_router
from app.modules.support_agents.inngest.client import inngest_client
from app.modules.support_agents.inngest.functions import support_agent_inngest_functions

os.environ.setdefault("INNGEST_DEV", "1")
from app.shared.database import check_database_connection

app = FastAPI(title="API 5 Semestre")

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
