from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_url: str
    google_client_id: str = ""
    claude_api_key: str = ""
    server_base_url: str = "http://localhost:8000"
    ai_module_path: str = "../ai"
    bypass_auth: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
