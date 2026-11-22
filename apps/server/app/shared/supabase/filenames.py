import re
import unicodedata


def safe_storage_filename(filename: str, fallback: str = "arquivo") -> str:
    normalized = unicodedata.normalize("NFKD", filename).encode("ascii", "ignore").decode()
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", normalized).strip("._")
    return (cleaned or fallback)[-120:]
