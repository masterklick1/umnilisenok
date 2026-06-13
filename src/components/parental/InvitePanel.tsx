import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Copy, QrCode, Share2, Trash2, RefreshCw } from "lucide-react";
import { joinInviteUrl } from "@/lib/app-url";

interface Invite {
  id: string;
  code: string;
  child_first_name: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

const generateCode = () => {
  // 6 символов, без похожих 0/O, 1/I
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

export function InvitePanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [childName, setChildName] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeInvite, setActiveInvite] = useState<Invite | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("child_invites")
      .select("*")
      .eq("parent_id", user.id)
      .order("created_at", { ascending: false });
    setInvites((data as Invite[]) || []);
  };

  useEffect(() => { load(); }, [user]);

  const create = async () => {
    if (!user || !childName.trim()) return;
    setCreating(true);
    const code = generateCode();
    const { data, error } = await supabase
      .from("child_invites")
      .insert({ parent_id: user.id, child_first_name: childName.trim(), code })
      .select()
      .single();
    setCreating(false);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      return;
    }
    setChildName("");
    setActiveInvite(data as Invite);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("child_invites").delete().eq("id", id);
    if (activeInvite?.id === id) setActiveInvite(null);
    load();
  };

  const joinUrl = (code: string) => joinInviteUrl(code);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} скопирован`, duration: 1500 });
  };

  const share = async (inv: Invite) => {
    const url = joinUrl(inv.code);
    const text = `Открой ссылку на телефоне ${inv.child_first_name} и зарегистрируй детский аккаунт: ${url}\n\nИли введи код вручную: ${inv.code}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Привязка устройства", text, url }); } catch { /* user cancelled */ }
    } else {
      copy(text, "Сообщение");
    }
  };

  const isExpired = (inv: Invite) => new Date(inv.expires_at) < new Date();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Привязать телефон ребёнка</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="childName">Имя ребёнка</Label>
            <div className="flex gap-2">
              <Input
                id="childName"
                placeholder="Например, Маша"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
              />
              <Button onClick={create} disabled={creating || !childName.trim()}>
                Создать код
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            На телефоне ребёнка отсканируй QR или открой ссылку (не localhost!). Ссылка ведёт на опубликованное приложение.
          </p>
        </CardContent>
      </Card>

      {activeInvite && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Приглашение для {activeInvite.child_first_name}</span>
              <Button variant="ghost" size="icon" onClick={() => setActiveInvite(null)}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center bg-white p-4 rounded-lg">
              <QRCodeSVG value={joinUrl(activeInvite.code)} size={200} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Код</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-3xl font-mono font-bold tracking-widest text-center bg-muted py-3 rounded">
                  {activeInvite.code}
                </div>
                <Button variant="outline" size="icon" onClick={() => copy(activeInvite.code, "Код")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Ссылка</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-xs bg-muted py-2 px-3 rounded truncate">
                  {joinUrl(activeInvite.code)}
                </div>
                <Button variant="outline" size="icon" onClick={() => copy(joinUrl(activeInvite.code), "Ссылка")}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => share(activeInvite)}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Действует 24 часа · Одноразовый
            </p>
          </CardContent>
        </Card>
      )}

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">История приглашений</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-2 p-2 rounded border">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{inv.child_first_name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{inv.code}</div>
                </div>
                <div>
                  {inv.used_at ? (
                    <Badge variant="secondary">Использован</Badge>
                  ) : isExpired(inv) ? (
                    <Badge variant="outline">Истёк</Badge>
                  ) : (
                    <Badge>Активен</Badge>
                  )}
                </div>
                {!inv.used_at && !isExpired(inv) && (
                  <Button variant="ghost" size="icon" onClick={() => setActiveInvite(inv)}>
                    <QrCode className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => remove(inv.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
