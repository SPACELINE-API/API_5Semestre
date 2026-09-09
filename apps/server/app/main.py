from fastapi import FastAPI

app = FastAPI(title="API 5 Semestre")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
