import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import MathPage from "./pages/MathPage";
import AlphabetPage from "./pages/AlphabetPage";
import WorldPage from "./pages/WorldPage";
import CreativityPage from "./pages/CreativityPage";
import VirtualHomePage from "./pages/VirtualHomePage";
import IntellectPage from "./pages/IntellectPage";
import ParentDashboard from "./pages/ParentDashboard";
import GamePage from "./pages/GamePage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";

const queryClient = new QueryClient();

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl">🦊</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/math"
              element={
                <ProtectedRoute>
                  <MathPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alphabet"
              element={
                <ProtectedRoute>
                  <AlphabetPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/world"
              element={
                <ProtectedRoute>
                  <WorldPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creativity"
              element={
                <ProtectedRoute>
                  <CreativityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <VirtualHomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/intellect"
              element={
                <ProtectedRoute>
                  <IntellectPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent"
              element={
                <ProtectedRoute>
                  <ParentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/games/:id"
              element={
                <ProtectedRoute>
                  <GamePage />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
