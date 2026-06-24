import { ThemeProvider } from "./context/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

function App() {
  return (
    <ThemeProvider>
      <DashboardLayout />
    </ThemeProvider>
  );
}

export default App;
