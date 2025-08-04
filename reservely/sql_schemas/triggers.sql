CREATE TRIGGER on_restaurants_update
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
