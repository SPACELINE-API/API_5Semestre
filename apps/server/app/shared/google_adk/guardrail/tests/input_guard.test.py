from app.shared.google_adk.guardrail.input_guard import INPUT_GUARD_TIMEOUT_SECONDS


def test_input_guard_timeout_is_120_seconds():
    assert INPUT_GUARD_TIMEOUT_SECONDS == 120
