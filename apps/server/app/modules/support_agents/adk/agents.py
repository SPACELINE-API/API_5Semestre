from app.modules.support_agents.adk.prompt.support_agent import SUPPORT_AGENT_INSTRUCTION
from app.modules.support_agents.adk.tools import testar_conhecimento
from app.shared.google_adk.factory import create_agent

root_agent = create_agent(
    name="support_agent",
    description="Agente responsável pelo suporte aos colaboradores",
    instruction=SUPPORT_AGENT_INSTRUCTION,
    tools=[testar_conhecimento],
)
