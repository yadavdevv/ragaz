from ragaz.watchdog import MemoryWatchdog


def test_trips_on_tiny_cap():
    import mlx.core as mx

    x = mx.ones((1024, 1024))
    mx.eval(x)
    assert "above" in MemoryWatchdog(max_gb=1e-6, min_free_gb=0).check()


def test_quiet_when_memory_is_fine():
    assert MemoryWatchdog(max_gb=1000, min_free_gb=0, max_swap_growth_gb=1000).check() is None


def test_governor_scales_down_then_pauses_until_memory_returns(monkeypatch):
    from ragaz import watchdog

    gb = 2**30
    readings = iter([6 * gb, 4.5 * gb, 3 * gb, 3.5 * gb, 5.5 * gb, 5.5 * gb])
    monkeypatch.setattr(watchdog.ResourceGovernor, "free", staticmethod(lambda: next(readings)))
    monkeypatch.setattr(watchdog.time, "sleep", lambda s: None)
    g = watchdog.ResourceGovernor(full_gb=5, pause_gb=4, check_s=0)
    logs = []
    assert g.before_step(logs.append) == 1.0  # 6 GB free: full speed
    assert g.before_step(logs.append) == 0.5  # 4.5 GB: half batches
    assert g.before_step(logs.append) == 1.0  # 3 GB: pauses, waits through 3.5, resumes at 5.5
    assert any("pausing" in m for m in logs) and any("resuming" in m for m in logs)
