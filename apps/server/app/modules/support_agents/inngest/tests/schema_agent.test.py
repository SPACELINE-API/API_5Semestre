from pathlib import Path

from pact import Pact

from app.shared.pact_writer import write_pact

PACT_DIR = Path(__file__).parents[6]


def test_create_support_question_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a support question within the allowed length")
        .given("the support agent is available")
        .with_request("POST", "/api/suporte/perguntas")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "texto": "Como eu crio um lead?",
            }
        )
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "resposta": "[stub] resposta simulada para: Como eu crio um lead?",
            }
        )
    )

    write_pact(pact, PACT_DIR)


def test_create_support_question_invalid_input_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a support question with empty text")
        .given("the request payload fails schema validation")
        .with_request("POST", "/api/suporte/perguntas")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "texto": "",
            }
        )
        .will_respond_with(422)
        .with_headers({"Content-Type": "application/json"})
    )

    write_pact(pact, PACT_DIR)


def test_create_support_question_agent_unavailable_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a support question when the agent is unavailable")
        .given("the support agent dependency raises an error")
        .with_request("POST", "/api/suporte/perguntas")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "texto": "Como eu crio um lead?",
            }
        )
        .will_respond_with(502)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "detail": "O agente de suporte está indisponível no momento. Tente novamente em instantes.",
            }
        )
    )

    write_pact(pact, PACT_DIR)
