from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Optional
import threading
import time
import uuid


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


@dataclass
class Job:
    job_id: str
    status: JobStatus
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)


class JobManager:
    def __init__(self, max_workers: int = 4, ttl_seconds: int = 3600):
        self._jobs: Dict[str, Job] = {}
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._ttl = ttl_seconds

    def create_job(self) -> str:
        job_id = uuid.uuid4().hex[:12]
        with self._lock:
            self._jobs[job_id] = Job(job_id=job_id, status=JobStatus.PENDING)
        return job_id

    def submit(self, job_id: str, fn, *args, **kwargs) -> None:
        def _run():
            self._set_status(job_id, JobStatus.PROCESSING)
            try:
                result = fn(*args, **kwargs)
                with self._lock:
                    job = self._jobs[job_id]
                    job.status = JobStatus.DONE
                    job.result = result
                    job.updated_at = time.time()
            except Exception as exc:
                with self._lock:
                    job = self._jobs[job_id]
                    job.status = JobStatus.FAILED
                    job.error = str(exc)
                    job.updated_at = time.time()

        self._executor.submit(_run)

    def get(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def cleanup(self) -> int:
        now = time.time()
        with self._lock:
            expired = [
                jid
                for jid, j in self._jobs.items()
                if j.status in (JobStatus.DONE, JobStatus.FAILED)
                and now - j.updated_at > self._ttl
            ]
            for jid in expired:
                del self._jobs[jid]
        return len(expired)

    def _set_status(self, job_id: str, status: JobStatus) -> None:
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].status = status
                self._jobs[job_id].updated_at = time.time()

    def shutdown(self) -> None:
        self._executor.shutdown(wait=False)
