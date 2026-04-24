/**
 * TC: 메시지 템플릿 변수 치환 전체 흐름
 *
 * 흐름: 자료실 템플릿 등록 → 고객 상세 페이지 → 우측 패널 열기 → 변수 치환 → 클릭 복사
 *
 * 변수 포맷: {변수명}  (중괄호)
 * 지원 변수: 고객명, 고객, 이름, 성함, 나이, 직업, 상세직업, 직업상세, 성별, 전화, 전화번호
 */

import { describe, it, expect } from 'vitest'
import { renderTemplate, extractVariables } from './renderTemplate'

// ─────────────────────────────────────────────
// TC-1: 기본 단일 변수 치환
// ─────────────────────────────────────────────
describe('TC-1 기본 단일 변수 치환', () => {
  it('TC-1-1: {고객명} → 이름으로 치환', () => {
    expect(renderTemplate('{고객명}님, 안녕하세요?', { 고객명: '김철수' }))
      .toBe('김철수님, 안녕하세요?')
  })

  it('TC-1-2: {고객} → 이름으로 치환 (alias)', () => {
    expect(renderTemplate('{고객}님, 안녕하세요?', { 고객: '김철수' }))
      .toBe('김철수님, 안녕하세요?')
  })

  it('TC-1-3: {이름} → 이름으로 치환 (alias)', () => {
    expect(renderTemplate('{이름}님, 반갑습니다.', { 이름: '이영희' }))
      .toBe('이영희님, 반갑습니다.')
  })

  it('TC-1-4: {나이} → 숫자 치환', () => {
    expect(renderTemplate('{나이}세이시군요.', { 나이: 45 }))
      .toBe('45세이시군요.')
  })

  it('TC-1-5: {직업} → 직업 치환', () => {
    expect(renderTemplate('현재 {직업}으로 일하고 계시죠?', { 직업: '교사' }))
      .toBe('현재 교사으로 일하고 계시죠?')
  })

  it('TC-1-6: {성별} → 남/여 치환', () => {
    expect(renderTemplate('{성별}성 고객님', { 성별: '남' }))
      .toBe('남성 고객님')
  })

  it('TC-1-7: {전화번호} → 전화 치환', () => {
    expect(renderTemplate('연락처: {전화번호}', { 전화번호: '010-1234-5678' }))
      .toBe('연락처: 010-1234-5678')
  })
})

// ─────────────────────────────────────────────
// TC-2: 복합 변수 치환 (실제 템플릿 시나리오)
// ─────────────────────────────────────────────
describe('TC-2 복합 변수 치환 (실제 템플릿)', () => {
  const fullVars = {
    고객명: '김철수',
    고객: '김철수',
    이름: '김철수',
    나이: 45,
    직업: '교사',
    상세직업: '초등학교 교사',
    성별: '남',
    전화: '010-1234-5678',
    전화번호: '010-1234-5678',
  }

  it('TC-2-1: 개발자 인사 템플릿 (이름+나이)', () => {
    const body = '{고객명}님, 안녕하세요?\n저는 토스 남운영 매니저입니다.\n{나이}세이신 {고객명}님께 맞는 보험을 안내드리려고요.'
    expect(renderTemplate(body, fullVars))
      .toBe('김철수님, 안녕하세요?\n저는 토스 남운영 매니저입니다.\n45세이신 김철수님께 맞는 보험을 안내드리려고요.')
  })

  it('TC-2-2: 직업 기반 제안 템플릿', () => {
    const body = '{직업} 분들께 특화된 보험이 있어 연락드렸습니다, {고객명}님!'
    expect(renderTemplate(body, fullVars))
      .toBe('교사 분들께 특화된 보험이 있어 연락드렸습니다, 김철수님!')
  })

  it('TC-2-3: 여러 변수 반복 사용', () => {
    const body = '{고객명}님 ({나이}세, {직업}), 안녕하세요! {고객명}님께 좋은 소식이 있어요.'
    expect(renderTemplate(body, fullVars))
      .toBe('김철수님 (45세, 교사), 안녕하세요! 김철수님께 좋은 소식이 있어요.')
  })

  it('TC-2-4: {고객}과 {고객명} 동시 사용', () => {
    const body = '{고객}님 ({고객명}), 안녕하세요!'
    expect(renderTemplate(body, fullVars))
      .toBe('김철수님 (김철수), 안녕하세요!')
  })
})

// ─────────────────────────────────────────────
// TC-3: 누락 데이터 처리 (고객 정보 없는 경우)
// ─────────────────────────────────────────────
describe('TC-3 누락 데이터 처리', () => {
  it('TC-3-1: vars가 빈 객체면 원본 유지', () => {
    const body = '{고객명}님, 안녕하세요?'
    expect(renderTemplate(body, {})).toBe('{고객명}님, 안녕하세요?')
  })

  it('TC-3-2: 특정 변수값이 빈 문자열이면 원본 변수명 유지', () => {
    const body = '{나이}세이시군요.'
    expect(renderTemplate(body, { 나이: '' })).toBe('{나이}세이시군요.')
  })

  it('TC-3-3: 고객명만 있고 나이 없을 때 — 나이 변수 미치환', () => {
    const body = '{고객명}님 ({나이}세)'
    expect(renderTemplate(body, { 고객명: '김철수', 고객: '김철수' }))
      .toBe('김철수님 ({나이}세)')
  })

  it('TC-3-4: 변수가 없는 일반 텍스트는 그대로 반환', () => {
    const body = '안녕하세요, 반갑습니다!'
    expect(renderTemplate(body, { 고객명: '김철수' })).toBe('안녕하세요, 반갑습니다!')
  })

  it('TC-3-5: 빈 본문은 빈 문자열 반환', () => {
    expect(renderTemplate('', { 고객명: '김철수' })).toBe('')
  })
})

// ─────────────────────────────────────────────
// TC-4: extractVariables — 변수 감지
// ─────────────────────────────────────────────
describe('TC-4 extractVariables', () => {
  it('TC-4-1: 단일 변수 추출', () => {
    expect(extractVariables('{고객명}님, 안녕하세요?')).toEqual(['고객명'])
  })

  it('TC-4-2: 복수 변수 추출', () => {
    const vars = extractVariables('{고객명}님 ({나이}세, {직업})')
    expect(vars).toContain('고객명')
    expect(vars).toContain('나이')
    expect(vars).toContain('직업')
    expect(vars.length).toBe(3)
  })

  it('TC-4-3: 중복 변수는 한 번만 추출', () => {
    expect(extractVariables('{고객명}님 {고객명}님')).toEqual(['고객명'])
  })

  it('TC-4-4: 변수 없는 텍스트는 빈 배열', () => {
    expect(extractVariables('안녕하세요!')).toEqual([])
  })

  it('TC-4-5: 공백 포함 변수명도 trim 처리', () => {
    expect(extractVariables('{ 고객명 }님')).toEqual(['고객명'])
  })
})

// ─────────────────────────────────────────────
// TC-5: 패널 vars 매핑 — TemplatesTab 로직 검증
// (CustomerVars → renderTemplate vars 변환)
// ─────────────────────────────────────────────
describe('TC-5 패널 고객 vars 매핑 검증', () => {
  function buildTemplateVars(cv: {
    name: string
    age: number | null
    job: string | null
    jobDetail: string | null
    gender: string | null
    phone: string | null
  }) {
    const genderLabel = cv.gender === 'M' ? '남' : cv.gender === 'F' ? '여' : ''
    return {
      고객명: cv.name, 고객: cv.name, 이름: cv.name, 성함: cv.name,
      나이: cv.age ?? '',
      직업: cv.job ?? '',
      상세직업: cv.jobDetail ?? cv.job ?? '',
      직업상세: cv.jobDetail ?? cv.job ?? '',
      성별: genderLabel,
      전화: cv.phone ?? '',
      전화번호: cv.phone ?? '',
    }
  }

  it('TC-5-1: 전체 정보 고객 — 모든 변수 치환 성공', () => {
    const cv = { name: '김철수', age: 45, job: '교사', jobDetail: '초등학교 교사', gender: 'M', phone: '010-1234-5678' }
    const vars = buildTemplateVars(cv)
    const body = '{고객명}님 ({나이}세, {직업}), {성별}성, {전화번호}'
    expect(renderTemplate(body, vars))
      .toBe('김철수님 (45세, 교사), 남성, 010-1234-5678')
  })

  it('TC-5-2: 나이/직업 없는 고객 — 빈 문자열 값이면 원본 변수명 유지', () => {
    // renderTemplate: value가 ''이면 match(원본) 반환 → {나이} 그대로 남음
    const cv = { name: '이영희', age: null, job: null, jobDetail: null, gender: 'F', phone: null }
    const vars = buildTemplateVars(cv)
    const body = '{고객명}님 ({나이}세, {직업})'
    expect(renderTemplate(body, vars))
      .toBe('이영희님 ({나이}세, {직업})')
  })

  it('TC-5-3: 이름만 있는 경우 (패널을 ]키로 열었을 때)', () => {
    const simpleVars = { 고객명: '박지민', 고객: '박지민', 이름: '박지민', 성함: '박지민' }
    expect(renderTemplate('{고객}님, 안녕하세요?', simpleVars))
      .toBe('박지민님, 안녕하세요?')
  })

  it('TC-5-4: 상세직업 없으면 직업으로 대체', () => {
    const cv = { name: '최민준', age: 30, job: '의사', jobDetail: null, gender: 'M', phone: null }
    const vars = buildTemplateVars(cv)
    expect(renderTemplate('{상세직업}', vars)).toBe('의사')
  })
})

// ─────────────────────────────────────────────
// TC-6: 엣지 케이스
// ─────────────────────────────────────────────
describe('TC-6 엣지 케이스', () => {
  it('TC-6-1: 중괄호 없는 일반 괄호 (고객명)은 치환 안 됨', () => {
    // (고객명) 형식은 지원 안 함 — {고객명} 사용 필요
    expect(renderTemplate('(고객명)님', { 고객명: '김철수' }))
      .toBe('(고객명)님')
  })

  it('TC-6-2: 줄바꿈 포함 멀티라인 템플릿', () => {
    const body = '{고객명}님, 안녕하세요!\n저는 남운영 매니저입니다.\n{나이}세이신 {고객명}님께 연락드립니다.'
    const vars = { 고객명: '김철수', 고객: '김철수', 나이: 45 }
    expect(renderTemplate(body, vars))
      .toBe('김철수님, 안녕하세요!\n저는 남운영 매니저입니다.\n45세이신 김철수님께 연락드립니다.')
  })

  it('TC-6-3: 미등록 변수는 원본 유지', () => {
    // {미지원변수}는 치환 없이 그대로 출력
    expect(renderTemplate('{미지원변수}', { 고객명: '김철수' }))
      .toBe('{미지원변수}')
  })
})
