import httpx

from app.modules.auth.services.supabase_auth_client import SupabaseAuthClient


def test_password_recovery_sends_redirect_to_as_query_parameter() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, request=request)

    client = SupabaseAuthClient(
        supabase_url="http://localhost:8000",
        anon_key="anon-key",
        http_client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    client.request_password_recovery("user@example.com", "http://localhost:5173/login")

    assert str(requests[0].url) == (
        "http://localhost:8000/auth/v1/recover?redirect_to=http%3A%2F%2Flocalhost%3A5173%2Flogin"
    )
    assert requests[0].read() == b'{"email":"user@example.com"}'
