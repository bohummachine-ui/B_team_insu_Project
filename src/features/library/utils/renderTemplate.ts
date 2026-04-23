// Design Ref: §5 — 메시지 템플릿 변수 치환 (Plan FR-06)
// 우측 패널(module-7)에서도 재사용

export interface TemplateVariables {
  고객명?: string
  나이?: string | number
  직업?: string
  [key: string]: string | number | undefined
}

const VARIABLE_PATTERN = /\{([^}]+)\}/g

export function renderTemplate(body: string, vars: TemplateVariables = {}): string {
  return body.replace(VARIABLE_PATTERN, (match, key: string) => {
    const trimmed = key.trim()
    const value = vars[trimmed]
    return value !== undefined && value !== '' ? String(value) : match
  })
}

export function extractVariables(body: string): string[] {
  const set = new Set<string>()
  let match: RegExpExecArray | null
  const re = new RegExp(VARIABLE_PATTERN.source, 'g')
  while ((match = re.exec(body)) !== null) {
    set.add(match[1].trim())
  }
  return Array.from(set)
}
