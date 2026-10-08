(() => {
  if (window.__inflowAcceptance) return;

  const sampleRate = 8000;
  const sampleCount = sampleRate * 8;
  const wav = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(wav);
  const writeText = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  writeText(0, 'RIFF'); view.setUint32(4, wav.byteLength - 8, true); writeText(8, 'WAVE');
  writeText(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeText(36, 'data'); view.setUint32(40, sampleCount * 2, true);
  const wavBlob = new Blob([wav], { type: 'audio/wav' });
  const wavUrls = new Map();

  const sentenceData = [
    { start: 0.25, end: 2, text: '오늘 날씨가 좋아요.', groups: ['오늘 날씨가', '좋아요.'] },
    { start: 2.5, end: 5, text: '저는 도서관에서 공부해요.', groups: ['저는 도서관에서', '공부해요.'] },
    { start: 5.5, end: 7.5, text: '친구와 함께 한국어를 배워요.', groups: ['친구와 함께', '한국어를 배워요.'] },
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  const withIds = id => sentenceData.map((segment, index) => ({ ...segment, id: `${id}-sentence-${index + 1}` }));
  const makeMedia = (id, name, { missing = false, duration = 8, mode = 'full', position = 0, index = 0, rate = 1, loop = false } = {}, segments = []) => ({
    id, name, video: false, missing, segments: clone(segments),
    learning: { duration, position, index, rate, loop, mode },
  });
  const records = new Map([
    ['completed', makeMedia('completed', 'completed.wav', { position: 3, index: 1, mode: 'sentence', rate: 1.25 }, withIds('completed'))],
    ['missing', makeMedia('missing', 'missing.wav', { missing: true }, withIds('missing'))],
    ['overlong', makeMedia('overlong', 'overlong.wav', { duration: 601, position: 7, index: 2 }, withIds('overlong'))],
  ]);
  const vocabulary = [];
  const settings = { videoMaskColor: '#000000' };
  const pending = [];
  const stats = {
    importCalls: 0, transcribeCalls: 0, transcribeJobs: [], saveLearningCalls: 0,
    latestLearning: {}, translateCalls: 0, cancelCalls: [], openCalls: [],
    mediaSourceAssignments: [], invalidMediaAssignments: 0,
  };

  function mediaUrl(value) {
    const text = String(value ?? '');
    if (!text.startsWith('inflow://app/media/')) return text;
    stats.mediaSourceAssignments.push(text);
    const id = decodeURIComponent(new URL(text).pathname.slice('/media/'.length));
    const media = records.get(id);
    if (!media || media.missing || media.learning.duration > 600) {
      stats.invalidMediaAssignments++;
      return '';
    }
    if (!wavUrls.has(id)) wavUrls.set(id, URL.createObjectURL(wavBlob));
    return wavUrls.get(id);
  }

  const source = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  if (source?.configurable && source.set && source.get) {
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
      configurable: true, enumerable: source.enumerable,
      get() { return source.get.call(this); },
      set(value) { source.set.call(this, mediaUrl(value)); },
    });
  }
  const setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    return setAttribute.call(this, name, this instanceof HTMLMediaElement && name.toLowerCase() === 'src' ? mediaUrl(value) : value);
  };

  const bridge = {
    async list() { return [...records.values()].map(clone); },
    async restore() { return null; },
    async open(id) { stats.openCalls.push(id); return clone(records.get(id)); },
    async importMedia() {
      stats.importCalls++;
      const media = makeMedia('acceptance', 'acceptance.wav');
      records.set(media.id, media);
      return clone(media);
    },
    async relink(id) { const media = records.get(id); media.missing = false; return clone(media); },
    transcribe(id, job) {
      stats.transcribeCalls++;
      stats.transcribeJobs.push({ id, job });
      return new Promise((resolve, reject) => pending.push({ id, job, resolve, reject }));
    },
    async translate() { stats.translateCalls++; return '这是一句中文译文。'; },
    async cancel(job) {
      stats.cancelCalls.push(job);
      const index = pending.findIndex(item => item.job === job);
      if (index >= 0) pending.splice(index, 1)[0].reject(new Error('fixture canceled'));
    },
    async saveLearning(id, state) {
      const media = records.get(id);
      media.learning = { ...media.learning, ...state };
      stats.saveLearningCalls++;
      stats.latestLearning[id] = clone(media.learning);
    },
    async listVocabulary() { return vocabulary.map(clone); },
    async saveVocabulary(input) {
      const media = [...records.values()].find(item => item.segments.some(segment => segment.id === input.source?.segmentId));
      const segment = media?.segments.find(item => item.id === input.source?.segmentId);
      const entry = {
        id: input.id || `vocabulary-${vocabulary.length + 1}`,
        lemma: input.lemma, meaningZh: input.meaningZh, selected: false,
        sources: segment && media ? [{
          id: `source-${vocabulary.length + 1}`, segmentId: segment.id, mediaId: media.id,
          mediaName: media.name, surface: input.source.surface, sentence: segment.text, start: segment.start,
        }] : [],
      };
      vocabulary.push(entry);
      return clone(entry);
    },
    async selectVocabulary(ids) {
      for (const entry of vocabulary) entry.selected = ids.includes(entry.id);
      return vocabulary.map(clone);
    },
    async credentialStatus() { return { configured: false }; },
    async configureCredential() { return { configured: false }; },
    async getSettings() { return clone(settings); },
    async saveSettings(input) { Object.assign(settings, input); return clone(settings); },
    async generateArtifact() { throw new Error('Story controls should not be present in this workspace.'); },
    async listArtifacts() { return []; },
    async restoreArtifact() { return null; },
    async openArtifact() { throw new Error('Story controls should not be present in this workspace.'); },
  };

  window.inflow = bridge;
  window.__inflowAcceptance = {
    stats,
    pendingCount: () => pending.length,
    media: id => clone(records.get(id)),
    resolveNextTranscribe(success = true) {
      const job = pending.shift();
      if (!job) throw new Error('No pending transcription job.');
      if (!success) { job.reject(new Error('fixture transcription failure')); return; }
      const media = records.get(job.id);
      media.segments = withIds(job.id);
      job.resolve(clone(media));
    },
  };
})();
