import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  imageUrl?: string;
  fallback?: string;
}

export const UserAvatar = ({ imageUrl, fallback = "👤" }: UserAvatarProps) => {
  return (
    <Avatar className="w-14 h-14 border-2 border-card shadow-md">
      <AvatarImage src={imageUrl} alt="User" />
      <AvatarFallback className="text-2xl">{fallback}</AvatarFallback>
    </Avatar>
  );
};
