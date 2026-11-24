import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { call } from "@/components/ManualPaymentCard";

export function useManualPaymentStatus() {
  const { user, isDemo } = useAuth();
  return useQuery({
    queryKey: ["manual-payment-status", user?.id],
    enabled: Boolean(user && !isDemo),
    queryFn: () => call("status"),
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}