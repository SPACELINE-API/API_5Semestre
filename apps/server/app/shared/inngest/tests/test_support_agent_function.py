from app.shared.inngest.functions import extract_final_response


class FakePart:
    def __init__(self, text: str) -> None:
        self.text = text


class FakeContent:
    def __init__(self, text: str) -> None:
        self.parts = [FakePart(text)]


class FakeEvent:
    def __init__(self, text: str) -> None:
        self.content = FakeContent(text)


def test_extract_final_response_returns_text_from_final_event():
    response = extract_final_response([FakeEvent("Resposta do agente")])

    assert response == "Resposta do agente"
