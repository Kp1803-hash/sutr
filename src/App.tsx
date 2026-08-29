import { HelmProvider } from "./lib/store";
import Shell from "./components/Shell";

export default function App() {
  return (
    <HelmProvider>
      <Shell />
    </HelmProvider>
  );
}
