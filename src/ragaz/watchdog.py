"""Hard memory guard so a runaway job can't freeze the laptop.

MLX's ``set_memory_limit`` is a soft target: a large enough computation goes
past it (a Qwen3.5 training step reached 34 GB on a 24 GB Mac and pushed 54 GB
into swap). This watchdog runs in a background thread, so it still fires while
the main thread is stuck inside one long GPU evaluation, and kills the process
when any of these trips:

  - MLX memory (active + cache) above ``max_gb``
  - system free memory below ``min_free_gb``
  - swap use grew by more than ``max_swap_growth_gb`` since start

Killing is abrupt on purpose: by the time memory runs away there is no safe
point to save from. Checkpoints written every ``save_every`` steps cover that.
"""

import os
import sys
import threading
import time
from pathlib import Path

import mlx.core as mx
import psutil


class MemoryWatchdog:
    def __init__(
        self,
        max_gb: float,
        min_free_gb: float = 3.0,
        max_swap_growth_gb: float = 4.0,
        interval: float = 1.0,
        marker: Path | None = None,
    ):
        self.max_bytes = max_gb * 2**30
        self.min_free_bytes = min_free_gb * 2**30
        self.max_swap_growth = max_swap_growth_gb * 2**30
        self.interval = interval
        self.marker = marker
        self.swap_start = psutil.swap_memory().used
        self.peak_mlx = 0.0
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, name="memory-watchdog", daemon=True)

    def start(self) -> "MemoryWatchdog":
        self._thread.start()
        return self

    def stop(self) -> None:
        self._stop.set()

    def check(self) -> str | None:
        """The reason to kill the process, or None if memory is fine."""
        mlx_bytes = mx.get_active_memory() + mx.get_cache_memory()
        self.peak_mlx = max(self.peak_mlx, mlx_bytes)
        if mlx_bytes > self.max_bytes:
            return f"MLX memory {mlx_bytes / 2**30:.1f} GB is above the {self.max_bytes / 2**30:.1f} GB cap"
        free = psutil.virtual_memory().available
        if free < self.min_free_bytes:
            return f"system free memory {free / 2**30:.1f} GB is below {self.min_free_bytes / 2**30:.1f} GB"
        swap_growth = psutil.swap_memory().used - self.swap_start
        if swap_growth > self.max_swap_growth:
            return f"swap grew by {swap_growth / 2**30:.1f} GB"
        return None

    def _run(self) -> None:
        while not self._stop.wait(self.interval):
            reason = self.check()
            if reason:
                message = f"\n[watchdog] stopping to protect the machine: {reason}\n"
                sys.stderr.write(message)
                sys.stderr.flush()
                if self.marker:
                    self.marker.write_text(f"{time.ctime()}: {reason}\n")
                os._exit(3)
