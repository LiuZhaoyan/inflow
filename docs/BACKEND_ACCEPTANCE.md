
# Inflow 本地后端真实媒体验收

验收日期：2026-09-16（Asia/Shanghai）
运行位置：WSL Ubuntu，/home/ada/projects/inflow
API：http://127.0.0.1:3010（Node 本地开发服务）
处理器：项目 .venv/bin/python scripts/media_processor.py，模型只从项目 .models/ 读取
输入没有使用 src/listening/lesson.json 的预置文本；所有转写样例来自实际 worker 输出。

## 结论

真实音频和真实韩语视频均通过本地转写 API 的基本验收：返回 HTTP 200，包含带 start/end 的句子、原文和意群；独立结构检查确认所有片段时间单调、时长为正、意群拼接后与原文一致（忽略空格）。

真实 ASR 结果存在模型误识别，尤其是较长的自然视频语句；结果没有人工纠正或用 lesson 文本替换。离线翻译 API 对两条真实识别句子返回中文。坏媒体、纯静音和无音轨媒体都返回 HTTP 503 及可理解错误信息。

## 输入与本地模型

| 输入 | 字节数 | SHA-256 | PyAV 时长 | 音视频流 |
| --- | ---: | --- | ---: | --- |
| public/materials/fsi-unit1-dialogue-a.mp3 | 505,007 | 0e59f38b90d599becfd1e2db70b6480578c1e30fea953ec107b3778ce9fb637a | 63.000 s | audio / mp3float |
| /tmp/inflow-acceptance/hanbid-ko.webm | 26,999,144 | edf0a8c7ac7a104246ed9c1c2a0e81b51b4509227895c3f50e8c3978f3bd5037 | 155.775 s | video / vp8；audio / vorbis |

视频来源：[WIKITONGUES / Hanbid speaking Korean](https://commons.wikimedia.org/wiki/File:WIKITONGUES-_Hanbid_speaking_Korean.webm)，作者 Wikitongues / Teddy Nee，CC BY-SA 4.0。视频只下载到验收临时目录，未复制到仓库。

本次运行版本：

- Python 3.12.3
- faster-whisper 1.2.1
- kiwipiepy 0.23.2
- ctranslate2 4.8.2
- sentencepiece 0.2.2
- Whisper 模型：.models/whisper-base，CPU int8
- 翻译模型：本地 Argos ko→en 与 en→zh，经 CTranslate2 离线执行

## 实际命令与结果

### 1. Python worker：仓库真实音频

等价 worker 命令：

~~~bash
/home/ada/projects/inflow/.venv/bin/python \
  /home/ada/projects/inflow/scripts/media_processor.py transcribe \
  /home/ada/projects/inflow/public/materials/fsi-unit1-dialogue-a.mp3
~~~

状态：PASS。worker 返回码 0，实测耗时 5.972 s，输出 22 个片段，stderr 为空。

结构检查结果：

- 22/22 片段 0 <= start < end <= 63.0；
- 相邻片段时间不重叠；
- 每个片段 groups 非空；
- groups 拼接后与 text 一致（忽略空格）。

样例：

~~~text
01  0.080–1.360  안녕하십니까?             → 안녕하십니까?
06 20.400–21.940  선생님은 미국 사람입니까?  → 선생님은 / 미국 사람입니까?
22 61.290–62.710  한국말을 공부합니다.       → 한국말을 / 공부합니다.
~~~

### 2. HTTP API：仓库真实音频

~~~bash
curl -sS --max-time 650 \
  -F 'file=@/home/ada/projects/inflow/public/materials/fsi-unit1-dialogue-a.mp3;type=audio/mpeg' \
  -o /tmp/inflow-acceptance/api-audio-result.json \
  http://127.0.0.1:3010/api/transcribe
~~~

实际结果：HTTP 200，响应 2,319 bytes，耗时 6.148045 s，22 个片段。API 响应再次通过时间、原文和意群结构检查；首片段为 0.080–1.360，末片段为 61.290–62.710。

### 3. HTTP API：Wikimedia 真实韩语视频

~~~bash
curl -sS --max-time 650 \
  -F 'file=@/tmp/inflow-acceptance/hanbid-ko.webm;type=video/webm' \
  -o /tmp/inflow-acceptance/api-video-result.json \
  http://127.0.0.1:3010/api/transcribe
~~~

实际结果：HTTP 200，响应 5,604 bytes，耗时 17.229020 s，37 个片段。37/37 片段通过同样的结构检查；全部时间范围落在视频 155.775 秒内。

样例：

~~~text
01   0.080–1.240  안녕하세요?
02   1.940–5.680  저는 한국에서 데만 사랑한 전근한 김한빛이라고 합니다.
05  18.100–20.300  저희 가족은 4명입니다.
37 152.480–153.340  감사합니다.
~~~

长句的 “데만 사랑한 전근한” 等内容是 base 模型的真实识别结果，保留用于暴露识别质量上限。

### 4. HTTP API：真实识别句子的中文翻译

请求使用 POST /api/translate、content-type: application/json 和 curl --max-time 650，JSON 请求体通过 stdin 传给 curl：

~~~bash
printf '%s' '{"text":"선생님은 미국 사람입니까?"}' |
  curl -sS --max-time 650 \
  -H 'content-type: application/json' --data-binary @- \
  http://127.0.0.1:3010/api/translate
~~~

结果：HTTP 200，耗时 0.603 s，선생님은 미국 사람입니까? → 你是美国老师吗?。

第二条真实视频识别句：

~~~text
저희 가족은 4명입니다. → 我们的家庭是4个人。
~~~

结果：HTTP 200，耗时 0.468 s。译文为本地 Argos ko→en→zh 推理结果，表达偏直译。

## 失败输入验收

负面夹具只放在 /tmp/inflow-acceptance/，不属于产品素材：

| 输入 | 特征 | SHA-256 | 请求耗时 | HTTP | API 错误 |
| --- | --- | --- | ---: | ---: | --- |
| /etc/hostname，以 bad.webm 上传 | 故意损坏媒体 | 未作为产品输入记录 | 0.283 s | 503 | 本地模型无法处理此媒体或文本，请确认模型安装完整，或换一段清晰的韩语媒体重试。 |
| silent.wav | 2.000 s，64,044 bytes，PCM 静音音轨 | 20eaebffe1816e0ffa6f7f854f5ef4ea80d5349faaf0ce1fec1b713e7fde58fa | 0.963 s | 503 | 没有识别到语音，请换一段声音清晰的韩语媒体重试。 |
| no-audio.webm | 2.000 s，708 bytes，只有 VP8 视频流 | 381b9b839079411124deba3e5e3e16cc41c5514517bc6e2cbfcb1d724e505a55 | 0.288 s | 503 | 媒体没有音轨，请选择包含语音的音频或视频。 |

坏媒体请求使用的实际 multipart 形式：

~~~bash
curl -sS --max-time 650 \
  -F 'file=@/etc/hostname;filename=bad.webm;type=video/webm' \
  http://127.0.0.1:3010/api/transcribe
~~~

## 清理与局限

API 处理期间会把上传内容写入服务机器的临时目录；本轮请求完成后的首次检查短暂看到一个 inflow-i1XPoc 目录，随后复查该目录已自动消失，最终 /tmp 只留下验收证据目录 /tmp/inflow-acceptance，未确认持久残留。处理使用本地 Python 和本地模型；本轮 API 请求均发往 127.0.0.1。

本轮只覆盖一条 63 秒音频和一条 155.775 秒视频。Whisper base CPU int8 的速度可接受，但长句和自然语速视频会出现上述误识别；意群按词性和助词边界划分，不等于人工语义断句。尚未把模型识别准确率视为教学原文正确性的证明，也未覆盖超过 10 分钟、超过 50 MB、取消请求、并发 busy 锁和浏览器播放行为；这些需要单独验收。
