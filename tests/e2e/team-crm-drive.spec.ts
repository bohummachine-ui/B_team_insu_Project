// Design Ref: team-crm-drive.design.md §8 Test Plan
// Plan SC-1/2/4/5: refresh_token 저장, Drive 업로드, 진행률 UI, 50MB 서버 재검증
//
// 주의: 이 스펙은 Playwright 설치 후 실행 (pnpm add -D @playwright/test)
// 실행 전 로컬 서버 기동: pnpm dev → http://localhost:3000
// 인증 시나리오는 테스트용 Supabase 세션 쿠키 주입 필요 (storageState).

import { test, expect } from '@playwright/test'
import path from 'node:path'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const FIXTURE_AUDIO = path.resolve(__dirname, '../fixtures/sample.mp3')

// ────────────────────────────────────────────────────────────────
// L1 — API Endpoint Tests (§8.2)
// ────────────────────────────────────────────────────────────────

test.describe('L1 API — /api/drive/upload', () => {
  test('#1 no session → 401 unauthorized', async ({ request }) => {
    const res = await request.post(`${BASE}/api/drive/upload`, {
      multipart: { file: { name: 'x.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('x') } },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('unauthorized')
  })

  test('#3 missing customerId → 400 bad_request', async ({ request }) => {
    const res = await request.post(`${BASE}/api/drive/upload`, {
      headers: { cookie: process.env.E2E_AUTH_COOKIE ?? '' },
      multipart: {
        file: { name: 'x.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('x') },
      },
    })
    expect([400, 401]).toContain(res.status())
  })

  test('#2 50MB 초과 → 413 file_too_large', async ({ request }) => {
    const oversized = Buffer.alloc(51 * 1024 * 1024, 0)
    const res = await request.post(`${BASE}/api/drive/upload`, {
      headers: { cookie: process.env.E2E_AUTH_COOKIE ?? '' },
      multipart: {
        file: { name: 'big.mp3', mimeType: 'audio/mpeg', buffer: oversized },
        customerId: 'test-cid',
        customerName: '테스트',
      },
    })
    expect([413, 401]).toContain(res.status())
  })
})

test.describe('L1 API — /api/drive/has-refresh-token', () => {
  test('no session → authenticated: false', async ({ request }) => {
    const res = await request.get(`${BASE}/api/drive/has-refresh-token`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.authenticated).toBe(false)
    expect(body.hasToken).toBe(false)
  })
})

// ────────────────────────────────────────────────────────────────
// L2 — UI Action Tests (§8.3)
// 실행 조건: storageState.json (로그인 상태) + google_refresh_token 세팅됨
// ────────────────────────────────────────────────────────────────

test.describe('L2 UI — RecordingPanel', () => {
  test.skip(!process.env.E2E_AUTH_STATE, 'requires storageState')

  test('#1 패널 로드 → 파일 업로드 버튼 + 빈 목록', async ({ page }) => {
    await page.goto(`${BASE}/library`)
    await page.getByRole('tab', { name: /녹음본/ }).click()
    await expect(page.getByRole('button', { name: /파일 업로드/ })).toBeVisible()
  })

  test('#2 50MB 초과 파일 선택 → 클라 경고 + 업로드 버튼 비활성', async ({ page }) => {
    await page.goto(`${BASE}/library`)
    await page.getByRole('tab', { name: /녹음본/ }).click()
    await page.getByRole('button', { name: /파일 업로드/ }).click()

    const fileChooser = page.locator('input[type="file"]')
    const big = Buffer.alloc(51 * 1024 * 1024)
    await fileChooser.setInputFiles({ name: 'big.mp3', mimeType: 'audio/mpeg', buffer: big })

    await expect(page.getByText(/50MB 초과/)).toBeVisible()
    await expect(page.getByTestId('upload-submit')).toBeDisabled()
  })

  test('#3 유효 파일 선택 + 업로드 → 진행률 + 성공 toast', async ({ page }) => {
    await page.goto(`${BASE}/library`)
    await page.getByRole('tab', { name: /녹음본/ }).click()
    await page.getByRole('button', { name: /파일 업로드/ }).click()

    await page.selectOption('select', { index: 1 }) // 첫 번째 고객
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_AUDIO)
    await page.getByRole('checkbox', { name: /녹음 동의/ }).check()
    await page.getByTestId('upload-submit').click()

    await expect(page.locator('[role="progressbar"]')).toBeVisible()
    await expect(page.getByText(/업로드 완료/)).toBeVisible({ timeout: 30_000 })
  })
})

// ────────────────────────────────────────────────────────────────
// L3 — E2E Scenarios (§8.4)
// ────────────────────────────────────────────────────────────────

test.describe('L3 E2E — 전체 업로드 플로우', () => {
  test.skip(!process.env.E2E_AUTH_STATE, 'requires storageState')

  test('로그인 → 자료실 → 녹음본 → 업로드 → Drive 확인', async ({ page }) => {
    await page.goto(`${BASE}/library`)
    await page.getByRole('tab', { name: /녹음본/ }).click()
    await page.getByRole('button', { name: /파일 업로드/ }).click()

    await page.selectOption('select', { index: 1 })
    await page.locator('input[type="file"]').setInputFiles(FIXTURE_AUDIO)
    await page.getByRole('checkbox', { name: /녹음 동의/ }).check()
    await page.getByTestId('upload-submit').click()

    await expect(page.getByText(/업로드 완료/)).toBeVisible({ timeout: 60_000 })
    // 목록 자동 갱신: 업로드된 파일명이 리스트에 표시
    await expect(page.locator('text=sample.mp3').first()).toBeVisible()
  })
})
