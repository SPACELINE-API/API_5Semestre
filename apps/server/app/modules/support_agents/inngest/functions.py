import inngest

from .client import inngest_client


@inngest_client.create_function(
    fn_id="support-agent-process-ticket",
    trigger=inngest.TriggerEvent(event="support/ticket.process"),
)
async def process_support_ticket(ctx: inngest.Context, step: inngest.Step) -> dict:
    async def _prepare_context():
        ticket_id = ctx.event.data.get("ticket_id")
        return {"ticket_id": ticket_id, "status": "context_ready"}

    async def _execute_llm():
        return {"response": "Resposta gerada pelo agente de suporte", "status": "completed"}

    llm_result = await step.run("generate-llm-response", _execute_llm)

    return {"status": "success", "data": llm_result}


support_agent_inngest_functions = [
    process_support_ticket,
]
