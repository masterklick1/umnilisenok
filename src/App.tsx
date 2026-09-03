import { Component, Suspense, lazy, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
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
import JoinPage from "./pages/JoinPage";
import SettingsPage from "./pages/SettingsPage";
import DeleteAccountPage from "./pages/DeleteAccountPage";
import { ChildPlaceStatusBadge } from "./components/child/ChildPlaceStatusBadge";
import { Capacitor } from "@capacitor/core";

const queryClient = new QueryClient();

const ChildDeviceServices = lazy(async () => {
  try {
    const mod = await import("./components/child/ChildDeviceServices");
    return { default: mod.ChildDeviceServices };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[ChildDeviceServices] Failed to load:", e);
    return { default: () => null };
  }
});

class NativeServicesBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[NativeServicesBoundary] Error caught:", error);
    // eslint-disable-next-line no-console
    console.error("[NativeServicesBoundary] Stack:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // Silent fail — don't crash the entire app
      return null;
    }
    return this.props.children;
  }
}

/**
 * Conditional wrapper: только ребенок на защищённом маршруте может запустить нативные сервисы.
 * НЕ запускаем на:
 * - /auth, /join, /delete-account (публичные маршруты)
 * - родительском аккаунте
 * - лукат дата еще загружается
 */
function SafeChildDeviceServices() {
  const { user, loading: authLoading, isDemo } = useAuth();
  const { isChild, loading: roleLoading } = useUserRole();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  // Проверяем все условия для монтирования
  const isAuthRoute = location.pathname.startsWith("/auth") || 
                     location.pathname.startsWith("/join") || 
                     location.pathname.startsWith("/delete-account");
  
  const shouldMount = !authLoading && !roleLoading && !!user?.id && !isDemo && isChild && !isAuthRoute;

  useEffect(() => {
    // Если условия больше не выполняются, размонтируем
    if (!shouldMount) {
      setMounted(false);
      return;
    }

    // Даем WebView/Capacitor extra время для инициализации
    const timer = setTimeout(() => {
      setMounted(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [shouldMount]);

  // Не монтируем, если не полностью готово
  if (!shouldMount || !mounted) {
    return null;
  }

  return (
    <NativeServicesBoundary>
      <Suspense fallback={null}>
        <ChildDeviceServices />
      </Suspense>
    </NativeServicesBoundary>
  );
}

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

const ParentOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl">🦊</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role === "child") {
    return <Navigate to="/" replace />;
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
          {/* Монтируем детские нативные сервисы ТОЛЬКО для аутентифицированного ребенка на защищенных маршрутах */}
          {Capacitor.isNativePlatform() && <SafeChildDeviceServices />}
          <ChildPlaceStatusBadge />
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/delete-account" element={<DeleteAccountPage />} />
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
                <ParentOnlyRoute>
                  <ParentDashboard />
                </ParentOnlyRoute>
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
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
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
