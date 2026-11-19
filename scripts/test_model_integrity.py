import hashlib
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import zipfile

from media_processor import models_status, setup_models_data
from setup_models import ENGLISH_FILES


def write(root, name, data=b'x'):
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


class ModelIntegrityTests(unittest.TestCase):
    def test_status_does_not_report_partial_packages_as_ready(self):
        with TemporaryDirectory() as directory, patch.dict(os.environ, {'INFLOW_MODELS_DIR': directory}):
            root = Path(directory)
            write(root, 'whisper-turbo/model.bin')
            write(root, 'english-parser/en_core_web_sm/en_core_web_sm-3.8.0/config.cfg')
            for folder, source, target in [('ko_en', 'ko', 'en'), ('translate-en_zh-1_9', 'en', 'zh')]:
                write(root, f'{folder}/metadata.json', json.dumps({'from_code': source, 'to_code': target}).encode())
            self.assertEqual(models_status(), {
                'whisper': False,
                'translate': {'ko-en': False, 'en-zh': False},
                'englishParser': False,
            })

    def test_whisper_repair_preserves_existing_files_and_old_installs_need_no_marker(self):
        with TemporaryDirectory() as directory, patch.dict(os.environ, {'INFLOW_MODELS_DIR': directory}), \
                patch('setup_models.WHISPER_MODEL_BYTES', len(b'original model')):
            root = Path(directory)
            for name in ['model.bin', 'tokenizer.json', 'vocabulary.txt', 'preprocessor_config.json']:
                write(root, f'whisper-turbo/{name}', b'{"test": true}' if name.endswith('.json') else b'original model')
            self.assertFalse(models_status()['whisper'])

            def download(*_args, **kwargs):
                self.assertEqual(kwargs['allow_patterns'], ['config.json'])
                write(root, 'whisper-turbo/config.json', b'{"test": true}')

            with patch('setup_models.snapshot_download', side_effect=download), patch('faster_whisper.WhisperModel') as load:
                self.assertTrue(setup_models_data(['whisper'])['whisper'])
                load.assert_called_once()
            self.assertEqual((root / 'whisper-turbo/model.bin').read_bytes(), b'original model')
            self.assertFalse((root / 'whisper-turbo/.inflow-incomplete').exists())
            with patch('setup_models.snapshot_download', side_effect=AssertionError('valid installation was downloaded again')), \
                    patch('faster_whisper.WhisperModel') as load:
                self.assertTrue(setup_models_data(['whisper'])['whisper'])
                load.assert_called_once()

    def test_whisper_vocabulary_is_checked_and_repaired_without_redownloading_weights(self):
        with TemporaryDirectory() as directory, patch.dict(os.environ, {'INFLOW_MODELS_DIR': directory}), \
                patch('setup_models.WHISPER_MODEL_BYTES', len(b'model')):
            root = Path(directory)
            for name in ['config.json', 'tokenizer.json', 'preprocessor_config.json']:
                write(root, f'whisper-turbo/{name}', b'{"test": true}')
            write(root, 'whisper-turbo/model.bin', b'model')
            vocabulary = json.dumps([f'token{i}' for i in range(51866)]).encode().ljust(1068114, b' ')
            write(root, 'whisper-turbo/vocabulary.json', vocabulary)
            self.assertTrue(models_status()['whisper'])
            for bad in [vocabulary[:-1], b'?' + vocabulary[1:], b'["sample"]'.ljust(1068114, b' ')]:
                with self.subTest(size=len(bad), starts=bad[:1]):
                    write(root, 'whisper-turbo/vocabulary.json', bad)
                    self.assertFalse(models_status()['whisper'])

            def download(*_args, **kwargs):
                self.assertEqual(kwargs['allow_patterns'], ['vocabulary.json'])
                write(root, 'whisper-turbo/vocabulary.json', vocabulary)

            with patch('setup_models.snapshot_download', side_effect=download) as fetch, patch('faster_whisper.WhisperModel'):
                self.assertTrue(setup_models_data(['whisper'])['whisper'])
                fetch.assert_called_once()
            self.assertEqual((root / 'whisper-turbo/model.bin').read_bytes(), b'model')
            (root / 'whisper-turbo/vocabulary.json').unlink()
            write(root, 'whisper-turbo/vocabulary.txt', b'valid legacy vocabulary')
            self.assertTrue(models_status()['whisper'])

    def test_real_english_pipeline_detects_interrupted_sidecars(self):
        project = Path(__file__).resolve().parents[1]
        wheel = Path(os.environ.get('INFLOW_MODELS_DIR', project / '.models')) / 'downloads/en_core_web_sm-3.8.0-py3-none-any.whl'
        if not wheel.is_file(): self.skipTest('Pinned English wheel is unavailable')
        with TemporaryDirectory() as directory, patch.dict(os.environ, {'INFLOW_MODELS_DIR': directory}):
            root = Path(directory)
            with zipfile.ZipFile(wheel) as archive:
                archive.extractall(root / 'english-parser')
            model = root / 'english-parser/en_core_web_sm/en_core_web_sm-3.8.0'
            self.assertTrue(models_status()['englishParser'])
            for name in ['config.cfg', 'parser/moves', 'vocab/strings.json', 'senter/model']:
                path = model / name
                original = path.read_bytes()
                with self.subTest(sidecar=name):
                    if name == 'senter/model': path.unlink()
                    else: path.write_bytes(original[:15])
                    ready = models_status()['englishParser']
                    path.write_bytes(original)
                    self.assertFalse(ready)

    def test_canonical_translation_rejects_missing_or_invalid_package_version(self):
        sizes = {('ko_en', 'ko', 'en', '1.1'): {'model/model.bin': 5}}
        with TemporaryDirectory() as directory, patch.dict(os.environ, {'INFLOW_MODELS_DIR': directory}), \
                patch('setup_models.TRANSLATION_PACKAGE_BYTES', sizes):
            root = Path(directory)
            for name in ['model/model.bin', 'model/shared_vocabulary.txt', 'sentencepiece.model']:
                write(root, f'ko_en/{name}', b'model')
            for version in [None, 'wrong', ['1.1']]:
                with self.subTest(version=version):
                    metadata = {'from_code': 'ko', 'to_code': 'en'}
                    if version is not None: metadata['package_version'] = version
                    write(root, 'ko_en/metadata.json', json.dumps(metadata).encode())
                    self.assertFalse(models_status()['translate']['ko-en'])
            metadata['package_version'] = '1.1'
            write(root, 'ko_en/metadata.json', json.dumps(metadata).encode())
            self.assertTrue(models_status()['translate']['ko-en'])

    def test_interrupting_validation_does_not_mark_a_healthy_translation_incomplete(self):
        sizes = {('ko_en', 'ko', 'en', '1.1'): {'model/model.bin': 5}}
        packages = [('ko_en-1_1', 'ko_en', 'revision', 'digest')]
        with TemporaryDirectory() as directory, patch.dict(os.environ, {'INFLOW_MODELS_DIR': directory}), \
                patch('setup_models.TRANSLATION_PACKAGE_BYTES', sizes), patch('setup_models.PACKAGES', packages):
            root = Path(directory)
            metadata = {'from_code': 'ko', 'to_code': 'en', 'package_version': '1.1'}
            write(root, 'ko_en/metadata.json', json.dumps(metadata).encode())
            for name in ['model/model.bin', 'model/shared_vocabulary.txt', 'sentencepiece.model']:
                write(root, f'ko_en/{name}', b'model')
            with patch('sentencepiece.SentencePieceProcessor', side_effect=KeyboardInterrupt), \
                    patch('setup_models.hf_hub_download') as download:
                with self.assertRaises(KeyboardInterrupt): setup_models_data(['translate'])
                download.assert_not_called()
            self.assertTrue(models_status()['translate']['ko-en'])
            self.assertEqual((root / 'ko_en/model/model.bin').read_bytes(), b'model')

    def test_status_rejects_truncated_pinned_weights_with_other_files_present(self):
        english_sizes = {name: len(b'{"version": "3.8.0"}') if name == 'meta.json' else len(b'truncated') for name in ENGLISH_FILES}
        english_sizes['parser/model'] = 100
        with TemporaryDirectory() as directory, patch.dict(os.environ, {'INFLOW_MODELS_DIR': directory}), \
                patch('setup_models.WHISPER_MODEL_BYTES', 100), \
                patch('setup_models.TRANSLATION_PACKAGE_BYTES', {('ko_en', 'ko', 'en', '1.1'): {'model/model.bin': 100}}), \
                patch('setup_models.ENGLISH_FILES', english_sizes):
            root = Path(directory)
            for name in ['model.bin', 'config.json', 'tokenizer.json', 'vocabulary.txt', 'preprocessor_config.json']:
                write(root, f'whisper-turbo/{name}', b'{"test": true}' if name.endswith('.json') else b'truncated')
            metadata = {'from_code': 'ko', 'to_code': 'en', 'package_version': '1.1'}
            write(root, 'ko_en/metadata.json', json.dumps(metadata).encode())
            for name in ['model/model.bin', 'model/shared_vocabulary.txt', 'sentencepiece.model']:
                write(root, f'ko_en/{name}', b'truncated')
            english = 'english-parser/en_core_web_sm/en_core_web_sm-3.8.0'
            for name in ENGLISH_FILES:
                write(root, f'{english}/{name}', b'{"version": "3.8.0"}' if name == 'meta.json' else b'truncated')
            self.assertFalse(models_status()['whisper'])
            self.assertFalse(models_status()['translate']['ko-en'])
            self.assertFalse(models_status()['englishParser'])
            write(root, 'whisper-turbo/model.bin', b'x' * 100)
            write(root, 'ko_en/model/model.bin', b'x' * 100)
            write(root, f'{english}/parser/model', b'x' * 100)
            status = models_status()
            self.assertTrue(status['whisper'])
            self.assertTrue(status['translate']['ko-en'])
            self.assertTrue(status['englishParser'])

    def test_translation_status_skips_incomplete_duplicate_and_empty_files(self):
        with TemporaryDirectory() as directory, patch.dict(os.environ, {'INFLOW_MODELS_DIR': directory}):
            root = Path(directory)
            metadata = json.dumps({'from_code': 'ko', 'to_code': 'en', 'package_version': '1.1'}).encode()
            for folder in ['partial', 'complete']:
                write(root, f'{folder}/metadata.json', metadata)
            for name in ['model/model.bin', 'model/shared_vocabulary.txt', 'sentencepiece.model']:
                write(root, f'complete/{name}')
            self.assertTrue(models_status()['translate']['ko-en'])
            write(root, 'complete/sentencepiece.model', b'')
            self.assertFalse(models_status()['translate']['ko-en'])

    def test_status_rejects_truncated_pinned_translation_sidecars(self):
        sizes = {
            ('ko_en', 'ko', 'en', '1.1'): {'model/model.bin': 5, 'sentencepiece.model': 7, 'model/shared_vocabulary.txt': 9},
            ('translate-en_zh-1_9', 'en', 'zh', '1.9'): {'model/model.bin': 5, 'sentencepiece.model': 8, 'model/shared_vocabulary.json': 10},
        }
        with TemporaryDirectory() as directory, patch.dict(os.environ, {'INFLOW_MODELS_DIR': directory}), \
                patch('setup_models.TRANSLATION_PACKAGE_BYTES', sizes):
            root = Path(directory)
            packages = [
                ('ko_en', 'ko', 'en', '1.1', 'ko-en', 'model/shared_vocabulary.txt', 7, 9),
                ('translate-en_zh-1_9', 'en', 'zh', '1.9', 'en-zh', 'model/shared_vocabulary.json', 8, 10),
            ]
            for folder, source, target, version, pair, vocabulary, tokenizer_size, vocabulary_size in packages:
                write(root, f'{folder}/metadata.json', json.dumps({'from_code': source, 'to_code': target, 'package_version': version}).encode())
                write(root, f'{folder}/model/model.bin', b'model')
                write(root, f'{folder}/sentencepiece.model', b'x' * tokenizer_size)
                write(root, f'{folder}/{vocabulary}', b'x' * vocabulary_size)
                self.assertTrue(models_status()['translate'][pair])
                for sidecar in ['sentencepiece.model', vocabulary]:
                    path = root / folder / sidecar
                    with self.subTest(pair=pair, sidecar=sidecar):
                        with path.open('r+b') as file: file.truncate(path.stat().st_size - 1)
                        self.assertFalse(models_status()['translate'][pair])
                        with path.open('ab') as file: file.write(b'x')

    def test_interrupted_translation_preparation_repairs_partial_package(self):
        with TemporaryDirectory() as directory, patch.dict(os.environ, {'INFLOW_MODELS_DIR': directory}):
            root = Path(directory)
            metadata = json.dumps({'from_code': 'ko', 'to_code': 'en', 'package_version': '1.1'}).encode()
            write(root, 'ko_en/metadata.json', metadata)
            write(root, 'ko_en/model/model.bin', b'old model')
            write(root, 'other-user-resource/keep', b'untouched')
            archive = root / 'package.argosmodel'
            with zipfile.ZipFile(archive, 'w') as package:
                package.writestr('ko_en/metadata.json', metadata)
                package.writestr('ko_en/model/model.bin', b'model')
                package.writestr('ko_en/model/shared_vocabulary.txt', b'vocabulary')
                package.writestr('ko_en/sentencepiece.model', b'tokenizer')
            digest = hashlib.sha256(archive.read_bytes()).hexdigest()
            packages = [('ko_en-1_1', 'ko_en', 'revision', digest)]
            sizes = {('ko_en', 'ko', 'en', '1.1'): {'model/model.bin': 5, 'sentencepiece.model': 9, 'model/shared_vocabulary.txt': 10}}
            with patch('setup_models.PACKAGES', packages), patch('setup_models.TRANSLATION_PACKAGE_BYTES', sizes), \
                    patch('setup_models.hf_hub_download', side_effect=RuntimeError('interrupted')):
                with self.assertRaisesRegex(RuntimeError, 'interrupted'):
                    setup_models_data(['translate'])
                self.assertFalse(models_status()['translate']['ko-en'])
                self.assertEqual((root / 'ko_en/model/model.bin').read_bytes(), b'old model')

            with patch('setup_models.PACKAGES', packages), patch('setup_models.TRANSLATION_PACKAGE_BYTES', sizes), \
                    patch('setup_models.hf_hub_download', return_value=str(archive)), \
                    patch('sentencepiece.SentencePieceProcessor') as tokenizer, patch('ctranslate2.Translator') as translator:
                tokenizer.return_value.encode.return_value = ['hello']
                tokenizer.return_value.decode.return_value = 'ok'
                translator.return_value.translate_batch.return_value = [SimpleNamespace(hypotheses=[['ok']])]
                self.assertTrue(setup_models_data(['translate'])['translate']['ko-en'])
                tokenizer.return_value.encode.assert_called()
                translator.return_value.translate_batch.assert_called()
            self.assertEqual((root / 'other-user-resource/keep').read_bytes(), b'untouched')

    def test_validation_failure_keeps_a_package_available_for_repair(self):
        with TemporaryDirectory() as directory, patch.dict(os.environ, {'INFLOW_MODELS_DIR': directory}), \
                patch('setup_models.WHISPER_MODEL_BYTES', len(b'model')):
            root = Path(directory)
            for name in ['model.bin', 'config.json', 'tokenizer.json', 'vocabulary.txt', 'preprocessor_config.json']:
                write(root, f'whisper-turbo/{name}', b'{"test": true}' if name.endswith('.json') else b'model')
            with patch('setup_models.snapshot_download') as download, patch('faster_whisper.WhisperModel', side_effect=ValueError('cannot load')) as load:
                with self.assertRaisesRegex(ValueError, 'cannot load'):
                    setup_models_data(['whisper'])
                self.assertEqual(load.call_count, 2)
                download.assert_called_once()
            self.assertFalse(models_status()['whisper'])

            with patch('setup_models.snapshot_download') as download, patch('faster_whisper.WhisperModel'):
                self.assertTrue(setup_models_data(['whisper'])['whisper'])
                download.assert_not_called()

    def test_complete_looking_model_that_fails_validation_is_repaired_in_same_attempt(self):
        with TemporaryDirectory() as directory, patch.dict(os.environ, {'INFLOW_MODELS_DIR': directory}), \
                patch('setup_models.WHISPER_MODEL_BYTES', len(b'model')):
            root = Path(directory)
            for name in ['model.bin', 'config.json', 'tokenizer.json', 'vocabulary.txt', 'preprocessor_config.json']:
                write(root, f'whisper-turbo/{name}', b'{"test": true}' if name.endswith('.json') else b'model')
            with patch('setup_models.snapshot_download') as download, \
                    patch('faster_whisper.WhisperModel', side_effect=[ValueError('cannot load'), None]) as load:
                self.assertTrue(setup_models_data(['whisper'])['whisper'])
                download.assert_called_once()
                self.assertEqual(load.call_count, 2)


if __name__ == '__main__':
    unittest.main()
