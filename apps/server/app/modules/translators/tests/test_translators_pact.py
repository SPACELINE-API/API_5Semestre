from pathlib import Path

from pact import Pact

# DIRETORIO RAIZ ONDE OS CONTRATOS PACT FICAM SALVOS
PACT_DIR = Path(__file__).parents[4] / "pacts"

# IDENTIFICADORES FICTICIOS PARA OS CONTRATOS
MOCK_TRANSLATOR_ID = "123e4567-e89b-12d3-a456-426614174000"
NON_EXISTENT_TRANSLATOR_ID = "999e4567-e89b-12d3-a456-426614174999"
MOCK_QUALIFICATION_ID = "c731d4d4-9569-4db2-9d7f-1569db5f270e"
MOCK_LANGUAGE_PAIR_ID = "eb162eb3-b88c-42f6-89d7-3da5112f7d31"
MOCK_TRANSLATOR_PAIR_ID = "123e4567-e89b-12d3-a456-426614174001"


# CONTRATO DE CRIACAO DE TRADUTOR COM QUALIFICACOES E PARES DE IDIOMA
def test_create_translator_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving(
            "a request to create a translator with qualifications and language pairs"
        )
        .given("qualifications and language pairs exist in database")
        .with_request("POST", "/api/translators")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "name": "Maria Silva",
                "email": "maria.silva@exemplo.com",
                "phone": "11988887777",
                "qualification_ids": [MOCK_QUALIFICATION_ID],
                "language_pairs": [
                    {
                        "language_pair_id": MOCK_LANGUAGE_PAIR_ID,
                        "proficiency_level": "fluent",
                    }
                ],
            }
        )
        .will_respond_with(201)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "id": MOCK_TRANSLATOR_ID,
                "name": "Maria Silva",
                "email": "maria.silva@exemplo.com",
                "phone": "11988887777",
                "is_active": True,
                "created_at": "2026-09-15T10:00:00Z",
                "updated_at": "2026-09-15T10:00:00Z",
                "qualifications": [
                    {
                        "id": MOCK_QUALIFICATION_ID,
                        "name": "Tradução Jurídica",
                        "description": "Contratos e peças",
                    }
                ],
                "language_pairs": [
                    {
                        "id": MOCK_TRANSLATOR_PAIR_ID,
                        "language_pair_id": MOCK_LANGUAGE_PAIR_ID,
                        "proficiency_level": "fluent",
                    }
                ],
            }
        )
    )

    pact.write_file(PACT_DIR)


# CONTRATO DE ATUALIZACAO DE TRADUTOR COM QUALIFICACOES E PARES DE IDIOMA
def test_update_translator_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving(
            "a request to update a translator with qualifications and language pairs"
        )
        .given("a translator exists")
        .with_request("PUT", f"/api/translators/{MOCK_TRANSLATOR_ID}")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "name": "Maria Silva Atualizada",
                "email": "maria.silva@exemplo.com",
                "phone": "11999990000",
                "qualification_ids": [MOCK_QUALIFICATION_ID],
                "language_pairs": [
                    {
                        "language_pair_id": MOCK_LANGUAGE_PAIR_ID,
                        "proficiency_level": "native",
                    }
                ],
            }
        )
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "id": MOCK_TRANSLATOR_ID,
                "name": "Maria Silva Atualizada",
                "email": "maria.silva@exemplo.com",
                "phone": "11999990000",
                "is_active": True,
                "created_at": "2026-09-15T10:00:00Z",
                "updated_at": "2026-09-15T10:30:00Z",
                "qualifications": [
                    {
                        "id": MOCK_QUALIFICATION_ID,
                        "name": "Tradução Jurídica",
                        "description": "Contratos e peças",
                    }
                ],
                "language_pairs": [
                    {
                        "id": MOCK_TRANSLATOR_PAIR_ID,
                        "language_pair_id": MOCK_LANGUAGE_PAIR_ID,
                        "proficiency_level": "native",
                    }
                ],
            }
        )
    )

    pact.write_file(PACT_DIR)


# CONTRATO DE CONSULTA DE TRADUTOR COM SEUS RELACIONAMENTOS
def test_get_translator_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to get a translator by id with relationships")
        .given("a translator exists with qualifications and language pairs")
        .with_request("GET", f"/api/translators/{MOCK_TRANSLATOR_ID}")
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "id": MOCK_TRANSLATOR_ID,
                "name": "Maria Silva",
                "email": "maria.silva@exemplo.com",
                "phone": "11988887777",
                "is_active": True,
                "created_at": "2026-09-15T10:00:00Z",
                "updated_at": "2026-09-15T10:00:00Z",
                "qualifications": [
                    {
                        "id": MOCK_QUALIFICATION_ID,
                        "name": "Tradução Jurídica",
                        "description": "Contratos e peças",
                    }
                ],
                "language_pairs": [
                    {
                        "id": MOCK_TRANSLATOR_PAIR_ID,
                        "language_pair_id": MOCK_LANGUAGE_PAIR_ID,
                        "proficiency_level": "fluent",
                    }
                ],
            }
        )
    )

    pact.write_file(PACT_DIR)


# CONTRATO DE LISTAGEM DE TRADUTORES
def test_list_translators_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list all translators")
        .given("translators exist")
        .with_request("GET", "/api/translators")
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            [
                {
                    "id": MOCK_TRANSLATOR_ID,
                    "name": "Maria Silva",
                    "email": "maria.silva@exemplo.com",
                    "phone": "11988887777",
                    "is_active": True,
                    "created_at": "2026-09-15T10:00:00Z",
                    "updated_at": "2026-09-15T10:00:00Z",
                    "qualifications": [],
                    "language_pairs": [],
                }
            ]
        )
    )

    pact.write_file(PACT_DIR)


# CONTRATO DE ERRO PARA DADOS OBRIGATORIOS AUSENTES OU INVALIDOS
def test_create_translator_missing_fields_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create a translator with empty body")
        .given("the request is completely empty")
        .with_request("POST", "/api/translators")
        .with_headers({"Content-Type": "application/json"})
        .with_body({})
        .will_respond_with(422)
        .with_headers({"Content-Type": "application/json"})
    )

    pact.write_file(PACT_DIR)


# CONTRATO DE ERRO PARA TRADUTOR INEXISTENTE
def test_get_translator_not_found_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to get a non-existent translator")
        .given("the translator does not exist")
        .with_request("GET", f"/api/translators/{NON_EXISTENT_TRANSLATOR_ID}")
        .will_respond_with(404)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "detail": "Translator not found",
            }
        )
    )

    pact.write_file(PACT_DIR)


# CONTRATO DE EXCLUSAO DE TRADUTOR
def test_delete_translator_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to delete an existing translator")
        .given("a translator exists")
        .with_request("DELETE", f"/api/translators/{MOCK_TRANSLATOR_ID}")
        .will_respond_with(204)
    )

    pact.write_file(PACT_DIR)
