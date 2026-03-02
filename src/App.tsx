import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import ManageSavingsAccounts from "@/pages/ManageSavingsAccounts";
import Layout from "@/components/Layout";
import Dashboard from "./pages/Index";
import Transactions from "./pages/Transactions";
import AddTransaction from "./pages/AddTransaction";
import SettingsPage from "./pages/Settings";
import ManageCategories from "./pages/ManageCategories";
import ManageBudgets from "./pages/ManageBudgets";
import ManageIncomeSources from "./pages/ManageIncomeSources";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/add" element={<AddTransaction />} />
              <Route path="/edit/:id" element={<AddTransaction />} />
              <Route path="/categories" element={<ManageCategories />} />
              <Route path="/budgets" element={<ManageBudgets />} />
              <Route path="/income-sources" element={<ManageIncomeSources />} />
              <Route path="/savings-accounts" element={<ManageSavingsAccounts />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
