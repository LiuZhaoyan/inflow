"""Download local model data only; never upload media. Run once before starting Inflow."""
import argparse
import hashlib
import os
import zipfile
from pathlib import Path
from huggingface_hub import hf_hub_download, snapshot_download

DEFAULT_ROOT = Path(__file__).resolve().parents[1] / '.models'
# Fixed public mirror revisions: official Argos download endpoints returned HTTP 403 during validation.
PACKAGES = [
    ('ko_en-1_1', 'ko_en', '15d756c2e589f5c4c0272a7666b4cf2a1308d5c8', '6da8f3db6ca40f42b1875570a1c06856f6e17c7ef62845d85de217ba548c1471'),
    ('en_zh-1_9', 'translate-en_zh-1_9', 'c57c8db597a5607fc23f21af7c9449d2cc7cc332', '433e7c4f034d87fbe2353161e05f18646d7999452f801a4e1f0378522b9850ab'),
]


def install(models_dir=None):
    root = Path(models_dir or os.environ.get('INFLOW_MODELS_DIR', DEFAULT_ROOT))
    root.mkdir(parents=True, exist_ok=True)
    print('Downloading Whisper base from huggingface.co (~145 MB); Argos packages total ~190 MB. No media is uploaded.', flush=True)
    snapshot_download('Systran/faster-whisper-base', local_dir=str(root/'whisper-base'), allow_patterns=['config.json','model.bin','tokenizer.json','vocabulary.*'])
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
    print('Local models ready. Runtime processing does not use third-party services.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--models-dir', type=Path, default=None, help='Model directory (defaults to INFLOW_MODELS_DIR or .models).')
    install(parser.parse_args().models_dir)
