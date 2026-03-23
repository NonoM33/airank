import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MentionHighlight } from '@/components/dashboard/MentionHighlight'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MentionHighlight — plain text', () => {
  it('renders text without brand as plain text with no highlight spans', () => {
    const { container } = render(
      <MentionHighlight text="Voici un texte normal sans marque." brandName="Acme" competitors={[]} />,
    )
    expect(container.querySelector('[data-testid="highlight-brand"]')).toBeNull()
    expect(container.querySelector('[data-testid="highlight-competitor"]')).toBeNull()
    expect(container.querySelector('[data-testid="highlight-negative"]')).toBeNull()
    expect(screen.getByText(/texte normal/)).toBeInTheDocument()
  })

  it('renders empty text without crashing', () => {
    const { container } = render(
      <MentionHighlight text="" brandName="Acme" competitors={[]} />,
    )
    expect(container.firstChild).toBeTruthy()
  })
})

describe('MentionHighlight — brand highlighting', () => {
  it('wraps the brand name in a green highlight span', () => {
    render(
      <MentionHighlight
        text="Nous recommandons Acme pour ce projet."
        brandName="Acme"
        competitors={[]}
      />,
    )
    const brandSpan = screen.getByTestId('highlight-brand')
    expect(brandSpan).toBeInTheDocument()
    expect(brandSpan).toHaveTextContent('Acme')
    expect(brandSpan.className).toContain('emerald')
  })

  it('highlights brand case-insensitively', () => {
    render(
      <MentionHighlight text="acme est excellent." brandName="Acme" competitors={[]} />,
    )
    expect(screen.getByTestId('highlight-brand')).toHaveTextContent('acme')
  })

  it('highlights multiple occurrences of the brand', () => {
    render(
      <MentionHighlight
        text="Acme est bien. acme domine le marché."
        brandName="Acme"
        competitors={[]}
      />,
    )
    const spans = screen.getAllByTestId('highlight-brand')
    expect(spans.length).toBe(2)
  })
})

describe('MentionHighlight — competitor highlighting', () => {
  it('wraps competitor name in an orange highlight span', () => {
    render(
      <MentionHighlight
        text="Nous recommandons Rival pour ce projet."
        brandName="Acme"
        competitors={['Rival']}
      />,
    )
    const compSpan = screen.getByTestId('highlight-competitor')
    expect(compSpan).toBeInTheDocument()
    expect(compSpan).toHaveTextContent('Rival')
    expect(compSpan.className).toContain('orange')
  })

  it('highlights multiple competitors', () => {
    render(
      <MentionHighlight
        text="CompA et CompB sont recommandés."
        brandName="Acme"
        competitors={['CompA', 'CompB']}
      />,
    )
    const spans = screen.getAllByTestId('highlight-competitor')
    expect(spans.length).toBe(2)
  })

  it('highlights competitor case-insensitively', () => {
    render(
      <MentionHighlight
        text="rival est souvent cité."
        brandName="Acme"
        competitors={['Rival']}
      />,
    )
    expect(screen.getByTestId('highlight-competitor')).toHaveTextContent('rival')
  })
})

describe('MentionHighlight — negative keyword highlighting', () => {
  it('wraps a negative keyword in a red highlight span', () => {
    render(
      <MentionHighlight
        text="Ce produit est mauvais selon les tests."
        brandName="Acme"
        competitors={[]}
      />,
    )
    const negSpan = screen.getByTestId('highlight-negative')
    expect(negSpan).toBeInTheDocument()
    expect(negSpan).toHaveTextContent('mauvais')
    expect(negSpan.className).toContain('red')
  })

  it('highlights "problème" as a negative keyword', () => {
    render(
      <MentionHighlight text="Il y a un problème avec cela." brandName="Acme" competitors={[]} />,
    )
    expect(screen.getByTestId('highlight-negative')).toHaveTextContent('problème')
  })

  it('highlights "déconseille" as a negative keyword', () => {
    render(
      <MentionHighlight text="On déconseille cette option." brandName="Acme" competitors={[]} />,
    )
    expect(screen.getByTestId('highlight-negative')).toHaveTextContent('déconseille')
  })
})

describe('MentionHighlight — maxLength', () => {
  it('truncates text to maxLength characters and appends ellipsis', () => {
    const longText = 'Acme est une très longue description qui dépasse la limite fixée par le paramètre.'
    const { container } = render(
      <MentionHighlight text={longText} brandName="Acme" competitors={[]} maxLength={20} />,
    )
    // The outer span wraps all tokens — its full text content must contain the ellipsis
    const fullText = container.textContent ?? ''
    expect(fullText).toContain('…')
  })

  it('does not truncate when text is shorter than maxLength', () => {
    const text = 'Acme est bien.'
    render(<MentionHighlight text={text} brandName="Acme" competitors={[]} maxLength={100} />)
    const container = screen.getByText('Acme', { exact: false }).closest('span')!
    expect(container.textContent).not.toContain('…')
  })
})

describe('MentionHighlight — combined brand + competitor', () => {
  it('highlights both brand and competitor in the same text', () => {
    render(
      <MentionHighlight
        text="Acme et Rival sont tous les deux recommandés."
        brandName="Acme"
        competitors={['Rival']}
      />,
    )
    expect(screen.getByTestId('highlight-brand')).toHaveTextContent('Acme')
    expect(screen.getByTestId('highlight-competitor')).toHaveTextContent('Rival')
  })
})
