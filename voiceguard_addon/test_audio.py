import io
from unittest.mock import patch

import numpy as np
import pytest
import soundfile as sf

from backend import audio_processor as audio


def recording(subtype='PCM_16', stereo=False, seconds=1):
    signal = np.sin(np.arange(16000 * seconds) * 2 * np.pi * 220 / 16000).astype(np.float32) * .3
    data = np.column_stack([signal, np.zeros_like(signal)]) if stereo else signal
    buffer = io.BytesIO()
    sf.write(buffer, data, 16000, format='WAV', subtype=subtype)
    return buffer.getvalue()


@pytest.mark.parametrize('subtype', ['PCM_16', 'PCM_32', 'FLOAT'])
def test_fallback_matches_soundfile_normalization(subtype):
    content = recording(subtype)
    expected, _, _, _ = audio.decode_audio_bytes(content)
    with patch.object(audio.sf, 'SoundFile', side_effect=RuntimeError('Use fallback')):
        actual, rate, duration, _ = audio.decode_audio_bytes(content)
    np.testing.assert_allclose(actual, expected, atol=1e-6)
    assert rate == 16000 and duration == 1


def test_fallback_handles_packed_stereo_without_doubling_duration():
    content = recording(stereo=True)
    with patch.object(audio.sf, 'SoundFile', side_effect=RuntimeError('Use fallback')):
        waveform, rate, duration, stats = audio.decode_audio_bytes(content)
    assert len(waveform) == 16000 and duration == 1 and rate == 16000
    assert stats['original_channels'] == 2


def test_duration_limit_applies_before_full_decode(monkeypatch):
    content = recording(seconds=2)
    monkeypatch.setattr(audio, 'MAX_DURATION_SECONDS', 1)
    with patch.object(audio.av, 'open') as fallback:
        with pytest.raises(audio.AudioProcessingError, match='maximum allowed') as caught:
            audio.decode_audio_bytes(content)
        assert caught.value.code == 'AUDIO_TOO_LONG'
        fallback.assert_not_called()
    with patch.object(audio.sf, 'SoundFile', side_effect=RuntimeError('Use fallback')):
        with pytest.raises(audio.AudioProcessingError) as caught:
            audio.decode_audio_bytes(content)
        assert caught.value.code == 'AUDIO_TOO_LONG'


def test_nan_audio_cannot_bypass_silence_validation():
    buffer = io.BytesIO()
    sf.write(buffer, np.full(16000, np.nan, dtype=np.float32), 16000, format='WAV', subtype='FLOAT')
    with pytest.raises(audio.AudioProcessingError) as caught:
        audio.decode_audio_bytes(buffer.getvalue())
    assert caught.value.code == 'SILENT_AUDIO'
