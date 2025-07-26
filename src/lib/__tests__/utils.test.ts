import { cn } from '../utils'

describe('utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('base-class', 'additional-class')
      expect(result).toContain('base-class')
      expect(result).toContain('additional-class')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toContain('base-class')
      expect(result).toContain('active-class')
    })

    it('should handle false conditional classes', () => {
      const isActive = false
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toContain('base-class')
      expect(result).not.toContain('active-class')
    })

    it('should handle undefined and null values', () => {
      const result = cn('base-class', undefined, null, 'valid-class')
      expect(result).toContain('base-class')
      expect(result).toContain('valid-class')
    })

    it('should handle empty strings', () => {
      const result = cn('base-class', '', 'valid-class')
      expect(result).toContain('base-class')
      expect(result).toContain('valid-class')
    })

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
      expect(result).toContain('class3')
    })

    it('should handle objects with boolean values', () => {
      const result = cn({
        'active': true,
        'disabled': false,
        'visible': true
      })
      expect(result).toContain('active')
      expect(result).not.toContain('disabled')
      expect(result).toContain('visible')
    })

    it('should merge Tailwind classes correctly', () => {
      // This tests the tailwind-merge functionality
      const result = cn('px-4 py-2', 'px-6')
      // Should keep the last px value (px-6) and py-2
      expect(result).toContain('px-6')
      expect(result).toContain('py-2')
      expect(result).not.toContain('px-4')
    })

    it('should handle complex combinations', () => {
      const isActive = true
      const isDisabled = false
      const variant = 'primary'
      
      const result = cn(
        'base-button',
        {
          'active': isActive,
          'disabled': isDisabled
        },
        variant === 'primary' && 'btn-primary',
        'additional-class'
      )
      
      expect(result).toContain('base-button')
      expect(result).toContain('active')
      expect(result).not.toContain('disabled')
      expect(result).toContain('btn-primary')
      expect(result).toContain('additional-class')
    })
  })
})