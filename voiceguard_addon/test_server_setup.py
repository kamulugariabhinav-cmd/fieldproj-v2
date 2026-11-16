"""Server setup must fail before downloads when its model runtime is absent."""
import pytest
from voiceguard_addon import prepare_server, worker_client


def test_setup_rejects_missing_runtime_before_creating_model_files(tmp_path, monkeypatch):
    monkeypatch.setattr(worker_client, 'runtime_ready', lambda: False)
    monkeypatch.setattr(prepare_server, 'ROOT', tmp_path)
    with pytest.raises(RuntimeError, match='isolated CPU runtime'):
        prepare_server.main()
    assert not list(tmp_path.iterdir())
