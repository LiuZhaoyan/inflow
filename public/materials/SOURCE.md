# 首份韩语素材

- 原作者：B. Nam Park；出版机构：美国国务院 Foreign Service Institute；1968。
- 作品：Korean Basic Course, Volume 1，Unit 1, Dialogue A。
- [原版档案目录](https://fsi-languages.yojik.eu/languages/FSI/fsi-korean-basic-course-original.html)（第三方 Yojik 镜像，不是官方网站）。
- [原录音](https://fsi-languages.yojik.eu/languages/FSI/Korean/Basic/Volume%201/FSI%20-%20Korean%20Basic%20Course%20Volume%201%20-%20Unit%2001.mp3)
- [扫描教材](https://fsi-languages.yojik.eu/languages/FSI/Korean/Basic/Volume%201/Fsi-KoreanBasicCourseVolume1-StudentText.pdf)：PDF 第 1 页核对出版机构；第 26、28 页为韩文对话，印刷页码 18、20。
- 获取日期：2026-09-15。

## 编排与核对

本地 `fsi-unit1-dialogue-a.mp3` 拼接原录音 215.8–262.1 秒（带停顿练习）和 11.2–27.9 秒（连贯对话），总长 63 秒。原声保留，没有 TTS。转码为单声道 64 kbps MP3。时间戳在 `src/listening/lesson.json`。

韩文依据扫描教材录入；空格按现代书写整理，应答词按录音识别整理为 네。中文为 Inflow 参考翻译，非原出版物译文。使用本地 Whisper base 辅助定位语音边界，并与教材对照；这不等于母语教师逐句听审，正式扩展素材库前应再作听审，尤其是老录音的音质、敬称及专名。不是将 ASR 输出直接当标准答案。

## 使用条件

档案目录声明原版 FSI 内容为公共领域；下载的 MP3 元数据另有 `Non-commercial educational use only` 标记。本项目按更保守条件，仅将该文件用于非商业学习验证，不宣称商业再分发授权已经解决。原音频、教材不自动适用项目代码的 Apache-2.0 许可。不要混用 2009 年修订录音，该版另有版权限制。

## 文件校验

SHA-256：

- 原录音：`5dbd667ca4213b58efb15a4103d430e9de26903ab39bc55a17a282852d6926c5`
- 扫描教材：`be54b153072e53ddc69c92e0572d5009c3271a9bad12667da4fe1a459e08c783`
- 本地节选：`0e59f38b90d599becfd1e2db70b6480578c1e30fea953ec107b3778ce9fb637a`
