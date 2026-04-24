// Design Ref: §5.5 — transcript_error 코드 → 한국어 UI 메시지 매핑
export function transcriptErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case 'no_api_key':
      return 'Gemini API 키가 등록되지 않았습니다. 설정에서 등록 후 재시도하세요.'
    case 'file_too_large':
      return '20MB 초과 파일은 STT할 수 없습니다.'
    case 'rate_limited':
      return '일일/분당 호출 한도를 초과했습니다. 잠시 후 재시도하세요.'
    case 'invalid_audio':
      return '지원하지 않는 오디오 형식입니다.'
    case 'invalid_key':
      return 'API 키가 유효하지 않습니다. 설정에서 확인하세요.'
    case 'drive_fetch_failed':
      return 'Drive 파일을 읽지 못했습니다. 공유 권한을 확인하세요.'
    case 'empty_result':
      return 'STT 결과가 비어있습니다. 오디오 내용을 확인하세요.'
    default:
      return 'STT에 실패했습니다. 재시도해주세요.'
  }
}
