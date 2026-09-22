import inngest
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.modules.support_agents.adk.agents import root_agent
from app.shared.google_adk.config import ADK_MODEL, ADK_PROVIDER

from .client import inngest_client


def extract_final_response(events) -> str:
    for event in reversed(events):
        content = getattr(event, "content", None)
        parts = getattr(content, "parts", None) if content else None
        texts = [getattr(part, "text", None) for part in parts or []]
        response = "".join(text for text in texts if text)
        if response:
            return response
    return ""


@inngest_client.create_function(
    fn_id="support-agent-test",
    trigger=inngest.TriggerEvent(event="support/agent.test"),
)
async def test_support_agent(ctx: inngest.Context) -> dict:
    text = ctx.event.data.get("texto", "Olá, faça um teste.")

    async def _run_agent():
        app_name = "support_agents"
        user_id = "inngest-test"
        session_service = InMemorySessionService()
        session = await session_service.create_session(
            app_name=app_name,
            user_id=user_id,
        )
        runner = Runner(
            app_name=app_name,
            agent=root_agent,
            session_service=session_service,
        )
        message = types.Content(
            role="user",
            parts=[types.Part(text=text)],
        )
        events = [
            event
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session.id,
                new_message=message,
            )
        ]
        return extract_final_response(events)

    response = await ctx.step.run("run-support-agent", _run_agent)
    return {
        "status": "success",
        "data": {
            "provider": ADK_PROVIDER,
            "model": ADK_MODEL,
            "response": response,
        },
    }


@inngest_client.create_function(
    fn_id="support-agent-process-ticket",
    trigger=inngest.TriggerEvent(event="support/ticket.process"),
)
async def process_support_ticket(ctx: inngest.Context) -> dict:
    async def _prepare_context():
        ticket_id = ctx.event.data.get("ticket_id")
        return {"ticket_id": ticket_id, "status": "context_ready"}

    async def _execute_llm():
        return {"response": "Resposta gerada pelo agente de suporte", "status": "completed"}

    llm_result = await ctx.step.run("generate-llm-response", _execute_llm)

    return {"status": "success", "data": llm_result}


support_agent_inngest_functions = [
    test_support_agent,
    process_support_ticket,
]
