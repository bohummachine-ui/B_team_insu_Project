# Plan: recording-stt (녹취록 자동 STT + Drive 재생)

- Feature: `recording-stt`
- Author: 대표님
- Date: 2026-04-24
- Status: Plan

---

## Executive Summary

| 관점 | 내용 |
|---|---|
| **Problem** | 녹취록이 각 사용자 Drive에 저장만 되어 있어 팀이 듣거나 내용을 확인하기 불편하고, 30~60분 녹취를 매번 다시 듣는 것은 비효율적 |
| **Solution** | 업로드 직후 업로더 본인의 Gemini API 키로 자동 STT 수행 → 텍스트를 DB에 1회 캐싱 → 공유 시 모두 캐시된 텍스트를 열람. 재생은 Drive 임베드로 제공 |
| **Function UX Effect** | 업로드 → 자동 변환 → "텍스트 보기/재생" 2버튼 카드. API 키는 사용자별 프로필에서 Supabase Vault로 암호화 저장. 비용은 각자 무료 티어로 부담 |
| **Core Value** | 녹취록이 "아카이브"에서 "검색·공유 가능한 상담 자산"으로 전환. 본사·팀 고정비 0원으로 확장 |

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | 녹취록 보관만으로는 가치가 낮음. 텍스트화로 검색·공유·학습 가능한 자산으로 전환 |
| **WHO** | 녹취록을 업로드하는 상담 담당자 + 공유받은 팀원 (보험설계사) |
| **RISK** | 무료 티어 rate limit(RPM 15/RPD 1000) 초과 / API 키 유출 / 고객 음성의 Google 전송 동의 / 오탈자(편집 불가) |
| **SUCCESS** | 20MB 이하 녹취록 업로드 후 3분 내 STT 텍스트 생성, 팀 공유 시 캐시된 텍스트 즉시 열람, API 키 평문 노출 0건 |
| **SCOPE** | Gemini 2.5 Flash Lite 기반 자동 STT + Drive iframe 재생 + 사용자별 Gemini API 키 관리. 텍스트 편집 제외 |

---

## 1. Overview

### 1.1 배경
현재 `RecordingPanel.tsx`는 업로드·목록·공유만 지원한다. 파일은 업로더의 Google Drive에 저장되고 `drive_file_id`, `drive_share_link`가 DB에 기록된다. 팀원이 공유받아도 **음성 파일을 매번 Drive에서 열어 들어야** 하고, 검색·요약·인용이 불가능하다.

### 1.2 목표
1. 업로드 직후 **자동으로 STT**하여 텍스트를 DB에 저장
2. 카드에서 **"텍스트 보기"**로 즉시 원문 열람
3. 카드에서 **"재생"**으로 Drive 오디오를 앱 내에서 청취
4. API 비용은 **각 사용자의 Gemini 무료 티어**로 부담 → 본사 비용 0

### 1.3 비-목표 (Out of Scope)
- 텍스트 편집 (사용자가 문맥으로 판단)
- 자동 요약·AI 분석 (별도 PDCA)
- 화자 분리(diarization)
- Supabase Storage 이관 (Drive 유지)
- 실시간 스트리밍 STT

---

## 2. Requirements

### 2.1 기능 요구사항 (Functional)

| ID | 요구사항 |
|---|---|
| FR-1 | 사용자는 프로필 페이지에서 본인의 Gemini API 키를 등록·수정·삭제할 수 있다 |
| FR-2 | API 키는 Supabase Vault에 암호화 저장되며 평문으로 클라이언트에 노출되지 않는다 |
| FR-3 | 녹취록 업로드 성공 직후 서버가 업로더의 API 키로 STT를 자동 실행한다 |
| FR-4 | STT 상태는 `pending / processing / done / failed` 로 표시되며 카드에서 확인 가능하다 |
| FR-5 | STT 완료 시 카드에 "텍스트 보기" 버튼이 활성화되고 클릭 시 전문을 모달로 표시한다 |
| FR-6 | 공유된 녹취록은 캐시된 텍스트를 그대로 보여주며, 뷰어의 API 키를 호출하지 않는다 |
| FR-7 | 카드의 "재생" 버튼은 Drive 파일을 iframe으로 임베드해 앱 내에서 재생한다 |
| FR-8 | 업로드 최대 크기를 기존 50MB → **20MB**로 축소한다 (Gemini inline 입력 한계) |
| FR-9 | API 키 미등록·Rate limit 초과·Gemini 오류 시 STT는 `failed`가 되고 "재시도" 버튼이 노출된다 |
| FR-10 | STT 실행 로그(성공/실패/모델/에러)를 서버에 남긴다 (감사용) |

### 2.2 비기능 요구사항 (Non-Functional)

| ID | 요구사항 |
|---|---|
| NFR-1 | 15분 녹취(≈15MB) 기준 STT 완료까지 **3분 이내** |
| NFR-2 | API 키 DB 저장은 Supabase Vault(pgsodium 기반) 암호화 — 평문 DB dump에도 노출 불가 |
| NFR-3 | API 키 조회는 서버 RPC에서만 가능 (`SECURITY DEFINER`), 클라이언트는 등록 여부(boolean)만 확인 |
| NFR-4 | Rate limit 초과 시 **사용자에게 명확한 에러 메시지** + 재시도 UI 제공 (자동 큐잉·재시도 없음) |
| NFR-5 | STT 처리 중 UI 블로킹 없음 — 업로드 완료 즉시 카드 생성, 상태만 비동기 갱신 |

### 2.3 제약 (Constraints)
- Gemini 모델: `gemini-2.5-flash-lite` (무료 티어, 오디오 입력 지원, RPM 15 / RPD 1000)
- 참조: https://ai.google.dev/gemini-api/docs/pricing?hl=ko#gemini-3.1-flash-lite-preview
- 파일 크기 ≤ 20MB (inline base64 인코딩 한계 고려)
- 지원 포맷: audio/mpeg, audio/mp4, audio/wav, audio/webm, audio/ogg (Gemini 지원)

---

## 3. User Stories

- **US-1**: 상담 담당자로서, 녹취 파일을 업로드하면 알아서 텍스트로 변환되길 원한다. 내가 들을 필요 없이 요점만 다시 보고 싶다
- **US-2**: 팀원으로서, 공유받은 녹취록의 내용을 빠르게 훑어보고 필요한 부분만 청취하고 싶다
- **US-3**: 사용자로서, 내 API 키가 안전하게 저장되길 원한다. 유출 사고가 일어나도 평문으로 털리지 않길 바란다
- **US-4**: 지점장으로서, 본사가 STT 비용을 부담하지 않고도 기능을 제공받을 수 있길 원한다

---

## 4. Success Criteria

| SC | 기준 | 검증 방법 |
|---|---|---|
| SC-1 | 20MB 이하 오디오 업로드 후 3분 내 STT done 상태가 된다 | E2E: 15MB 샘플 업로드 → 상태 polling |
| SC-2 | API 키는 DB에서 평문으로 조회 불가 | 수동: `select * from users` 결과에 암호문만 보임 |
| SC-3 | 공유된 녹취록 열람 시 STT API 재호출 0건 | 서버 로그 확인 |
| SC-4 | Rate limit 초과 시 "재시도" 버튼이 노출되고 클릭 시 재실행된다 | 수동: 인위적 429 유도 |
| SC-5 | Gemini 키 미등록 사용자도 업로드는 성공하며 `transcript_status = 'failed'`로 기록된다 | E2E |
| SC-6 | Drive 임베드 재생이 데스크톱 Chrome·Safari, 모바일 Chrome에서 정상 동작 | 수동 브라우저 테스트 |

---

## 5. Risks & Mitigations

| 리스크 | 영향 | 완화 |
|---|---|---|
| Gemini 무료 티어 RPM/RPD 초과 | STT 실패 증가 | failed 상태 + 재시도 버튼 (NFR-4). 대시보드에 일일 실패율 표시 (추후) |
| API 키 유출 | 사용자 Google 계정 청구 발생 | Supabase Vault 암호화 + RLS + 서버 RPC 전용 조회 |
| 고객 음성의 Google 전송 동의 | 개인정보보호법 이슈 | 기존 `consent_confirmed` 체크박스 문구에 "STT를 위해 Google API로 전송됨" 명시 추가 |
| 20MB 제한으로 긴 녹취 업로드 불가 | UX 불편 | UI에서 명확히 표시 + 향후 File API 확장은 별도 PDCA |
| STT 오인식 (보험 전문용어) | 텍스트 신뢰도 저하 | 원문 재생 버튼을 항상 병기하여 청취로 재확인 가능 |
| Drive iframe 재생이 iOS에서 불안정 | 모바일 UX 저하 | Fallback: `drive_share_link` 새 탭 열기 버튼 병기 |

---

## 6. Dependencies

### 6.1 외부
- Google Gemini API (`@google/genai` 또는 `@google/generative-ai` npm 패키지)
- Gemini 모델: `gemini-2.5-flash-lite`
- Supabase Vault (pgsodium extension)

### 6.2 내부
- 기존 `recordings` 테이블 확장
- 기존 `users` 테이블(또는 `profiles`) 확장 — API 키 컬럼
- 기존 `RecordingPanel.tsx` 확장
- 기존 `/api/recordings/upload` 훅 확장 (업로드 성공 후 STT trigger)

---

## 7. High-Level Approach

### 7.1 아키텍처 개요
```
[Client]
  ├─ ProfileSettings  ── POST /api/profile/gemini-key ──┐
  │                                                     ▼
  ├─ UploadForm ── POST /api/recordings ─► Drive upload ─► INSERT recordings
  │                                                     │
  │                                                     ▼
  │                                        POST /api/recordings/[id]/transcribe (auto)
  │                                                     │
  │                                                     ▼
  │                                    [Server]  Vault RPC → decrypt key
  │                                                     │
  │                                                     ▼
  │                                             Drive alt=media fetch
  │                                                     │
  │                                                     ▼
  │                                            Gemini generateContent (inline audio)
  │                                                     │
  │                                                     ▼
  │                                    UPDATE recordings SET transcript, status='done'
  │                                                     │
  └─ RecordingCard  ◄──── polling (5s) ─────────────────┘
        ├─ "텍스트 보기" → 모달
        └─ "재생" → Drive iframe
```

### 7.2 핵심 결정
- **STT 시점**: 업로드 성공 직후 서버 비동기 trigger (클라이언트 awaiting 안 함)
- **키 저장**: Supabase Vault (`vault.secrets`) — pgsodium 기반
- **키 조회**: `SECURITY DEFINER` RPC 함수로 서버에서만 decrypt
- **캐싱**: 1회 STT → `recordings.transcript` 컬럼 저장 → 공유자는 그대로 읽기
- **재생**: `https://drive.google.com/file/d/{drive_file_id}/preview` iframe

---

## 8. Timeline Estimate

총 예상 공수: **3.5일 (~28h)**

| 단계 | 작업 | 공수 |
|---|---|---|
| 1 | DB 스키마 (users.vault_key_id, recordings.transcript*) + 마이그레이션 | 2h |
| 2 | Supabase Vault RPC (encrypt/decrypt/check) | 3h |
| 3 | 프로필 페이지 API 키 등록 UI + API | 3h |
| 4 | Gemini SDK 통합 + STT 서비스 유닛 | 4h |
| 5 | 업로드 성공 후 자동 STT trigger 훅 | 2h |
| 6 | RecordingPanel 상태·텍스트 모달·재생 iframe | 4h |
| 7 | 재시도 버튼 + 에러 메시지 매핑 | 2h |
| 8 | 테스트 (유닛 + E2E) | 5h |
| 9 | 동의 문구 수정 + 문서 | 1h |
| 10 | Design 문서 + Plan 피드백 반영 | 2h |

---

## 9. Open Questions

- (추후) 텍스트 전문 검색 기능 필요한가? — 현재 Plan에서는 제외, 별도 PDCA
- (추후) 화자 분리(고객/담당자) 필요한가? — Gemini 프롬프트로 일부 지원 가능하나 이번 Plan 제외
- 일일 실패 녹취 대시보드는 별도 기능으로 둘지, 이번에 간단히라도 포함할지

---

## 10. Next Step

`/pdca design recording-stt` — Design 문서에서 DB 스키마, API 스펙, 컴포넌트 구조, 3가지 아키텍처 옵션을 구체화합니다.
