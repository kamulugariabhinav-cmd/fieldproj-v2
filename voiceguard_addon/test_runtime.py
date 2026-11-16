from voiceguard_addon import worker_client


def test_runtime_selection_and_marker_follow_the_selected_python(tmp_path, monkeypatch):
    monkeypatch.delenv('VOICEGUARD_INFERENCE_PYTHON', raising=False)
    monkeypatch.setattr(worker_client, 'ROOT', tmp_path / 'addon')
    local = tmp_path / '.runtime-py311' / 'Scripts' / 'python.exe'
    local.parent.mkdir(parents=True)
    local.touch()
    assert worker_client.inference_python() == local
    assert not worker_client.runtime_ready()
    (local.parent.parent / 'ready.json').write_text('{}')
    assert worker_client.runtime_ready()
    configured = tmp_path / 'custom' / 'Scripts' / 'python.exe'
    monkeypatch.setenv('VOICEGUARD_INFERENCE_PYTHON', str(configured))
    assert worker_client.inference_python() == configured
    assert not worker_client.runtime_ready(), 'A different runtime must not inherit the old ready marker'


def test_legacy_runtime_remains_a_fallback(tmp_path, monkeypatch):
    monkeypatch.delenv('VOICEGUARD_INFERENCE_PYTHON', raising=False)
    monkeypatch.setattr(worker_client, 'ROOT', tmp_path / 'addon')
    assert worker_client.inference_python() == tmp_path / 'addon/.inference-env/Scripts/python.exe'
