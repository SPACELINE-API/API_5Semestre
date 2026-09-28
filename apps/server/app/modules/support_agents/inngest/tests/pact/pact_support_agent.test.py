from pathlib import Path

from pact import Pact

from app.shared.pact_writer import write_pact

PACT_DIR = Path(__file__).parents[6]


def test_frontend_can_enqueue_support_agent_test():
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to enqueue a support agent test")
        .given("the Inngest event service is available")
        .with_request("POST", "/api/suporte/agente/teste")
        .with_headers({"Content-Type": "application/json"})
        .with_body({"texto": "Validar o agente de suporte"})
        .will_respond_with(201)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "status": "queued",
                "evento": "support/agent.test",
                "ids": ["event-id"],
            }
        )
    )

    write_pact(pact, PACT_DIR)
