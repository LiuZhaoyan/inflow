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


def install_english_parser(models_dir):
    import spacy
    root = Path(models_dir)
    wheel = root/'downloads'/'en_core_web_sm-3.8.0-py3-none-any.whl'
    destination = root/'english-parser'
    model = destination/'en_core_web_sm'/'en_core_web_sm-3.8.0'
    metadata = model/'meta.json'
    if (model/'config.cfg').is_file() and metadata.is_file():
        try:
            if json.loads(metadata.read_text(encoding='utf-8')).get('version') == '3.8.0':
                spacy.load(str(model))
                print('English parser already installed', flush=True)
                return
        except (OSError, ValueError):
            pass  # An interrupted extraction must be repairable by rerunning preparation.
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
    if not (model/'config.cfg').is_file() or json.loads(metadata.read_text(encoding='utf-8')).get('version') != '3.8.0':
        raise ValueError('English parser archive is incomplete or has an unexpected version')
    spacy.load(str(model))
    print('English parser ready for offline processing.', flush=True)


def install(models_dir=None):
    root = Path(models_dir or os.environ.get('INFLOW_MODELS_DIR', DEFAULT_ROOT))
    root.mkdir(parents=True, exist_ok=True)
    print('Downloading Whisper large-v3-turbo from huggingface.co (~1.6 GB); Argos packages total ~190 MB. No media is uploaded.', flush=True)
    snapshot_download('dropbox-dash/faster-whisper-large-v3-turbo', revision='0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf', local_dir=str(root/'whisper-turbo'), allow_patterns=['config.json','model.bin','tokenizer.json','vocabulary.*','preprocessor_config.json','README.md'])
    for name, folder, revision, digest in PACKAGES:
        if (root/folder/'model/model.bin').exists() and (root/folder/'sentencepiece.model').exists():
            print(name+' already installed', flush=True)
            continue
        print('Downloading '+name+' from the fixed Hugging Face Argostranslate mirror', flush=True)
        package = Path(hf_hub_download('TiberiuCristianLeon/Argostranslate', 'translate-'+name+'.argosmodel', revision=revision, local_dir=str(root/'downloads')))
        if hashlib.sha256(package.read_bytes()).hexdigest() != digest: raise ValueError('Model checksum mismatch: '+name)
        with zipfile.ZipFile(package) as archive:
            for item in archive.infolist():
                if not (root/item.filename).resolve().is_relative_to(root.resolve()): raise ValueError('Unsafe archive path')
            archive.extractall(root)
    install_english_parser(root)
    print('Local models ready. Runtime processing does not use third-party services.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--models-dir', type=Path, default=None, help='Model directory (defaults to INFLOW_MODELS_DIR or .models).')
    install(parser.parse_args().models_dir)
