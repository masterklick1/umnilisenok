DROP TRIGGER IF EXISTS update_game_sessions_updated_at ON public.game_sessions;
CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON public.game_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();