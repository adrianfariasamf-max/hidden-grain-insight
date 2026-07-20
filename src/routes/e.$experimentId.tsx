import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/e/$experimentId")({
  component: () => <Outlet />,
});