from google.adk.agents import Agent

from app.shared.google_adk.config import get_model


def create_agent(
    name: str, instruction: str, description: str = "", tools: list | None = None
) -> Agent:
    return Agent(
        name=name,
        model=get_model(),
        instruction=instruction,
        description=description,
        tools=tools or [],
    )
