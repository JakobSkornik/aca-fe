/**
 * UI Helper class for consistent styling across components
 */
export class UIHelpers {
  /**
   * Get CSS classes for a selected/active move
   */
  static getSelectedMoveClasses(isSelected: boolean): string {
    if (isSelected) {
      return `
        border-2 border-blue-500 ring-2 ring-blue-400 shadow-xl
        transform scale-105 z-10 relative
        text-base font-bold
      `
        .replace(/\s+/g, ' ')
        .trim()
    }

    return `
      border border-dark-gray
      text-sm
    `
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Get background color for moves
   */
  static getMoveBackgroundColor(
    isSelected: boolean,
    isWhiteMove: boolean
  ): string {
    if (isSelected) {
      return 'bg-blue-500' // blue-500
    }

    return isWhiteMove ? 'bg-white' : 'bg-lightest-gray'
  }

  /**
   * Get text color for moves
   */
  static getMoveTextColor(isSelected: boolean): string {
    return isSelected ? 'text-white' : 'text-darkest-gray'
  }

  /**
   * Get piece image size based on selection state
   */
  static getPieceImageSize(isSelected: boolean): { width: number; height: number } {
    return isSelected ? { width: 20, height: 20 } : { width: 16, height: 16 }
  }
  /**
   * Get CSS classes for PV moves in horizontal list
   */
  static getPvMoveClasses(isActive: boolean): string {
    const baseClasses = `
      w-full h-full px-2 py-1 rounded text-xs cursor-pointer border
      flex items-center justify-start text-left transition-all duration-200
    `
      .replace(/\s+/g, ' ')
      .trim()

    if (isActive) {
      return `${baseClasses} ${this.getSelectedMoveClasses(true)}`
    }

    return `${baseClasses} border-dark-gray`
  }

  /**
   * Get background color for PV moves
   */
  static getPvMoveBackgroundColor(
    isActive: boolean,
    isWhiteMove: boolean
  ): string {
    if (isActive) {
      return this.getMoveBackgroundColor(true, isWhiteMove)
    }

    return isWhiteMove ? 'bg-lightest-gray' : 'bg-light-gray'
  }
  /**
   * Get CSS classes for main moves in horizontal list
   */
  static getMainMoveClasses(isSelected: boolean): string {
    const baseClasses = `
      w-full h-[40px] px-3 py-2 rounded-md cursor-pointer border
      flex items-center justify-start text-left transition-all duration-200
      hvr-shadow`
      .replace(/\s+/g, ' ')
      .trim()

    if (isSelected) {
      return `${baseClasses} ${this.getSelectedMoveClasses(true)}`
    }

    return `${baseClasses} border-dark-gray hover:border-darkest-gray`
  }
  /**
   * Get CSS classes for moves in the vertical GameViewer list
   */
  static getGameViewerMoveClasses(isSelected: boolean): string {
    const baseClasses = `
      move-item px-3 py-2 cursor-pointer rounded-md border
      flex items-center justify-between transition-all duration-200
      hover:shadow-md    `
      .replace(/\s+/g, ' ')
      .trim()

    if (isSelected) {
      return `${baseClasses} ${this.getSelectedMoveClasses(true)}`
    }

    return `${baseClasses} border-light-gray hover:border-dark-gray`
  }

  /**
   * Scroll element into view smoothly
   */
  static scrollIntoView(element: HTMLElement, container?: HTMLElement): void {
    if (container) {
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()

      const isInView =
        elementRect.left >= containerRect.left &&
        elementRect.right <= containerRect.right

      if (!isInView) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        })
      }
    } else {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }

  /**
   * Get container classes for move lists
   */
  static getMoveListContainerClasses(): string {
    return `
      flex items-start space-x-1 overflow-x-auto p-2 rounded-md w-full
      scrollbar-thin scrollbar-thumb-dark-gray scrollbar-track-light-gray
    `
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Get classes for move column containers
   */
  static getMoveColumnClasses(): string {
    return `
      flex flex-col items-start min-w-[100px] flex-shrink-0
    `
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Get classes for standard buttons
   */
  static getButtonClasses(): string {
    return `
      px-3 py-1 rounded-md text-white bg-darkest-gray hvr-shadow hover:bg-dark-gray
    `
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Get classes for icon buttons
   */
  static getIconButtonClasses(): string {
    return `
      hvr-shadow rounded-full text-white bg-darkest-gray p-2 hover:bg-dark-gray
    `
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Get classes for primary action buttons
   */
  static getPrimaryButtonClasses(disabled = false): string {
    const base = `py-2 px-4 rounded-md text-white`
      .replace(/\s+/g, ' ')
      .trim()
    if (disabled) {
      return `${base} bg-dark-gray cursor-not-allowed`
    }
    return `${base} bg-darkest-gray hover:bg-dark-gray hvr-shadow`
  }

  /**
   * Get classes for text buttons
   */
  static getTextButtonClasses(): string {
    return `
      text-sm text-blue-600 hover:text-blue-800
    `
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Get CSS classes for move colors based on white/black move
   * @param isSelected Whether the move is selected/active
   * @param isWhiteMove Whether it's a white move
   * @returns Object containing background and text color classes
   */
  static getMoveColors(isSelected: boolean, isWhiteMove: boolean): { bg: string; text: string } {
    if (isSelected) {
      return {
        bg: 'bg-blue-500',
        text: 'text-white'
      }
    }
    
    return isWhiteMove 
      ? { bg: 'bg-lightest-gray', text: 'text-darkest-gray' }
      : { bg: 'bg-darkest-gray', text: 'text-lightest-gray' }
  }

  /**
   * Get CSS classes for PV move colors
   * @param isActive Whether the PV move is active/hovered
   * @param isWhiteMove Whether it's a white move
   * @returns Object containing background and text color classes
   */
  static getPvMoveColors(isActive: boolean, isWhiteMove: boolean): { bg: string; text: string } {
    if (isActive) {
      return this.getMoveColors(true, isWhiteMove);
    }
    
    return isWhiteMove 
      ? { bg: 'bg-lightest-gray', text: 'text-darkest-gray' }
      : { bg: 'bg-darkest-gray', text: 'text-lightest-gray' }
  }
}
