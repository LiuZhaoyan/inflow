# Korean speech API options

Verified: 2026-09-30. Scope: official documentation only; no accounts, keys, media uploads, integration, or quality tests. These are candidates for discussion, not selected providers. Actual access from the user's network and account eligibility remain unverified.

## Groq: timestamped speech recognition

- Groq offers multilingual `whisper-large-v3` and `whisper-large-v3-turbo`. Transcription returns the original language; translation returns English. `verbose_json` with `timestamp_granularities[]=word` and/or `segment` provides timings. Free-tier uploads are limited to 25 MB; larger videos need audio extraction/compression or chunking. [Speech-to-text documentation](https://console.groq.com/docs/speech-to-text)
- Korean support is inferred from Groq hosting multilingual Whisper and verified against the model author's source, which explicitly maps `ko` to Korean. Groq's reviewed product page describes multilingual support but does not enumerate Korean separately. Hosted Korean accuracy and timestamp quality have not been tested. [OpenAI Whisper language definitions](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py)
- The published Free Plan table lists both Whisper models at 20 requests/minute, 2,000 requests/day, 7,200 audio seconds/hour and 28,800 audio seconds/day. This is a recurring rate-limited plan, not a one-time trial credit. Exact limits can differ by organization and should be checked in its console. [Rate limits](https://console.groq.com/docs/rate-limits)
- The billing FAQ requires a valid payment method when upgrading from Free to Developer; Developer usage is billed. The FAQ does not establish every Free signup prerequisite, so this review does not promise unrestricted signup or card-free eligibility in every region. [Billing FAQ](https://console.groq.com/docs/billing-faqs)
- Korean TTS was not established in this bounded review; do not treat Groq as a confirmed single-provider ASR/TTS solution.

## Azure Speech: Korean recognition and synthesis

- `ko-KR` is explicitly listed for Korean speech recognition. Korean neural voices include `ko-KR-SunHiNeural` and `ko-KR-InJoonNeural`; other voice classes also exist, but free-tier eligibility must be matched to the selected class. [Language and voice support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support)
- The Speech SDK provides recognized utterance offset/duration and optional per-word offset/duration through `RequestWordLevelTimestamps` (or its language-specific equivalent). This capability plus explicit Korean support makes it a timestamped-ASR candidate; the timing example itself is English and Korean results remain untested. [Recognition results and timing](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/get-speech-recognition-results)
- Speech Free (F0) lists 5 audio hours/month for real-time transcription and 500,000 neural TTS characters/month. Standard/custom ASR share the allowance; batch transcription is excluded. These recurring allowances are distinct from the new-customer trial. Reviewed paid prices render as placeholders, so no paid rate is quoted. [Speech pricing](https://azure.microsoft.com/en-us/pricing/details/speech/)
- Azure's new-customer account offers $200 for 30 days. Signup requires a phone number, non-prepaid credit/debit card, and Microsoft/GitHub identity; a temporary verification hold may occur. Continuing after 30 days or exhausted credit requires moving the account to pay-as-you-go. The account page lists Speech's neural TTS allowance as always free; this does not mean every voice/resource is free. Its offer excludes sovereign Azure China products. The user's actual signup eligibility and reachable deployment region are unknown. [Account and free-offer terms](https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account)

## Implications for Inflow

Cloud ASR uploads audio for recognition; local ASR runs a downloaded model on the user's own machine. Neither choice changes the requirement to save learning artifacts locally. ASR segments/utterances are not guaranteed to equal grammatical sentences, so the app still needs sentence grouping and timing checks. For generated artifacts, synthesizing one sentence per audio file is a possible simple replay approach; this is a design inference, not an API guarantee or a chosen implementation.

The smallest comparison is Groq Free for uploaded-video ASR versus Azure F0 for both ASR and Korean TTS. Provider selection should follow an access check and a short Korean quality/timing sample. No third vendor was added because these two already cover the requested capabilities and free-tier distinctions.
