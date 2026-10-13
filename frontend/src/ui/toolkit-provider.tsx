import {
  ToolkitProvider,
  type ToolkitComponents,
} from "@agent-native/toolkit/provider";
import { Button } from "@agent-native/toolkit/ui/button";
import type { ReactNode } from "react";

const components: ToolkitComponents = {
  Button: Button as ToolkitComponents["Button"],
};

export function AppToolkitProvider({ children }: { children: ReactNode }) {
  return <ToolkitProvider components={components}>{children}</ToolkitProvider>;
}
