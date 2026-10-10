from ragaz.watchdog import MemoryWatchdog


def test_trips_on_tiny_cap():
    import mlx.core as mx

    x = mx.ones((1024, 1024))
    mx.eval(x)
    assert "above" in MemoryWatchdog(max_gb=1e-6, min_free_gb=0).check()


def test_quiet_when_memory_is_fine():
    assert MemoryWatchdog(max_gb=1000, min_free_gb=0, max_swap_growth_gb=1000).check() is None
