import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VirtualHome } from "@/components/virtual-home/VirtualHome";
import { useActivityTracker } from "@/hooks/useActivityTracker";

const VirtualHomePage = () => {
  const navigate = useNavigate();
  useActivityTracker();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-background pb-8">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-2">
          {/* Переходим на главную "/" вместо несуществующего "/app" */}
          <Button variant="ghost" size="sm" onClick={() => navigate("/", { replace: true })}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Назад
          </Button>
          <h1 className="text-lg font-bold">Мой домик</h1>
          <span className="w-16" />
        </div>
        <VirtualHome />
      </div>
    </div>
  );
};

export default VirtualHomePage;
