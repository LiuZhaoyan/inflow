"""Download local model data only; never upload media. Run once before starting Inflow."""
import argparse
import hashlib
import json
import os
import urllib.request
import zipfile
from pathlib import Path
from huggingface_hub import hf_hub_download, snapshot_download

DEFAULT_ROOT = Path(__file__).resolve().parents[1] / '.models'
# Fixed public mirror revisions: official Argos download endpoints returned HTTP 403 during validation.
PACKAGES = [
    ('ko_en-1_1', 'ko_en', '15d756c2e589f5c4c0272a7666b4cf2a1308d5c8', '6da8f3db6ca40f42b1875570a1c06856f6e17c7ef62845d85de217ba548c1471'),
    ('en_zh-1_9', 'translate-en_zh-1_9', 'c57c8db597a5607fc23f21af7c9449d2cc7cc332', '433e7c4f034d87fbe2353161e05f18646d7999452f801a4e1f0378522b9850ab'),
]
ENGLISH_PIPELINE_URL = 'https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl'
ENGLISH_PIPELINE_SHA256 = '1932429db727d4bff3deed6b34cfc05df17794f4a52eeb26cf8928f7c1a0fb85'
INCOMPLETE = '.inflow-incomplete'
# shortcut: size checks miss same-size corruption; add digests if stronger checks are needed.
WHISPER_MODEL_BYTES = 1617884929
WHISPER_VOCABULARY_BYTES = 1068114
WHISPER_VOCABULARY_TOKENS = 51866
# Pinned translation package file sizes in unpacked bytes.
TRANSLATION_PACKAGE_BYTES = {
    ('ko_en', 'ko', 'en', '1.1'): {
        'model/model.bin': 132573333, 'sentencepiece.model': 775609, 'model/shared_vocabulary.txt': 395408,
    },
    ('translate-en_zh-1_9', 'en', 'zh', '1.9'): {
        'model/model.bin': 82713318, 'sentencepiece.model': 806370, 'model/shared_vocabulary.json': 1367577,
    },
}
WHISPER_FILES = ['config.json', 'model.bin', 'tokenizer.json', 'preprocessor_config.json']
ENGLISH_FILES = {
    'config.cfg': 5527, 'meta.json': 10106, 'tokenizer': 77066, 'attribute_ruler/patterns': 14735,
    'lemmatizer/lookups/lookups.bin': 972893, 'ner/cfg': 221, 'ner/model': 6154601, 'ner/moves': 1064,
    'parser/cfg': 222, 'parser/model': 319909, 'parser/moves': 1571, 'senter/cfg': 23, 'senter/model': 197089,
    'tagger/cfg': 615, 'tagger/model': 19829, 'tok2vec/cfg': 4, 'tok2vec/model': 6269370,
    'vocab/strings.json': 1103983, 'vocab/lookups.bin': 70040, 'vocab/vectors': 128,
    'vocab/vectors.cfg': 22, 'vocab/key2row': 1,
}


def _nonempty(path):
    try: return path.is_file() and path.stat().st_size > 0
    except OSError: return False


def _size(path, expected):
    try: return path.is_file() and path.stat().st_size == expected
    except OSError: return False


def _json(path):
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError, UnicodeError):
        return {}


def _ready(folder, files, ignore_marker=False):
    return (ignore_marker or not (folder/INCOMPLETE).exists()) and all(_nonempty(folder/name) for name in files)


def _whisper_vocabulary_ready(folder):
    vocabulary = folder/'vocabulary.json'
    if not vocabulary.exists(): return _nonempty(folder/'vocabulary.txt')
    if not _size(vocabulary, WHISPER_VOCABULARY_BYTES): return False
    try:
        data = json.loads(vocabulary.read_text(encoding='utf-8'))
        return isinstance(data, list) and len(data) == WHISPER_VOCABULARY_TOKENS and all(isinstance(item, str) for item in data)
    except (OSError, ValueError, UnicodeError):
        return False


def whisper_ready(root, ignore_marker=False):
    folder = Path(root)/'whisper-turbo'
    return (_ready(folder, WHISPER_FILES, ignore_marker)
            and _size(folder/'model.bin', WHISPER_MODEL_BYTES)
            and all(_json(folder/name) for name in ['config.json', 'tokenizer.json', 'preprocessor_config.json'])
            and _whisper_vocabulary_ready(folder))


def english_ready(root, ignore_marker=False):
    folder = Path(root)/'english-parser'/'en_core_web_sm'/'en_core_web_sm-3.8.0'
    return (_ready(folder, ENGLISH_FILES, ignore_marker)
            and all(_size(folder/name, size) for name, size in ENGLISH_FILES.items())
            and _json(folder/'meta.json').get('version') == '3.8.0')


def translation_ready(folder, source, target, ignore_marker=False):
    metadata = _json(folder/'metadata.json')
    vocabulary = folder/'model'
    expected = {}
    for (name, from_code, to_code, version), files in TRANSLATION_PACKAGE_BYTES.items():
        if folder.name == name:
            if (source, target, metadata.get('package_version')) != (from_code, to_code, version): return False
            expected = files
            break
    return (_ready(folder, ['metadata.json', 'sentencepiece.model', 'model/model.bin'], ignore_marker)
            and metadata.get('from_code') == source and metadata.get('to_code') == target
            and all(_size(folder/name, size) for name, size in expected.items())
            and (any(_nonempty(vocabulary/('shared_vocabulary.'+ext)) for ext in ['json', 'txt'])
                 or all(any(_nonempty(vocabulary/(name+'_vocabulary.'+ext)) for ext in ['json', 'txt'])
                        for name in ['source', 'target'])))


def find_translation_model(root, source, target):
    for metadata in Path(root).glob('*/metadata.json'):
        if translation_ready(metadata.parent, source, target): return metadata.parent
    return None


def _mark(folder):
    folder.mkdir(parents=True, exist_ok=True)
    (folder/INCOMPLETE).touch()


def _reuse(folder, complete, validate):
    if complete:
        try: validate()
        except Exception: pass
        else:
            (folder/INCOMPLETE).unlink(missing_ok=True)
            return True
    _mark(folder)
    return False


def _finish(folder, complete, validate, message):
    if not complete: raise ValueError(message)
    validate()
    (folder/INCOMPLETE).unlink()


def _validate_whisper(folder):
    from faster_whisper import WhisperModel
    WhisperModel(str(folder), device='cpu', compute_type='int8', cpu_threads=4, local_files_only=True)


def _validate_translation(folder, source):
    import ctranslate2
    import sentencepiece
    tokenizer = sentencepiece.SentencePieceProcessor(model_file=str(folder/'sentencepiece.model'))
    translator = ctranslate2.Translator(str(folder/'model'), device='cpu', compute_type='int8', inter_threads=1, intra_threads=4)
    tokens = tokenizer.encode('안녕하세요.' if source == 'ko' else 'Hello.', out_type=str)
    result = translator.translate_batch([tokens], beam_size=4, max_decoding_length=32)[0].hypotheses[0]
    if not tokenizer.decode(result).strip(): raise ValueError('Translation model validation failed')


def _validate_english(folder):
    import spacy
    document = spacy.load(str(folder))('The children ran.')
    if not any(token.text == 'children' and token.lemma_ == 'child' for token in document):
        raise ValueError('English parser validation failed')


def install_english_parser(models_dir):
    root = Path(models_dir)
    wheel = root/'downloads'/'en_core_web_sm-3.8.0-py3-none-any.whl'
    destination = root/'english-parser'
    model = destination/'en_core_web_sm'/'en_core_web_sm-3.8.0'
    complete = english_ready(root, ignore_marker=True)
    if _reuse(model, complete, lambda: _validate_english(model)):
        print('English parser already installed', flush=True)
        return
    wheel.parent.mkdir(parents=True, exist_ok=True)
    if not wheel.is_file() or hashlib.sha256(wheel.read_bytes()).hexdigest() != ENGLISH_PIPELINE_SHA256:
        print('Downloading pinned spaCy English parser en_core_web_sm 3.8.0', flush=True)
        urllib.request.urlretrieve(ENGLISH_PIPELINE_URL, wheel)
    if hashlib.sha256(wheel.read_bytes()).hexdigest() != ENGLISH_PIPELINE_SHA256:
        raise ValueError('English parser checksum mismatch')
    destination.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(wheel) as archive:
        for item in archive.infolist():
            if not (destination/item.filename).resolve().is_relative_to(destination.resolve()):
                raise ValueError('Unsafe English parser archive path')
        archive.extractall(destination)
    _finish(model, english_ready(root, ignore_marker=True), lambda: _validate_english(model),
            'English parser archive is incomplete or has an unexpected version')
    print('English parser ready for offline processing.', flush=True)


def install_whisper(models_dir=None):
    root = Path(models_dir or os.environ.get('INFLOW_MODELS_DIR', DEFAULT_ROOT))
    root.mkdir(parents=True, exist_ok=True)
    model = root/'whisper-turbo'
    complete = whisper_ready(root, ignore_marker=True)
    if _reuse(model, complete, lambda: _validate_whisper(model)):
        print('Whisper large-v3-turbo already installed', flush=True)
        return
    missing = [name for name in WHISPER_FILES if not _nonempty(model/name)]
    if not _size(model/'model.bin', WHISPER_MODEL_BYTES) and 'model.bin' not in missing: missing.append('model.bin')
    missing += [name for name in ['config.json', 'tokenizer.json', 'preprocessor_config.json']
                if name not in missing and not _json(model/name)]
    if not _whisper_vocabulary_ready(model): missing.append('vocabulary.json')
    print('Downloading Whisper large-v3-turbo from huggingface.co (~1.6 GB); Argos packages total ~190 MB. No media is uploaded.', flush=True)
    snapshot_download('dropbox-dash/faster-whisper-large-v3-turbo', revision='0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf', local_dir=str(model), allow_patterns=missing or WHISPER_FILES + ['vocabulary.*'], force_download=True)
    _finish(model, whisper_ready(root, ignore_marker=True), lambda: _validate_whisper(model), 'Whisper model files are incomplete')


def install_translate(models_dir=None):
    root = Path(models_dir or os.environ.get('INFLOW_MODELS_DIR', DEFAULT_ROOT))
    root.mkdir(parents=True, exist_ok=True)
    for name, folder, revision, digest in PACKAGES:
        source, target = name.split('-')[0].split('_')
        model = find_translation_model(root, source, target) or root/folder
        complete = translation_ready(model, source, target, ignore_marker=True)
        if _reuse(model, complete, lambda: _validate_translation(model, source)):
            print(name+' already installed', flush=True)
            continue
        model = root/folder
        _mark(model)
        print('Downloading '+name+' from the fixed Hugging Face Argostranslate mirror', flush=True)
        package = Path(hf_hub_download('TiberiuCristianLeon/Argostranslate', 'translate-'+name+'.argosmodel', revision=revision, local_dir=str(root/'downloads')))
        if hashlib.sha256(package.read_bytes()).hexdigest() != digest:
            package = Path(hf_hub_download('TiberiuCristianLeon/Argostranslate', 'translate-'+name+'.argosmodel', revision=revision, local_dir=str(root/'downloads'), force_download=True))
        if hashlib.sha256(package.read_bytes()).hexdigest() != digest: raise ValueError('Model checksum mismatch: '+name)
        with zipfile.ZipFile(package) as archive:
            for item in archive.infolist():
                if not (root/item.filename).resolve().is_relative_to(root.resolve()): raise ValueError('Unsafe archive path')
            archive.extractall(root)
        _finish(model, translation_ready(model, source, target, ignore_marker=True),
                lambda: _validate_translation(model, source), 'Translation model files are incomplete: '+name)


def install(models_dir=None):
    root = Path(models_dir or os.environ.get('INFLOW_MODELS_DIR', DEFAULT_ROOT))
    root.mkdir(parents=True, exist_ok=True)
    install_whisper(root)
    install_translate(root)
    install_english_parser(root)
    print('Local models ready. Runtime processing does not use third-party services.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--models-dir', type=Path, default=None, help='Model directory (defaults to INFLOW_MODELS_DIR or .models).')
    install(parser.parse_args().models_dir)
