import { createRootRoute } from "@tanstack/react-router";
import { AppLayout } from "../app/layouts/AppLayout";

export const Route = createRootRoute({
  component: AppLayout,
});
