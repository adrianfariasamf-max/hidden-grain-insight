import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import { queryPolicy } from "./lib/api/query-policy";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({ defaultOptions: queryPolicy });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
