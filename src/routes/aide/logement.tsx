import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/logement")({
  component: LogementLayout,
});

function LogementLayout() {
  return <Outlet />;
}