import { SutrProvider } from "./lib/store";
import Shell from "./components/Shell";

export default function App() {
  return (
    <SutrProvider>
      <Shell />
    </SutrProvider>
  );
}
