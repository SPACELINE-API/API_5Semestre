import os
from fastapi import FastAPI
import inngest.fast_api

from app.routes import api_router
from app.modules.support_agents.inngest.client import inngest_client
from app.modules.support_agents.inngest.functions import support_agent_inngest_functions

# Garante o modo de desenvolvimento local
os.environ.setdefault("INNGEST_DEV", "1")

app = FastAPI(title="API 5 Semestre")

inngest.fast_api.serve(
    app,
    inngest_client,
    support_agent_inngest_functions,
)

app.include_router(api_router)

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
