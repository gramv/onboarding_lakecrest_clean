import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveClass(className: string): R
      toHaveTextContent(text: string): R
      toBeDisabled(): R
      toBeEnabled(): R
      toHaveAttribute(attr: string, value?: string): R
      toHaveValue(value: string | number): R
      toBeVisible(): R
      toBeChecked(): R
      toHaveFocus(): R
      toBeEmptyDOMElement(): R
      toBeInvalid(): R
      toBeRequired(): R
      toBeValid(): R
      toContainElement(element: HTMLElement | null): R
      toContainHTML(htmlText: string): R
      toHaveAccessibleDescription(expectedAccessibleDescription?: string | RegExp): R
      toHaveAccessibleName(expectedAccessibleName?: string | RegExp): R
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R
      toHaveErrorMessage(expectedErrorMessage?: string | RegExp): R
      toHaveFormValues(expectedValues: Record<string, any>): R
      toHaveStyle(css: string | Record<string, any>): R
      toBePartiallyChecked(): R
    }
  }
}