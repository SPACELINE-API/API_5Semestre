import inngest
import os

inngest_client = inngest.Inngest(
    app_id="api-5-semestre", is_production=bool(os.getenv("INNGEST_SIGNING_KEY"))
)
