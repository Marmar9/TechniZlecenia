
pub fn env(var: &str) -> String {
    dotenv::var(var).expect(format!("{} is not set in .env file", var).as_str())
}
