from datetime import datetime
from zoneinfo import ZoneInfo

LOGIN_MAX_ATTEMPTS = 3
LOGIN_LOCKOUT_TIMEOUT_MINUTES = 5
SAO_PAULO_TIMEZONE = ZoneInfo("America/Sao_Paulo")


def now_in_sao_paulo() -> datetime:
    return datetime.now(SAO_PAULO_TIMEZONE)
