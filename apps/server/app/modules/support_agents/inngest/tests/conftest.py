import pytest


@pytest.fixture(autouse=True)
def mock_input_guard(monkeypatch):
    async def fake_acheck_input(texto: str) -> None:
        return None

    monkeypatch.setattr(
        "app.modules.support_agents.inngest.services.support_agent_services.acheck_input",
        fake_acheck_input,
    )
