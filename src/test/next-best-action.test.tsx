import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextBestAction } from '@/components/dashboard/NextBestAction'

const BRAND_NAME = 'Acme'

describe('NextBestAction — no scans', () => {
  it('shows "Lancez votre premier scan" when scans array is empty', () => {
    render(<NextBestAction scans={[]} brandName={BRAND_NAME} plan="FREE" />)
    expect(screen.getByText(/Lancez votre premier scan/)).toBeInTheDocument()
  })

  it('includes brand name in description', () => {
    render(<NextBestAction scans={[]} brandName={BRAND_NAME} plan="FREE" />)
    expect(screen.getByText(/Acme/)).toBeInTheDocument()
  })
})

describe('NextBestAction — score < 25 (invisible)', () => {
  const lowScan = { globalScore: 10, createdAt: new Date().toISOString() }

  it('shows invisible message when score is 10', () => {
    render(<NextBestAction scans={[lowScan]} brandName={BRAND_NAME} plan="FREE" />)
    expect(screen.getByText(/invisible pour l'IA/)).toBeInTheDocument()
  })

  it('shows invisible message when score is 0', () => {
    const scan = { globalScore: 0, createdAt: new Date().toISOString() }
    render(<NextBestAction scans={[scan]} brandName={BRAND_NAME} plan="FREE" />)
    expect(screen.getByText(/invisible pour l'IA/)).toBeInTheDocument()
  })

  it('shows invisible message when score is exactly 24', () => {
    const scan = { globalScore: 24, createdAt: new Date().toISOString() }
    render(<NextBestAction scans={[scan]} brandName={BRAND_NAME} plan="FREE" />)
    expect(screen.getByText(/invisible pour l'IA/)).toBeInTheDocument()
  })

  it('suggests FAQ content for invisible brand', () => {
    render(<NextBestAction scans={[lowScan]} brandName={BRAND_NAME} plan="FREE" />)
    expect(screen.getByText(/FAQ/)).toBeInTheDocument()
  })
})

describe('NextBestAction — score 25-49 (peu visible)', () => {
  const mediumScan = { globalScore: 35, createdAt: new Date().toISOString() }

  it('shows "peu visible" message when score is 35', () => {
    render(<NextBestAction scans={[mediumScan]} brandName={BRAND_NAME} plan="FREE" />)
    expect(screen.getByText(/peu visible/i)).toBeInTheDocument()
  })

  it('shows "peu visible" message when score is exactly 25', () => {
    const scan = { globalScore: 25, createdAt: new Date().toISOString() }
    render(<NextBestAction scans={[scan]} brandName={BRAND_NAME} plan="FREE" />)
    expect(screen.getByText(/peu visible/i)).toBeInTheDocument()
  })

  it('shows "peu visible" message when score is exactly 49', () => {
    const scan = { globalScore: 49, createdAt: new Date().toISOString() }
    render(<NextBestAction scans={[scan]} brandName={BRAND_NAME} plan="FREE" />)
    expect(screen.getByText(/peu visible/i)).toBeInTheDocument()
  })

  it('suggests comparative article for semi-visible brand', () => {
    render(<NextBestAction scans={[mediumScan]} brandName={BRAND_NAME} plan="FREE" />)
    expect(screen.getByText(/comparatif/)).toBeInTheDocument()
  })
})

describe('NextBestAction — score >= 50 (good visibility)', () => {
  it('shows maintenance message for high score', () => {
    const scan = { globalScore: 75, createdAt: new Date().toISOString() }
    render(<NextBestAction scans={[scan]} brandName={BRAND_NAME} plan="FREE" />)
    // Should show a positive/maintenance action
    expect(screen.getByTestId('next-best-action')).toBeInTheDocument()
  })
})

describe('NextBestAction — action recommended label', () => {
  it('always shows "Action recommandée" label', () => {
    render(<NextBestAction scans={[]} brandName={BRAND_NAME} plan="FREE" />)
    expect(screen.getByText(/Action recommandée/i)).toBeInTheDocument()
  })
})
