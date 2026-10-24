import sys
from importlib import import_module
from pathlib import Path

SERVER_PATH = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_PATH))

import_module("app.modules.models")

seed_users = import_module("app.modules.seed.seed_users").seed_users
seed_roles = import_module("app.modules.seed.seed_roles").seed_roles
seed_companies = import_module("app.modules.seed.seed_companies").seed_companies
seed_contacts = import_module("app.modules.seed.seed_contacts").seed_contacts
seed_requests = import_module("app.modules.seed.seed_requests").seed_requests
seed_languages = import_module("app.modules.seed.seed_languages").seed_languages
seed_qualifications = import_module("app.modules.seed.seed_qualifications").seed_qualifications
seed_quotes = import_module("app.modules.seed.seed_quotes").seed_quotes
seed_translators = import_module("app.modules.seed.seed_translators").seed_translators
seed_service_orders = import_module("app.modules.seed.seed_service_orders").seed_service_orders
seed_service_order_email_template = import_module(
    "app.modules.seed.seed_service_order_email_template"
).seed_service_order_email_template
seed_invites = import_module("app.modules.seed.seed_invites").seed_invites
seed_demo_complement = import_module("app.modules.seed.seed_demo_complement").seed_demo_complement
seed_demo_operations = import_module("app.modules.seed.seed_demo_operations").seed_demo_operations
apply_migrations = import_module("scripts.apply_migrations").apply_migrations

if __name__ == "__main__":
    apply_migrations()

    users = seed_users()
    roles = seed_roles()
    companies = seed_companies()
    contacts = seed_contacts()
    requests = seed_requests()
    languages = seed_languages()
    qualifications = seed_qualifications()
    quotes = seed_quotes()
    # The legacy translator/invite seeds delete existing rows. The additive demo
    # seed below supplies these records without removing current assignments.
    email_template = seed_service_order_email_template()
    demo_commercial = seed_demo_complement()
    from app.shared.database import get_session_factory

    with get_session_factory()() as db:
        demo_operations = seed_demo_operations(db)
    translators = demo_operations["translators"]
    service_orders = demo_operations.get("orders", 0)
    invites = demo_operations["invites"]
    print(
        f"Seeded {len(users)} users, {len(companies)} companies, "
        f"{len(roles)} roles, "
        f"{len(contacts)} contacts, {len(requests)} requests, "
        f"{len(languages)} languages, "
        f"{len(qualifications)} qualifications, {len(quotes)} quotes, "
        f"{translators} translators, {service_orders} service orders "
        f"and {invites} invites. Email template: {email_template}. "
        f"Added {len(demo_commercial)} demo commercial records and "
        f"{sum(demo_operations.values())} demo operational records "
        f"({demo_operations})."
    )
