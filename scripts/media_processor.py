"""Local Korean ASR and Chinese translation. Model downloads are setup-only."""
import json
import math
import os
import sys
from pathlib import Path
from functools import lru_cache

ROOT = Path(__file__).resolve().parents[1]
os.environ['HF_HUB_OFFLINE'] = '1'


class ProcessingError(ValueError):
    pass


def _models_root():
    return Path(os.environ.get('INFLOW_MODELS_DIR', ROOT / '.models'))


@lru_cache(maxsize=1)
def korean_parser():
    from kiwipiepy import Kiwi
    return Kiwi(num_workers=1)


def meaning_groups(text):
    # ponytail: grammatical phrase boundaries, not semantic understanding; a reviewed semantic model is needed for idioms and ambiguous clauses.
    boundaries = {len(text)}
    for token in korean_parser().tokenize(text):
        end = token.end
        if end < len(text) and not text[end].isspace(): continue
        if token.tag in {'JKS','JKO','JKB','JX'} or token.form in {',','，',';', '；', ':'}:
            boundaries.add(end)
    groups, start = [], 0
    for end in sorted(boundaries):
        group = text[start:end].strip()
        if group: groups.append(group)
        start = end
    return groups


def sentences(words):
    result, pending = [], []
    endings = iter(sentence.end for sentence in korean_parser().split_into_sents(''.join(word.word for word in words)))
    next_ending = next(endings, None)
    position = 0
    def finish():
        if not pending: return
        text = ''.join(w.word for w in pending).strip()
        if text and pending[-1].end > pending[0].start:
            result.append({'start': round(pending[0].start, 3), 'end': round(pending[-1].end, 3), 'text': text, 'groups': meaning_groups(text)})
        pending.clear()
    for word in words:
        position += len(word.word)
        if not word.word.strip(): continue
        pending.append(word)
        # ponytail: sentence ends snap to whole ASR words; splitting inside one word needs finer alignment.
        if next_ending is not None and position >= next_ending:
            finish()
            while next_ending is not None and position >= next_ending:
                next_ending = next(endings, None)
    finish()
    return result


def probe(filename):
    import av
    with av.open(filename) as media:
        duration = media.duration / av.time_base if media.duration is not None else None
    if duration is None or not math.isfinite(duration) or duration <= 0:
        raise ProcessingError('无法读取媒体时长，请重试。')
    return {'duration': duration}


def transcribe(filename):
    import av
    from faster_whisper import WhisperModel
    with av.open(filename) as media:
        if not media.streams.audio: raise ProcessingError('媒体没有音轨，请选择包含语音的音频或视频。')
        duration = media.duration / av.time_base if media.duration else None
        if duration is None or not 0 < duration <= 600: raise ProcessingError('请选择时长可读取、10 分钟以内的媒体。')
    model = WhisperModel(str(_models_root()/'whisper-turbo'), device='cpu', compute_type='int8', cpu_threads=4, local_files_only=True)
    segments, info = model.transcribe(filename, language='ko', word_timestamps=True, vad_filter=True, beam_size=5, condition_on_previous_text=False)
    result = sentences([word for segment in segments for word in (segment.words or [])])
    if not result: raise ProcessingError('没有识别到语音，请换一段声音清晰的韩语媒体重试。')
    # Word alignment can overlap by milliseconds; preserve text while making playback ranges monotonic.
    for index, segment in enumerate(result):
        segment['start'] = max(segment['start'], result[index-1]['end'] if index else 0)
        segment['end'] = min(segment['end'], info.duration)
        if segment['end'] <= segment['start']: raise ProcessingError('语音时间边界无法可靠对齐，请更换清晰媒体重试。')
    return {'segments': result}


def translate(text):
    import ctranslate2
    import sentencepiece
    if not isinstance(text,str) or not text.strip() or len(text)>10000: raise ProcessingError('翻译内容为空或过长。')
    for source, target in [('ko','en'),('en','zh')]:
        folder = None
        for metadata in _models_root().glob('*/metadata.json'):
            data = json.loads(metadata.read_text())
            if data.get('from_code') == source and data.get('to_code') == target:
                folder = metadata.parent
                break
        if folder is None: raise ProcessingError('翻译模型尚未安装，请运行模型安装脚本后重试。')
        tokenizer = sentencepiece.SentencePieceProcessor(model_file=str(folder/'sentencepiece.model'))
        model = ctranslate2.Translator(str(folder/'model'), device='cpu', compute_type='int8', inter_threads=1, intra_threads=4)
        tokens = tokenizer.encode(text, out_type=str)
        translated = model.translate_batch([tokens], beam_size=4, max_decoding_length=512)[0].hypotheses[0]
        text = tokenizer.decode(translated).replace("▁", " ").strip()
        del model
    if not text.strip(): raise ProcessingError('未生成译文，请重试。')
    return {'translation': text}


if __name__ == '__main__':
    try:
        if sys.argv[1] == 'probe': output = probe(sys.argv[2])
        elif sys.argv[1] == 'transcribe': output = transcribe(sys.argv[2])
        elif sys.argv[1] == 'translate': output = translate(json.load(sys.stdin).get('text'))
        else: raise ProcessingError('未知的媒体处理操作。')
    except ProcessingError as error:
        output = {'error': str(error)}
    except Exception as error:
        print(type(error).__name__+': '+str(error), file=sys.stderr)
        output = {'error': '本地模型无法处理此媒体或文本，请确认模型安装完整，或换一段清晰的韩语媒体重试。'}
    print(json.dumps(output,ensure_ascii=False))
