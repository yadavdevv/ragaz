"""Hard memory guard so a runaway job can't freeze the laptop.

MLX's ``set_memory_limit`` is a soft target: a large enough computation goes
past it (a Qwen3.5 training step reached 34 GB on a 24 GB Mac and pushed 54 GB
into swap). This watchdog runs in a background thread, so it still fires while
the main thread is stuck inside one long GPU evaluation, and kills the process
when any of these trips:

  - MLX memory (active + cache) above ``max_gb``
  - system free memory below ``min_free_gb``
  - swap use grew by more than ``max_swap_growth_gb`` within the last ``swap_window_s``
    (a *rate*: cumulative growth since start also counts everything the browser and other
    apps do over a long run, and stopped v5c at step ~55 while training itself sat at 3 GB)

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
        swap_window_s: float = 300.0,
    ):
        self.max_bytes = max_gb * 2**30
        self.min_free_bytes = min_free_gb * 2**30
        self.max_swap_growth = max_swap_growth_gb * 2**30
        self.interval = interval
        self.marker = marker
        self.swap_window_s = swap_window_s
        self.swap_history: list[tuple[float, int]] = [(time.time(), psutil.swap_memory().used)]
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
        now, swap = time.time(), psutil.swap_memory().used
        self.swap_history.append((now, swap))
        self.swap_history = [(t, u) for t, u in self.swap_history if now - t <= self.swap_window_s]
        swap_growth = swap - min(u for _, u in self.swap_history)
        if swap_growth > self.max_swap_growth:
            return f"swap grew by {swap_growth / 2**30:.1f} GB in the last {self.swap_window_s / 60:.0f} min"
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


class ResourceGovernor:
    """Soft, resource-aware pacing for training (the watchdog is the hard last resort).

    Called before every step:
      free ≥ full_gb            → run at full batch sizes
      pause_gb ≤ free < full_gb → run at reduced batch sizes (``scale`` < 1)
      free < pause_gb           → pause: drop MLX's buffer cache and wait until free ≥ full_gb

    The Mac is shared with a browser, an IDE and sometimes Docker; this lets a run slow
    down or wait instead of being killed (v5 SFT was stopped at 2.9 GB free).
    """

    def __init__(self, full_gb: float = 5.0, pause_gb: float = 4.0, reduced_scale: float = 0.5, check_s: float = 10.0):
        self.full = full_gb * 2**30
        self.pause = pause_gb * 2**30
        self.reduced_scale = reduced_scale
        self.check_s = check_s
        self.paused_s = 0.0
        self.scale = 1.0

    @staticmethod
    def free() -> int:
        return psutil.virtual_memory().available

    def before_step(self, log=print) -> float:
        """Blocks while memory is low; returns the batch scale to use for this step."""
        free = self.free()
        if free < self.pause:
            mx.clear_cache()
            log(f"[governor] pausing: {free / 2**30:.1f} GB free < {self.pause / 2**30:.1f} GB; waiting for {self.full / 2**30:.1f} GB")
            start = time.time()
            while (free := self.free()) < self.full:
                time.sleep(self.check_s)
            waited = time.time() - start
            self.paused_s += waited
            log(f"[governor] resuming after {waited:.0f}s ({free / 2**30:.1f} GB free)")
        self.scale = 1.0 if free >= self.full else self.reduced_scale
        return self.scale
