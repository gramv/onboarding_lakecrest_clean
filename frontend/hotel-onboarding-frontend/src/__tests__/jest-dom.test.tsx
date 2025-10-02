import React from 'react'
import { render, screen } from '@testing-library/react'

describe('Jest DOM Setup Test', () => {
  test('toBeInTheDocument matcher works', () => {
    render(<div>Hello World</div>)
    
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})