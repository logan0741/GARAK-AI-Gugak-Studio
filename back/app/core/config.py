import warnings
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_url: str
    google_client_id: str = ""
    claude_api_key: str = ""
    server_base_url: str = "http://localhost:8000"
    ai_module_path: str = "../ai"
    bypass_auth: bool = False
    jwt_secret_key: str = "dev-secret-key"
    jwt_expire_minutes: int = 60
    jwt_refresh_expire_days: int = 30

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @model_validator(mode="after")
    def warn_insecure_defaults(self) -> "Settings":
        if not self.bypass_auth:
            if self.jwt_secret_key == "dev-secret-key":
                warnings.warn(
                    "JWT_SECRET_KEY is using the default dev value. "
                    "Set a strong secret in .env before deploying.",
                    UserWarning,
                    stacklevel=2,
                )
            if not self.google_client_id:
                warnings.warn(
                    "GOOGLE_CLIENT_ID is not set. "
                    "Google authentication will fail unless BYPASS_AUTH=true.",
                    UserWarning,
                    stacklevel=2,
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
