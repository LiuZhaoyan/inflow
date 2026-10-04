"""Local Korean ASR and Chinese translation. Model downloads are setup-only."""
import json
import math
import os
import re
import sys
import unicodedata
from pathlib import Path
from functools import lru_cache

ROOT = Path(__file__).resolve().parents[1]
ENGLISH_WORD_SEPARATORS = {"'", '’', '-', '‐', '‑'}
os.environ['HF_HUB_OFFLINE'] = '1'


class ProcessingError(ValueError):
    pass


def _models_root():
    return Path(os.environ.get('INFLOW_MODELS_DIR', ROOT / '.models'))


@lru_cache(maxsize=1)
def korean_parser():
    from kiwipiepy import Kiwi
    return Kiwi(num_workers=1)


@lru_cache(maxsize=1)
def english_parser():
    import spacy
    model = _models_root()/'english-parser'/'en_core_web_sm'/'en_core_web_sm-3.8.0'
    if not (model/'config.cfg').is_file():
        raise ProcessingError('英语分析模型尚未安装，请运行 scripts/setup_models.py 后重试。')
    return spacy.load(str(model))


def analyze_vocabulary(data):
    if not isinstance(data, dict) or data.get('language') not in {'ko', 'en'}:
        raise ProcessingError('当前仅支持韩语和英语词形解析。')
    surface, sentence, offset = data.get('surface'), data.get('sentence'), data.get('start')
    if not isinstance(surface, str) or not surface or len(surface) > 100 or any(c.isspace() for c in surface) or '\0' in surface:
        raise ProcessingError('请只选择一个单词（100 字以内）。')
    if not isinstance(sentence, str) or not sentence or len(sentence) > 10000 or '\0' in sentence or type(offset) is not int or offset < 0:
        raise ProcessingError('原句或选中位置无效。')
    # Renderer offsets count UTF-16 units; Kiwi offsets count Unicode characters.
    try:
        start = len(sentence.encode('utf-16-le')[:offset * 2].decode('utf-16-le'))
    except UnicodeError:
        raise ProcessingError('选中位置无效。')
    end = start + len(surface)
    if sentence[start:end] != surface:
        raise ProcessingError('选中文字不属于该位置的原句。')
    if data['language'] == 'en':
        return _analyze_english(surface, sentence, start, end)
    tokens = [t for t in korean_parser().tokenize(sentence) if t.start < end and t.end > start]
    lemma, predicate = '', False
    # ponytail: compound nouns and derivational suffixes only; ambiguous predicates fall back to manual entry.
    for token in tokens:
        tag = token.tag.split('-')[0]
        if token.start < start or token.end > end:
            raise ProcessingError('请选中完整单词，或手动填写词典形。')
        if tag.startswith('N') or tag in {'XR', 'XPN', 'MAG', 'MAJ', 'MM', 'IC', 'SL', 'SH', 'SN'}:
            if predicate:
                raise ProcessingError('无法确定唯一词典形，请手动填写。')
            lemma += token.form
        elif tag in {'VV', 'VA', 'VX', 'VCN'}:
            if lemma:
                raise ProcessingError('无法确定唯一词典形，请手动填写。')
            lemma, predicate = token.form, True
        elif tag in {'XSV', 'XSA'} and lemma and not predicate:
            lemma, predicate = lemma + token.form, True
        elif tag == 'XSN' and lemma and not predicate:
            lemma += token.form
    if not lemma:
        raise ProcessingError('无法确定词典形，请手动填写。')
    return {'surface': surface, 'lemma': lemma + ('다' if predicate else ''), 'language': 'ko'}


def _analyze_english(surface, sentence, start, end):
    if (start, end) not in _english_word_spans(sentence):
        raise ProcessingError('请选中完整英语单词，或手动填写词典形。')

    doc = english_parser()(sentence)
    tokens = [token for token in doc if token.idx < end and token.idx + len(token.text) > start]
    if not tokens:
        raise ProcessingError('无法确定词典形，请手动填写。')
    normalized = surface.replace('’', "'")
    possessives = [token for token in tokens if (token.tag_ == 'POS' or token.dep_ == 'case') and token.head.dep_ == 'poss']
    is_possessive = bool(possessives)
    if is_possessive and normalized.lower().endswith("'s"):
        head = possessives[0].head.head
        if head.dep_ == 'ROOT':
            # Check an ambiguous nominal parse against the copula reading: "mom's home" / "teacher's book".
            expanded = english_parser()(sentence[:end - 2] + ' is' + sentence[end:])
            predicate = next((token for token in expanded if token.idx == head.idx + 1), None)
            # The small pipeline can label locative "home" as a noun even after the copula.
            if predicate is not None and (predicate.pos_ in {'ADJ', 'ADV', 'VERB'} or predicate.lower_ in {'home', 'here', 'there'}):
                is_possessive = False
    if is_possessive:
        if normalized.endswith("'"):
            base = normalized[:-1]
        else:
            base = re.sub(r"['’]s$", '', surface, flags=re.IGNORECASE).replace('’', "'")
        base_tokens = [token for token in tokens if token.idx + len(token.text) <= start + len(base)]
        proper = any(token.pos_ == 'PROPN' or token.ent_type_ for token in base_tokens)
        if proper:
            lemma = base
        elif '-' in base:
            lemma = base.lower()
        else:
            lemma = ''.join(token.lemma_ for token in base_tokens).lower()
    elif any(separator in surface for separator in {'-', '‐', '‑'}):
        lemma = normalized if any(token.pos_ == 'PROPN' or token.ent_type_ for token in tokens) else normalized.lower()
    elif "'" in normalized:
        proper = any(token.pos_ == 'PROPN' or token.ent_type_ for token in tokens)
        if proper:
            lemma = normalized
        elif normalized.lower().startswith("i'"):
            lemma = 'I' + normalized[1:].lower()
        else:
            lemma = normalized.lower()
    elif len(tokens) == 1:
        token = tokens[0]
        lemma = token.text if token.pos_ == 'PROPN' or token.ent_type_ else token.lemma_.lower()
    else:
        lemma = normalized if any(token.pos_ == 'PROPN' or token.ent_type_ for token in tokens) else normalized.lower()
    lemma = lemma.replace('’', "'")
    if not lemma:
        raise ProcessingError('无法确定词典形，请手动填写。')
    return {'surface': surface, 'lemma': lemma, 'language': 'en'}


def _is_english_word_character(character):
    return unicodedata.category(character)[0] in {'L', 'M', 'N'}


def _english_word_spans(text):
    spans, index, quoted = [], 0, False
    while index < len(text):
        if not _is_english_word_character(text[index]):
            if text[index] == '‘':
                quoted = True
            elif text[index] in {"'", '’'}:
                quoted = not quoted
            index += 1
            continue
        start = index
        index += 1
        while index < len(text):
            if _is_english_word_character(text[index]):
                index += 1
            elif text[index] in ENGLISH_WORD_SEPARATORS and index + 1 < len(text) and _is_english_word_character(text[index + 1]):
                index += 1
            else:
                break
        if not quoted and text[index - 1].lower() == 's' and index < len(text) and text[index] in {"'", '’'}:
            index += 1
        spans.append((start, index))
    return spans


def meaning_groups(text, language='ko'):
    if language == 'en':
        document = english_parser()(text)
        boundaries = {0, len(text)}
        clause_dependencies = {'advcl', 'ccomp', 'xcomp', 'relcl', 'acl', 'conj', 'parataxis'}
        subject_dependencies = {'nsubj', 'nsubjpass', 'csubj', 'csubjpass'}
        for sentence in document.sents:
            for token in sentence:
                if token.dep_ in clause_dependencies:
                    subtree = list(token.subtree)
                    if subtree:
                        boundaries.add(min(item.idx for item in subtree))
                        boundaries.add(max(item.idx + len(item.text) for item in subtree))
            for chunk in sentence.noun_chunks:
                if any(token.dep_ in subject_dependencies for token in chunk):
                    boundaries.add(chunk.end_char)
        word_spans = _english_word_spans(text)
        boundaries = {boundary for boundary in boundaries if not any(start < boundary < end for start, end in word_spans)}
        groups, start = [], 0
        for end in sorted(boundaries):
            group = text[start:end].strip()
            if group:
                if re.fullmatch(r'[,;:.!?…]+', group) and groups:
                    groups[-1] += group
                else:
                    groups.append(group)
            start = end
        return groups

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


def sentences(words, language='ko'):
    result, pending = [], []
    text = ''.join(word.word for word in words)
    if language == 'en':
        endings = iter(sentence.end_char for sentence in english_parser()(text).sents)
    else:
        endings = iter(sentence.end for sentence in korean_parser().split_into_sents(text))
    next_ending = next(endings, None)
    position = 0
    def finish():
        if not pending: return
        text = ''.join(w.word for w in pending).strip()
        if text and pending[-1].end > pending[0].start:
            result.append({'start': round(pending[0].start, 3), 'end': round(pending[-1].end, 3), 'text': text, 'groups': meaning_groups(text, language)})
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


def transcribe(filename, language='ko'):
    if language not in {'ko', 'en'}: raise ProcessingError('不支持的媒体语言。')
    import av
    from faster_whisper import WhisperModel
    with av.open(filename) as media:
        if not media.streams.audio: raise ProcessingError('媒体没有音轨，请选择包含语音的音频或视频。')
        duration = media.duration / av.time_base if media.duration else None
        if duration is None or not 0 < duration <= 600: raise ProcessingError('请选择时长可读取、10 分钟以内的媒体。')
    model = WhisperModel(str(_models_root()/'whisper-turbo'), device='cpu', compute_type='int8', cpu_threads=4, local_files_only=True)
    segments, info = model.transcribe(filename, language=language, word_timestamps=True, vad_filter=False, beam_size=5, condition_on_previous_text=False)
    result = sentences([word for segment in segments for word in (segment.words or [])], language)
    if not result:
        label = '英语' if language == 'en' else '韩语'
        raise ProcessingError(f'没有识别到语音，请换一段声音清晰的{label}媒体重试。')
    # Word alignment can overlap by milliseconds; preserve text while making playback ranges monotonic.
    for index, segment in enumerate(result):
        segment['start'] = max(segment['start'], result[index-1]['end'] if index else 0)
        segment['end'] = min(segment['end'], info.duration)
        if segment['end'] <= segment['start']: raise ProcessingError('语音时间边界无法可靠对齐，请更换清晰媒体重试。')
    return {'segments': result}


def translate(text, language='ko'):
    import ctranslate2
    import sentencepiece
    if not isinstance(text,str) or not text.strip() or len(text)>10000: raise ProcessingError('翻译内容为空或过长。')
    if language not in {'ko', 'en'}: raise ProcessingError('不支持的翻译语言。')
    pairs = [('ko','en'),('en','zh')] if language == 'ko' else [('en','zh')]
    for source, target in pairs:
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
        elif sys.argv[1] == 'transcribe': output = transcribe(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'ko')
        elif sys.argv[1] == 'translate':
            request = json.load(sys.stdin)
            output = translate(request.get('text'), request.get('language', 'ko'))
        elif sys.argv[1] == 'lookup': output = analyze_vocabulary(json.load(sys.stdin))
        else: raise ProcessingError('未知的媒体处理操作。')
    except ProcessingError as error:
        output = {'error': str(error)}
    except Exception as error:
        print(type(error).__name__+': '+str(error), file=sys.stderr)
        output = {'error': '本地模型无法处理此媒体或文本，请确认模型安装完整，或换一段清晰的媒体重试。'}
    print(json.dumps(output,ensure_ascii=False))
