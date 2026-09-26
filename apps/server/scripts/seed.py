import sys
from importlib import import_module
from pathlib import Path

SERVER_PATH = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_PATH))

seed_users = import_module("app.modules.seed.seed_users").seed_users
seed_companies = import_module("app.modules.seed.seed_companies").seed_companies
seed_contacts = import_module("app.modules.seed.seed_contacts").seed_contacts
seed_requests = import_module("app.modules.seed.seed_requests").seed_requests
seed_languages = import_module("app.modules.seed.seed_languages").seed_languages
seed_language_pairs = import_module("app.modules.seed.seed_language_pairs").seed_language_pairs
seed_qualifications = import_module("app.modules.seed.seed_qualifications").seed_qualifications
seed_quotes = import_module("app.modules.seed.seed_quotes").seed_quotes
seed_translators = import_module("app.modules.seed.seed_translators").seed_translators
seed_service_orders = import_module("app.modules.seed.seed_service_orders").seed_service_orders
seed_invites = import_module("app.modules.seed.seed_invites").seed_invites

if __name__ == "__main__":
    users = seed_users()
    companies = seed_companies()
    contacts = seed_contacts()
    requests = seed_requests()
    languages = seed_languages()
    language_pairs = seed_language_pairs()
    qualifications = seed_qualifications()
    quotes = seed_quotes()
    translators = seed_translators()
    service_orders = seed_service_orders()
    invites = seed_invites()
    print(
        f"Seeded {len(users)} users, {len(companies)} companies, "
        f"{len(contacts)} contacts, {len(requests)} requests, "
        f"{len(languages)} languages, {len(language_pairs)} language pairs, "
        f"{len(qualifications)} qualifications, {len(quotes)} quotes, "
        f"{len(translators)} translators, {len(service_orders)} service orders "
        f"and {len(invites)} invites."
    )
