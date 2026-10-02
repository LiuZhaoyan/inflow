# KRDict Chinese Text Data

Author: National Institute of Korean Language, Republic of Korea.
Original work: [Korean Basic Dictionary](https://krdict.korean.go.kr/).
License: [CC BY-SA 2.0 KR](https://creativecommons.org/licenses/by-sa/2.0/kr/); see the included `LICENSE.txt` and the [official copyright policy](https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo).

The source text archive is the `KRDICT ZH` conversion distributed by [Yomichan Korean](https://github.com/samuelbuenofran/yomichan-korean), linked from its README to the [public dictionary folder](https://drive.google.com/drive/folders/1YRw_FPSyGqKd8B0ubs8I36AAfbduWZnJ). File ID: `1qCt1fspjFxNbrxFsaJ16wgMvb4ULL2MV`; archive revision: `krdict_ko-zh_0923`. Downloaded on 2026-10-02. The archive SHA-256 is recorded in `krdict-zh.json`.

Inflow modifies this text data by extracting Chinese sense labels, excluding whitespace-containing headwords and missing translations, and merging duplicate labels by headword. These modified dictionary data remain under CC BY-SA 2.0 KR. This notice applies to the dictionary data, independently of Inflow's code license. No images, recordings or other multimedia are included.

Reproduce the data with `python scripts/import_krdict.py <source-archive.zip> resources/dictionaries/krdict-zh.json`. The archive itself is not committed. This is a fixed snapshot with incomplete coverage; an absent entry leaves manual and user-requested cloud lookup available.
