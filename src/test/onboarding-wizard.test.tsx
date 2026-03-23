import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  // Default: all fetch calls succeed
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, id: 'brand-1' }),
  })
})

describe('OnboardingWizard — step 1', () => {
  it('renders step 1 by default with brand name input', () => {
    render(<OnboardingWizard onComplete={vi.fn()} />)
    expect(screen.getByTestId('brand-name-input')).toBeInTheDocument()
    expect(screen.getByTestId('brand-domain-input')).toBeInTheDocument()
  })

  it('shows step label "Votre marque"', () => {
    render(<OnboardingWizard onComplete={vi.fn()} />)
    expect(screen.getByText('Votre marque')).toBeInTheDocument()
  })

  it('next button disabled when brand name is empty', () => {
    render(<OnboardingWizard onComplete={vi.fn()} />)
    const nextBtn = screen.getByTestId('step1-next')
    expect(nextBtn).toBeDisabled()
  })

  it('next button enabled after typing brand name', () => {
    render(<OnboardingWizard onComplete={vi.fn()} />)
    const input = screen.getByTestId('brand-name-input')
    fireEvent.change(input, { target: { value: 'Acme Corp' } })
    expect(screen.getByTestId('step1-next')).not.toBeDisabled()
  })

  it('clicking next moves to step 2', () => {
    render(<OnboardingWizard onComplete={vi.fn()} />)
    const input = screen.getByTestId('brand-name-input')
    fireEvent.change(input, { target: { value: 'Acme Corp' } })
    fireEvent.click(screen.getByTestId('step1-next'))
    // Step 2 shows the sector grid
    expect(screen.getByTestId('sector-SaaS')).toBeInTheDocument()
  })
})

describe('OnboardingWizard — step 2', () => {
  function goToStep2() {
    render(<OnboardingWizard onComplete={vi.fn()} />)
    fireEvent.change(screen.getByTestId('brand-name-input'), { target: { value: 'Acme Corp' } })
    fireEvent.click(screen.getByTestId('step1-next'))
  }

  it('shows sector grid', () => {
    goToStep2()
    expect(screen.getByTestId('sector-SaaS')).toBeInTheDocument()
    expect(screen.getByTestId('sector-E-commerce')).toBeInTheDocument()
    expect(screen.getByTestId('sector-Santé')).toBeInTheDocument()
    expect(screen.getByTestId('sector-Finance')).toBeInTheDocument()
    expect(screen.getByTestId('sector-Autre')).toBeInTheDocument()
  })

  it('sector selection is visually highlighted', () => {
    goToStep2()
    const saasSector = screen.getByTestId('sector-SaaS')
    fireEvent.click(saasSector)
    expect(saasSector.className).toContain('text-primary')
  })

  it('next button disabled when no sector selected', () => {
    goToStep2()
    expect(screen.getByTestId('step2-next')).toBeDisabled()
  })

  it('next button enabled after sector selection', () => {
    goToStep2()
    fireEvent.click(screen.getByTestId('sector-SaaS'))
    expect(screen.getByTestId('step2-next')).not.toBeDisabled()
  })

  it('clicking next after selecting sector moves to step 3', () => {
    goToStep2()
    fireEvent.click(screen.getByTestId('sector-SaaS'))
    fireEvent.click(screen.getByTestId('step2-next'))
    // Step 3 shows the launch scan button
    expect(screen.getByTestId('launch-scan')).toBeInTheDocument()
  })
})

describe('OnboardingWizard — step 3', () => {
  function goToStep3() {
    render(<OnboardingWizard onComplete={vi.fn()} />)
    fireEvent.change(screen.getByTestId('brand-name-input'), { target: { value: 'Acme Corp' } })
    fireEvent.click(screen.getByTestId('step1-next'))
    fireEvent.click(screen.getByTestId('sector-SaaS'))
    fireEvent.click(screen.getByTestId('step2-next'))
  }

  it('shows brand name in step 3', () => {
    goToStep3()
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument()
  })

  it('shows suggested queries for the selected sector', () => {
    goToStep3()
    expect(screen.getByText(/meilleur logiciel SaaS/)).toBeInTheDocument()
  })

  it('shows launch scan button and skip button', () => {
    goToStep3()
    expect(screen.getByTestId('launch-scan')).toBeInTheDocument()
    expect(screen.getByTestId('skip-button')).toBeInTheDocument()
  })
})

describe('OnboardingWizard — skip button', () => {
  it('clicking skip on step 3 calls onComplete', async () => {
    const onComplete = vi.fn()
    render(<OnboardingWizard onComplete={onComplete} />)
    // Navigate to step 3
    fireEvent.change(screen.getByTestId('brand-name-input'), { target: { value: 'Acme Corp' } })
    fireEvent.click(screen.getByTestId('step1-next'))
    fireEvent.click(screen.getByTestId('sector-SaaS'))
    fireEvent.click(screen.getByTestId('step2-next'))

    fireEvent.click(screen.getByTestId('skip-button'))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })

  it('clicking X button (close) on step 1 calls onComplete', async () => {
    const onComplete = vi.fn()
    render(<OnboardingWizard onComplete={onComplete} />)
    fireEvent.click(screen.getByLabelText("Ignorer l'onboarding"))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })
})
