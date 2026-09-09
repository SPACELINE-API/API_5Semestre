from fastapi import APIRouter

from app.modules.allocations.routes import router as allocations_router
from app.modules.auth.routes import router as auth_router
from app.modules.clients.routes import router as clients_router
from app.modules.contacts.routes import router as contacts_router
from app.modules.quotes.routes import router as quotes_router
from app.modules.resources.routes import router as resources_router
from app.modules.service_orders.routes import router as service_orders_router
from app.modules.support.routes import router as support_router
from app.modules.translators.routes import router as translators_router
from app.modules.users.routes import router as users_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(clients_router)
api_router.include_router(contacts_router)
api_router.include_router(resources_router)
api_router.include_router(translators_router)
api_router.include_router(service_orders_router)
api_router.include_router(allocations_router)
api_router.include_router(quotes_router)
api_router.include_router(support_router)
