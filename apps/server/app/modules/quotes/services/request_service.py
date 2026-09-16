from app.modules.quotes.repositories.request_repository import RequestRepository
from app.modules.quotes.schemas.request import RequestCreate

class RequestService:
    def __init__(self, db):
        self.repo = RequestRepository(db)

    def list_all(self):
        return self.repo.list_all()

    def create(self, data: RequestCreate):
        return self.repo.create(data.model_dump())