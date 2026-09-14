from apps.server.app.modules.auth.security.security import hash_password, verify_password


def test_hash_password_does_not_store_plain_password() -> None:
    password_hash = hash_password("123456")

    assert password_hash != "123456"
    assert password_hash.startswith("pbkdf2_sha256$")


def test_verify_password_accepts_matching_password() -> None:
    password_hash = hash_password("123456")

    assert verify_password("123456", password_hash) is True


def test_verify_password_rejects_different_password() -> None:
    password_hash = hash_password("123456")

    assert verify_password("wrong-password", password_hash) is False
