import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AVATARS = ["👦", "👧", "🧒", "👶", "🐱", "🐶", "🦊", "🐰", "🐻", "🐼", "🦁", "🐸"];

interface CreateChildFormProps {
  onSubmit: (name: string, avatar: string) => Promise<void>;
}

export const CreateChildForm = ({ onSubmit }: CreateChildFormProps) => {
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    await onSubmit(name.trim(), selectedAvatar);
    setIsSubmitting(false);
    setName("");
    setSelectedAvatar(AVATARS[0]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Новый аккаунт ребёнка</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="childName">Имя ребёнка</Label>
            <Input
              id="childName"
              placeholder="Введите имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Выберите аватар</Label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`text-3xl p-2 rounded-lg transition-all ${
                    selectedAvatar === avatar
                      ? "bg-primary/20 ring-2 ring-primary scale-110"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? "Создание..." : "Создать аккаунт"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
