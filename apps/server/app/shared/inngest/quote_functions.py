import inngest

from app.modules.quotes.services.quote_expiration import expire_overdue_quotes
from app.shared.database import get_session_factory

from .client import inngest_client


def run_quote_expiration() -> int:
    db = get_session_factory()()
    try:
        return expire_overdue_quotes(db)
    finally:
        db.close()


@inngest_client.create_function(
    fn_id="quotes-expire-overdue",
    trigger=inngest.TriggerCron(cron="TZ=America/Sao_Paulo 0 3 * * *"),
)
async def expire_overdue_quotes_daily(ctx: inngest.Context) -> dict:
    expired = await ctx.step.run("expire-overdue-quotes", run_quote_expiration)
    return {"expired": expired}


quote_inngest_functions = [expire_overdue_quotes_daily]
