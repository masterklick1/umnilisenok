interface UserWelcomeProps {
  name?: string;
}

export const UserWelcome = ({ name }: UserWelcomeProps) => {
  return (
    <div className="flex items-center justify-center p-4 bg-card rounded-3xl shadow-lg">
      <div className="text-center">
        <div className="font-bold text-xl text-foreground">
          {name ? `Привет, ${name}! Давай играть! 🦊` : "Привет! Давай играть! 🦊"}
        </div>
      </div>
    </div>
  );
};
