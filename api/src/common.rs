use crate::error::{AppError, Result};

pub fn env(var: &str) -> String {
    dotenv::var(var).expect(format!("{} is not set in .env file", var).as_str())
}

pub struct ValidatedEmail(pub String);
impl ValidatedEmail {
    pub fn new(email: &str) -> Result<Self> {
        Self::validate(email)
    }
    fn validate(email: &str) -> Result<Self> {
        let (local, domain) = email.split_once('@').ok_or(AppError::GenericError(
            "Email cannot be split into domain & local".into(),
        ))?;

        if !local.is_empty() && domain.eq_ignore_ascii_case("technischools.com") {
            Ok(Self(String::from(email)))
        } else {
            Err(AppError::GenericError("Foreign domain".into()))
        }
    }
}
