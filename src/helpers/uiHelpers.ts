/**
 * Shared layout / motion helpers (design tokens via Tailwind).
 */
export class UIHelpers {
  static scrollIntoView(element: HTMLElement, container?: HTMLElement): void {
    if (container) {
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const isInView =
        elementRect.left >= containerRect.left && elementRect.right <= containerRect.right
      if (!isInView) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    } else {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }

  static getMoveListContainerClasses(): string {
    return 'flex w-full items-start overflow-x-auto rounded-md border border-border-tertiary bg-background-primary p-1'
  }

  /** PV chip colors: alternating white/black perspective in the line. */
  static getPvMoveColors(_isActive: boolean, isWhiteMove: boolean): { bg: string; text: string } {
    return isWhiteMove
      ? { bg: 'bg-background-secondary', text: 'text-text-primary' }
      : { bg: 'bg-text-primary', text: 'text-background-primary' }
  }

  /** Mainline move column cell (horizontal strip). */
  static getMoveColors(isSelected: boolean, isWhiteMove: boolean): { bg: string; text: string } {
    if (isSelected) {
      return { bg: 'bg-border-tertiary', text: 'text-text-primary' }
    }
    return isWhiteMove
      ? { bg: 'bg-transparent', text: 'text-text-primary' }
      : { bg: 'bg-background-secondary', text: 'text-text-primary' }
  }

  static getButtonClasses(): string {
    return 'inline-flex items-center justify-center rounded-md border border-border-secondary bg-background-primary px-2 py-1.5 text-text-primary shadow-sm hover:bg-background-secondary disabled:opacity-50'
  }

  static getIconButtonClasses(): string {
    return 'inline-flex items-center justify-center rounded-md border border-border-tertiary bg-background-secondary p-1.5 text-text-secondary hover:bg-background-primary disabled:opacity-50'
  }

  /** Primary CTA (dark fill, light text). Pair with native `disabled` on the button. */
  static getPrimaryButtonClasses(): string {
    return 'inline-flex w-full items-center justify-center rounded-md bg-text-primary px-4 py-2 text-sm font-medium text-background-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
  }
}
