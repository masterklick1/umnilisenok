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
import EnglishPage from "./pages/EnglishPage";
import EnglishAlphabetPage from "./pages/EnglishAlphabetPage";
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
import { GameInviteWatcher } from "./components/child/GameInviteWatcher";
import { Capacitor } from "@capacitor/core";

const queryClient = new QueryClient();

const ChildDeviceServices = lazy(async () => {
  try {
    const mod = await import("./components/child/ChildDeviceServices");
    return { default: mod.ChildDeviceServices };
  } catch (e) {
    return { default: () => null };
  }
});

class NativeServicesBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Silent
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function SafeDeviceServices() {
  const { user, loading: authLoading, isDemo } = useAuth();
  const { loading: roleLoading } = useUserRole();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  const isAuthRoute =
    location.pathname.startsWith("/auth") ||
    location.pathname.startsWith("/join") ||
    location.pathname.startsWith("/delete-account");

  const shouldMount = !authLoading && !roleLoading && !!user?.id && !isDemo && !isAuthRoute;

  useEffect(() => {
    if (!shouldMount) {
      setMounted(false);
      return;
    }

    const timer = setTimeout(() => {
      setMounted(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [shouldMount]);

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
          {Capacitor.isNativePlatform() && <SafeDeviceServices />}
          <ChildPlaceStatusBadge />
          <GameInviteWatcher />
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
              path="/english"
              element={
                <ProtectedRoute>
                  <EnglishPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/english/alphabet"
              element={
                <ProtectedRoute>
                  <EnglishAlphabetPage />
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
