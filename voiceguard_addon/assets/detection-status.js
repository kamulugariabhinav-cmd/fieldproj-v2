let detectionRequests = 0;
async function fetchDetection(...args) {
  const indicator = document.querySelector('.live-pill');
  detectionRequests++;
  indicator?.classList.add('is-detecting');
  indicator?.setAttribute('aria-label', 'Audio analysis in progress');
  try {
    return await fetch(...args);
  } finally {
    detectionRequests--;
    if (!detectionRequests) {
      indicator?.classList.remove('is-detecting');
      indicator?.setAttribute('aria-label', 'VoiceGuard ready');
    }
  }
}
