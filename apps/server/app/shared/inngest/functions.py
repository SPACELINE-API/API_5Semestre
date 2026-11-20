import os

import inngest
from google.adk.runners import Runner
from google.genai import types

from app.modules.support_agents.adk.agents import root_agent
from app.shared.google_adk.config import ADK_MODEL, ADK_PROVIDER
from app.shared.google_adk.mongo_session_service import MongoSessionService

from .client import inngest_client

USER_ID_PADRAO = "chat-support"
APP_NAME = "support_agents"

session_service = MongoSessionService(
    url=os.getenv("MONGO_URL", "mongodb://localhost:27017"),
    db_name=os.getenv("MONGO_DB", "support_agents"),
)
runner = Runner(app_name=APP_NAME, agent=root_agent, session_service=session_service)


def extrair_user_id(data: dict) -> str:
    user_id = data.get("user_id")
    if isinstance(user_id, str) and user_id:
        return user_id
    return USER_ID_PADRAO


def extract_final_response(events) -> str:
    for event in reversed(events):
        content = getattr(event, "content", None)
        parts = getattr(content, "parts", None) if content else None
        texts = [getattr(part, "text", None) for part in parts or []]
        response = "".join(text for text in texts if text)
        if response:
            return response
    return ""


async def run_support_agent(texto: str, user_id: str, session_id: str | None = None) -> str:
    session_id = session_id or user_id  # sem session_id: uma conversa contínua por usuário
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if session is None:
        await session_service.create_session(
            app_name=APP_NAME, user_id=user_id, session_id=session_id
        )
    message = types.Content(role="user", parts=[types.Part(text=texto)])
    events = [
        event
        async for event in runner.run_async(
            user_id=user_id, session_id=session_id, new_message=message
        )
    ]
    return extract_final_response(events)


@inngest_client.create_function(
    fn_id="support-agent-test",
    trigger=inngest.TriggerEvent(event="support/agent.test"),
)
async def test_support_agent(ctx: inngest.Context) -> dict:
    text = ctx.event.data.get("texto", "Olá, faça um teste.")

    if not isinstance(text, str):
        raise ValueError("O campo 'texto' deve ser uma string")

    response = await ctx.step.run(
        "run-support-agent", lambda: run_support_agent(text, "inngest-test")
    )
    return {
        "status": "success",
        "data": {
            "provider": ADK_PROVIDER,
            "model": ADK_MODEL,
            "response": response,
        },
    }


@inngest_client.create_function(
    fn_id="support-agent-chat",
    trigger=inngest.TriggerEvent(event="support/chat.ask"),
    concurrency=[inngest.Concurrency(limit=1, key="event.data.session_id")],
)
async def process_chat_message(ctx: inngest.Context) -> dict:
    texto = ctx.event.data.get("texto", "")

    if not isinstance(texto, str):
        raise ValueError("O campo 'texto' deve ser uma string")

    user_id = extrair_user_id(dict(ctx.event.data))
    session_id_value = ctx.event.data.get("session_id")
    session_id = session_id_value if isinstance(session_id_value, str) else None

    resposta = await ctx.step.run(
        "run-support-agent", lambda: run_support_agent(texto, user_id, session_id)
    )
    return {"resposta": resposta}


@inngest_client.create_function(
    fn_id="support-agent-process-ticket",
    trigger=inngest.TriggerEvent(event="support/ticket.process"),
)
async def process_support_ticket(ctx: inngest.Context) -> dict:
    async def _execute_llm():
        return {"response": "Resposta gerada pelo agente de suporte", "status": "completed"}

    llm_result = await ctx.step.run("generate-llm-response", _execute_llm)
    return {"status": "success", "data": llm_result}


support_agent_inngest_functions = [
    test_support_agent,
    process_chat_message,
    process_support_ticket,
]