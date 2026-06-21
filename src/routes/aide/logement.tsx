import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/aide/logement")({
  component: LogementLayout,
});

function LogementLayout() {
  return <Outlet />;
}