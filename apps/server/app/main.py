from fastapi import FastAPI

from app.routes import api_router
from app.shared.database import check_database_connection

app = FastAPI(title="API 5 Semestre")

app.include_router(api_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    database_status = "ok" if check_database_connection() else "error"

    return {"status": "ok", "database": database_status}
