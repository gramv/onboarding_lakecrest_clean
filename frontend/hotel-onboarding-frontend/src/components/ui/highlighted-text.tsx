import * as React from "react"
// import { cn } from "@/lib/utils"

export interface HighlightedTextProps {
  text: string
  highlight?: string
  className?: string
  highlightClassName?: string
  caseSensitive?: boolean
}

export function HighlightedText({
  text,
  highlight,
  className,
  highlightClassName = "bg-yellow-200 px-0.5 rounded",
  caseSensitive = false,
}: HighlightedTextProps) {
  if (!highlight || !text) {
    return <span className={className}>{text}</span>
  }

  const searchText = caseSensitive ? text : text.toLowerCase()
  const searchHighlight = caseSensitive ? highlight : highlight.toLowerCase()
  
  // Split highlight into words for better matching
  const highlightWords = searchHighlight.split(/\s+/).filter(word => word.length > 0)
  
  if (highlightWords.length === 0) {
    return <span className={className}>{text}</span>
  }

  // Find all matches
  const matches: { start: number; end: number; word: string }[] = []
  
  highlightWords.forEach(word => {
    let startIndex = 0
    while (true) {
      const index = searchText.indexOf(word, startIndex)
      if (index === -1) break
      
      matches.push({
        start: index,
        end: index + word.length,
        word
      })
      
      startIndex = index + 1
    }
  })

  // Sort matches by start position and merge overlapping ones
  const sortedMatches = matches
    .sort((a, b) => a.start - b.start)
    .reduce((merged: typeof matches, current) => {
      if (merged.length === 0) {
        return [current]
      }
      
      const last = merged[merged.length - 1]
      if (current.start <= last.end) {
        // Overlapping or adjacent matches - merge them
        last.end = Math.max(last.end, current.end)
        return merged
      }
      
      return [...merged, current]
    }, [])

  if (sortedMatches.length === 0) {
    return <span className={className}>{text}</span>
  }

  // Build the highlighted text
  const parts: React.ReactNode[] = []
  let lastIndex = 0

  sortedMatches.forEach((match, index) => {
    // Add text before the match
    if (match.start > lastIndex) {
      parts.push(
        <span key={`text-${index}`}>
          {text.slice(lastIndex, match.start)}
        </span>
      )
    }

    // Add the highlighted match
    parts.push(
      <mark key={`highlight-${index}`} className={highlightClassName}>
        {text.slice(match.start, match.end)}
      </mark>
    )

    lastIndex = match.end
  })

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key="text-end">
        {text.slice(lastIndex)}
      </span>
    )
  }

  return <span className={className}>{parts}</span>
}

// Hook for highlighting multiple fields in search results
export function useTextHighlighting(searchQuery: string) {
  const highlightText = React.useCallback((text: string, options?: {
    caseSensitive?: boolean
    highlightClassName?: string
  }) => {
    return (
      <HighlightedText
        text={text}
        highlight={searchQuery}
        caseSensitive={options?.caseSensitive}
        highlightClassName={options?.highlightClassName}
      />
    )
  }, [searchQuery])

  return { highlightText }
}