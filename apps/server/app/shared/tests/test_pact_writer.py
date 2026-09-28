import json
from pathlib import Path

from app.shared.pact_writer import merge_pact_files


def _pact(interactions: list[dict]) -> dict:
    return {
        "consumer": {"name": "web"},
        "provider": {"name": "server"},
        "interactions": interactions,
        "metadata": {"pactSpecification": {"version": "4.0"}},
    }


def test_merge_pact_files_keeps_interactions_from_both_pacts(tmp_path: Path) -> None:
    pact_path = tmp_path / "web-server.json"
    pact_path.write_text(json.dumps(_pact([{"description": "existing"}])))
    generated_path = tmp_path / "generated.json"
    generated_path.write_text(json.dumps(_pact([{"description": "new"}])))

    merge_pact_files(generated_path, pact_path)

    result = json.loads(pact_path.read_text())
    assert [item["description"] for item in result["interactions"]] == [
        "existing",
        "new",
    ]


def test_merge_pact_files_replaces_same_interaction_without_duplicates(
    tmp_path: Path,
) -> None:
    pact_path = tmp_path / "web-server.json"
    pact_path.write_text(json.dumps(_pact([{"description": "same", "status": 200}])))
    generated_path = tmp_path / "generated.json"
    generated_path.write_text(json.dumps(_pact([{"description": "same", "status": 201}])))

    merge_pact_files(generated_path, pact_path)

    result = json.loads(pact_path.read_text())
    assert result["interactions"] == [{"description": "same", "status": 201}]
