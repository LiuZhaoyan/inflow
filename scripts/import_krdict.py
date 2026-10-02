"""Extract offline Chinese sense labels from a KRDict Yomichan text archive."""
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path


def import_dictionary(archive, destination):
    entries = {}
    with zipfile.ZipFile(archive) as source:
        revision = json.loads(source.read('index.json'))['revision']
        for name in sorted(source.namelist()):
            if not re.fullmatch(r'term_bank_\d+\.json', name):
                continue
            for entry in json.loads(source.read(name)):
                lemma = entry[0].strip()
                if not lemma or re.search(r'\s', lemma):
                    continue
                for gloss in entry[5]:
                    if not isinstance(gloss, str):
                        continue
                    lines = [line.strip() for line in gloss.splitlines()]
                    numbered = [line for line in lines if re.match(r'^\d+\.\s', line)]
                    candidates = numbered or [line for line in lines if re.search(r'[\u4e00-\u9fff]', line) and not re.search(r'[\uac00-\ud7af]', line)][:1]
                    for candidate in candidates:
                        candidate = re.sub(r'^\d+\.\s*', '', candidate).strip()
                        if not candidate or len(candidate) > 300 or '无对应词汇' in candidate or re.search(r'[\uac00-\ud7af]', candidate):
                            continue
                        meanings = entries.setdefault(lemma, [])
                        if candidate not in meanings:
                            meanings.append(candidate)
    result = {'source': 'National Institute of Korean Language, Korean Basic Dictionary; Yomichan Korean text conversion',
              'license': 'CC BY-SA 2.0 KR', 'revision': revision,
              'archiveSha256': hashlib.sha256(Path(archive).read_bytes()).hexdigest(), 'entries': dict(sorted(entries.items()))}
    Path(destination).parent.mkdir(parents=True, exist_ok=True)
    Path(destination).write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    return len(entries)


if __name__ == '__main__':
    print(import_dictionary(sys.argv[1], sys.argv[2]))
