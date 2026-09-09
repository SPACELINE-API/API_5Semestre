from fastapi import FastAPI

from app.routes import api_router

app = FastAPI(title="API 5 Semestre")

app.include_router(api_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
