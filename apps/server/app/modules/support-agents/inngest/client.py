import os
import inngest

is_dev = os.getenv("INNGEST_DEV", "1") == "1"

inngest_client = inngest.Inngest(
    app_id="api-5-semestre",
    is_dev=is_dev
)