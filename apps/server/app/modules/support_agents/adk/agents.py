from app.modules.support_agents.adk.prompt.support_agent import SUPPORT_AGENT_INSTRUCTION
from app.shared.google_adk.factory import create_agent
from app.shared.google_adk.tool_catalog.adk_toolset import criar_toolset
from app.shared.google_adk.tool_catalog.catalogo_leitura import obter_catalogo_leitura

root_agent = create_agent(
    name="support_agent",
    description="Agente responsável pelo suporte aos colaboradores",
    instruction=SUPPORT_AGENT_INSTRUCTION,
    tools=[criar_toolset(obter_catalogo_leitura())],
)
