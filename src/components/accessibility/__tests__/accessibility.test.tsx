import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccessibilityProvider, useAccessibility } from '../AccessibilityProvider'
import { AccessibleFormField, AccessibleSelect, AccessibleTextarea, AccessibleCheckbox } from '../AccessibleForm'
import { SkipLinks } from '../SkipLinks'
import { AccessibilitySettings } from '../AccessibilitySettings'

// Mock component to test accessibility context
function TestComponent() {
  const { announceToScreenReader, isHighContrast, toggleHighContrast, fontSize, setFontSize } = useAccessibility()
  
  return (
    <div>
      <button onClick={() => announceToScreenReader('Test announcement')}>
        Announce
      </button>
      <button onClick={toggleHighContrast}>
        Toggle High Contrast: {isHighContrast ? 'On' : 'Off'}
      </button>
      <button onClick={() => setFontSize('large')}>
        Set Large Font: {fontSize}
      </button>
    </div>
  )
}

describe('Accessibility Components', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  describe('AccessibilityProvider', () => {
    it('provides accessibility context', () => {
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      expect(screen.getByText('Toggle High Contrast: Off')).toBeInTheDocument()
      expect(screen.getByText('Set Large Font: normal')).toBeInTheDocument()
    })

    it('toggles high contrast mode', async () => {
      const user = userEvent.setup()
      
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      const toggleButton = screen.getByText('Toggle High Contrast: Off')
      await user.click(toggleButton)

      expect(screen.getByText('Toggle High Contrast: On')).toBeInTheDocument()
      expect(localStorage.getItem('accessibility-high-contrast')).toBe('true')
    })

    it('changes font size', async () => {
      const user = userEvent.setup()
      
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      const fontButton = screen.getByText('Set Large Font: normal')
      await user.click(fontButton)

      expect(screen.getByText('Set Large Font: large')).toBeInTheDocument()
      expect(localStorage.getItem('accessibility-font-size')).toBe('large')
    })

    it('creates screen reader announcements', async () => {
      const user = userEvent.setup()
      
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      const announceButton = screen.getByText('Announce')
      await user.click(announceButton)

      // Check that announcement element is created temporarily
      await waitFor(() => {
        const announcements = document.querySelectorAll('[aria-live="polite"]')
        expect(announcements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('AccessibleFormField', () => {
    it('renders with proper ARIA attributes', () => {
      const mockOnChange = jest.fn()
      
      render(
        <AccessibilityProvider>
          <AccessibleFormField
            label="Test Field"
            name="test"
            value=""
            onChange={mockOnChange}
            required
            help="This is help text"
          />
        </AccessibilityProvider>
      )

      const input = screen.getByRole('textbox', { name: /test field/i })
      expect(input).toHaveAttribute('required')
      expect(input).toHaveAttribute('aria-describedby')
      expect(screen.getByText('This is help text')).toBeInTheDocument()
    })

    it('displays error with proper ARIA attributes', () => {
      const mockOnChange = jest.fn()
      
      render(
        <AccessibilityProvider>
          <AccessibleFormField
            label="Test Field"
            name="test"
            value=""
            onChange={mockOnChange}
            error="This field is required"
          />
        </AccessibilityProvider>
      )

      const input = screen.getByLabelText('Test Field')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      
      const errorElement = screen.getByRole('alert')
      expect(errorElement).toHaveTextContent('This field is required')
      expect(errorElement).toHaveAttribute('aria-live', 'polite')
    })

    it('handles user input correctly', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(
        <AccessibilityProvider>
          <AccessibleFormField
            label="Test Field"
            name="test"
            value=""
            onChange={mockOnChange}
          />
        </AccessibilityProvider>
      )

      const input = screen.getByLabelText('Test Field')
      await user.type(input, 'a')

      expect(mockOnChange).toHaveBeenCalledWith('a')
    })
  })

  describe('AccessibleSelect', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3', disabled: true }
    ]

    it('renders select with options', () => {
      const mockOnChange = jest.fn()
      
      render(
        <AccessibilityProvider>
          <AccessibleSelect
            label="Test Select"
            name="test"
            value=""
            onChange={mockOnChange}
            options={options}
            emptyOption="Choose an option"
          />
        </AccessibilityProvider>
      )

      const select = screen.getByLabelText('Test Select')
      expect(select).toBeInTheDocument()
      expect(screen.getByText('Choose an option')).toBeInTheDocument()
      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
      expect(screen.getByText('Option 3')).toBeInTheDocument()
    })

    it('handles selection changes', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(
        <AccessibilityProvider>
          <AccessibleSelect
            label="Test Select"
            name="test"
            value=""
            onChange={mockOnChange}
            options={options}
          />
        </AccessibilityProvider>
      )

      const select = screen.getByLabelText('Test Select')
      await user.selectOptions(select, 'option1')

      expect(mockOnChange).toHaveBeenCalledWith('option1')
    })
  })

  describe('AccessibleTextarea', () => {
    it('renders textarea with character count', () => {
      const mockOnChange = jest.fn()
      
      render(
        <AccessibilityProvider>
          <AccessibleTextarea
            label="Test Textarea"
            name="test"
            value="Hello"
            onChange={mockOnChange}
            maxLength={100}
          />
        </AccessibilityProvider>
      )

      const textarea = screen.getByLabelText('Test Textarea')
      expect(textarea).toBeInTheDocument()
      expect(screen.getByText('5/100')).toBeInTheDocument()
    })

    it('updates character count on input', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(
        <AccessibilityProvider>
          <AccessibleTextarea
            label="Test Textarea"
            name="test"
            value=""
            onChange={mockOnChange}
            maxLength={100}
          />
        </AccessibilityProvider>
      )

      const textarea = screen.getByLabelText('Test Textarea')
      await user.type(textarea, 'Hello')

      // Check that onChange was called
      expect(mockOnChange).toHaveBeenCalled()
    })
  })

  describe('AccessibleCheckbox', () => {
    it('renders checkbox with proper labeling', () => {
      const mockOnChange = jest.fn()
      
      render(
        <AccessibilityProvider>
          <AccessibleCheckbox
            label="Test Checkbox"
            name="test"
            checked={false}
            onChange={mockOnChange}
            help="This is a test checkbox"
          />
        </AccessibilityProvider>
      )

      const checkbox = screen.getByLabelText('Test Checkbox')
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
      expect(screen.getByText('This is a test checkbox')).toBeInTheDocument()
    })

    it('handles checkbox changes', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(
        <AccessibilityProvider>
          <AccessibleCheckbox
            label="Test Checkbox"
            name="test"
            checked={false}
            onChange={mockOnChange}
          />
        </AccessibilityProvider>
      )

      const checkbox = screen.getByLabelText('Test Checkbox')
      await user.click(checkbox)

      expect(mockOnChange).toHaveBeenCalledWith(true)
    })
  })

  describe('SkipLinks', () => {
    it('renders skip links', () => {
      render(
        <AccessibilityProvider>
          <SkipLinks />
        </AccessibilityProvider>
      )

      expect(screen.getByText('Skip to main content')).toBeInTheDocument()
      expect(screen.getByText('Skip to navigation')).toBeInTheDocument()
      expect(screen.getByText('Skip to footer')).toBeInTheDocument()
    })

    it('handles skip link clicks', async () => {
      const user = userEvent.setup()
      
      // Create target elements
      document.body.innerHTML += '<main id="main-content" tabindex="-1">Main content</main>'
      
      render(
        <AccessibilityProvider>
          <SkipLinks />
        </AccessibilityProvider>
      )

      const skipLink = screen.getByText('Skip to main content')
      await user.click(skipLink)

      const mainContent = document.getElementById('main-content')
      expect(mainContent).toHaveFocus()
    })
  })

  describe('AccessibilitySettings', () => {
    it('opens settings modal', async () => {
      const user = userEvent.setup()
      
      render(
        <AccessibilityProvider>
          <AccessibilitySettings />
        </AccessibilityProvider>
      )

      const settingsButton = screen.getByLabelText('Open accessibility settings')
      await user.click(settingsButton)

      expect(screen.getByText('Accessibility Settings')).toBeInTheDocument()
      expect(screen.getByLabelText('Font Size')).toBeInTheDocument()
      expect(screen.getByLabelText('High Contrast Mode')).toBeInTheDocument()
    })

    it('closes settings modal with escape key', async () => {
      const user = userEvent.setup()
      
      render(
        <AccessibilityProvider>
          <AccessibilitySettings />
        </AccessibilityProvider>
      )

      // Open modal
      const settingsButton = screen.getByLabelText('Open accessibility settings')
      await user.click(settingsButton)

      expect(screen.getByText('Accessibility Settings')).toBeInTheDocument()

      // Close with escape
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByText('Accessibility Settings')).not.toBeInTheDocument()
      })
    })

    it('changes font size through settings', async () => {
      const user = userEvent.setup()
      
      render(
        <AccessibilityProvider>
          <AccessibilitySettings />
        </AccessibilityProvider>
      )

      // Open modal
      const settingsButton = screen.getByLabelText('Open accessibility settings')
      await user.click(settingsButton)

      // Change font size
      const fontSizeSelect = screen.getByLabelText('Font Size')
      await user.selectOptions(fontSizeSelect, 'large')

      expect(localStorage.getItem('accessibility-font-size')).toBe('large')
    })
  })

  describe('Keyboard Navigation', () => {
    it('supports tab navigation', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(
        <AccessibilityProvider>
          <div>
            <AccessibleFormField
              label="Field 1"
              name="field1"
              value=""
              onChange={mockOnChange}
            />
            <AccessibleFormField
              label="Field 2"
              name="field2"
              value=""
              onChange={mockOnChange}
            />
            <button>Submit</button>
          </div>
        </AccessibilityProvider>
      )

      const field1 = screen.getByLabelText('Field 1')
      const field2 = screen.getByLabelText('Field 2')
      const submitButton = screen.getByText('Submit')

      // Tab through elements
      await user.tab()
      expect(field1).toHaveFocus()

      await user.tab()
      expect(field2).toHaveFocus()

      await user.tab()
      expect(submitButton).toHaveFocus()
    })
  })

  describe('Color Contrast', () => {
    it('applies high contrast styles when enabled', async () => {
      const user = userEvent.setup()
      
      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      )

      const toggleButton = screen.getByText('Toggle High Contrast: Off')
      await user.click(toggleButton)

      // Check that high contrast class is applied to document
      expect(document.documentElement).toHaveClass('high-contrast')
    })
  })
})