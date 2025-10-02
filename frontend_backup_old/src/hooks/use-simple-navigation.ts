import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { NavigationItem } from '@/components/ui/dashboard-navigation'

interface NavigationState {
    currentSection: string
    previousSection: string | null
    isNavigating: boolean
    navigationHistory: string[]
    breadcrumbs: BreadcrumbItem[]
    activeIndex: number
}

interface BreadcrumbItem {
    label: string
    path?: string
    icon?: React.ComponentType<{ className?: string }>
}

interface UseSimpleNavigationOptions {
    role: 'hr' | 'manager'
    onNavigate?: (from: string, to: string) => void
}

const HR_PAGE_TITLES: Record<string, string> = {
    properties: 'Properties - HR Dashboard',
    managers: 'Managers - HR Dashboard',
    employees: 'Employees - HR Dashboard',
    applications: 'Applications - HR Dashboard',
    analytics: 'Analytics - HR Dashboard'
}

const MANAGER_PAGE_TITLES: Record<string, string> = {
    applications: 'Applications - Manager Dashboard',
    employees: 'Employees - Manager Dashboard',
    analytics: 'Analytics - Manager Dashboard'
}

// Global navigation state to prevent duplicates across all instances
const globalNavigationState = {
    isProcessing: false,
    lastPath: '',
    lastCallback: '',
    timeout: null as NodeJS.Timeout | null
}

/**
 * Simple, bulletproof navigation hook with duplicate prevention
 * NO DEBOUNCING, NO COMPLEX LOGIC, JUST WORKS
 */
export function useSimpleNavigation({
    role,
    onNavigate
}: UseSimpleNavigationOptions) {
    const location = useLocation()
    const navigate = useNavigate()
    const lastPathRef = useRef<string>(location.pathname)
    const hookId = useRef(`${role}-${Math.random().toString(36).substr(2, 9)}`)

    const defaultSection = role === 'hr' ? 'properties' : 'applications'

    // Initialize with current URL section
    const getCurrentSectionFromUrl = () => {
        const pathSegments = location.pathname.split('/')
        const section = pathSegments[2]
        const validSections = role === 'hr'
            ? ['properties', 'managers', 'employees', 'applications', 'analytics']
            : ['applications', 'employees', 'analytics']
        return validSections.includes(section) ? section : defaultSection
    }

    const [state, setState] = useState<NavigationState>(() => ({
        currentSection: getCurrentSectionFromUrl(),
        previousSection: null,
        isNavigating: false,
        navigationHistory: [],
        breadcrumbs: [],
        activeIndex: -1
    }))

    // Get current section from URL - simple function, no useCallback
    const getCurrentSection = () => {
        const pathSegments = location.pathname.split('/')
        const section = pathSegments[2]

        const validSections = role === 'hr'
            ? ['properties', 'managers', 'employees', 'applications', 'analytics']
            : ['applications', 'employees', 'analytics']

        return validSections.includes(section) ? section : defaultSection
    }

    // SIMPLE SOLUTION: Just prevent rapid duplicate clicks, allow back-and-forth
    useEffect(() => {
        const currentPath = location.pathname

        // Only process if path actually changed for this hook instance
        if (currentPath === lastPathRef.current) {
            return
        }

        const pathSegments = currentPath.split('/')
        const section = pathSegments[2]

        const validSections = role === 'hr'
            ? ['properties', 'managers', 'employees', 'applications', 'analytics']
            : ['applications', 'employees', 'analytics']

        const newSection = validSections.includes(section) ? section : defaultSection

        // Get current section from previous path (URL is source of truth)
        const previousPathSegments = lastPathRef.current.split('/')
        const previousSectionFromPath = previousPathSegments[2]
        const currentSection = (previousSectionFromPath && validSections.includes(previousSectionFromPath))
            ? previousSectionFromPath
            : defaultSection

        // Only process if section actually changed
        if (currentSection === newSection) {
            return
        }

        // Simple rapid-click prevention (only block if processing same transition)
        const transitionKey = `${currentSection}->${newSection}`
        if (globalNavigationState.isProcessing && globalNavigationState.lastCallback === transitionKey) {
            return
        }

        // Set processing state for this specific transition
        globalNavigationState.isProcessing = true
        globalNavigationState.lastCallback = transitionKey

        // Update page title directly
        const titleConfig = role === 'hr' ? HR_PAGE_TITLES : MANAGER_PAGE_TITLES
        const title = titleConfig[newSection] || `${newSection} - ${role === 'hr' ? 'HR' : 'Manager'} Dashboard`
        document.title = title

        // Call navigation callback ONCE with unique identifier
        onNavigate?.(currentSection, newSection)

        // Generate breadcrumbs directly
        const sectionLabels: Record<string, string> = {
            properties: 'Properties',
            managers: 'Managers',
            employees: 'Employees',
            applications: 'Applications',
            analytics: 'Analytics'
        }

        const newBreadcrumbs = [
            { label: 'Home', path: '/' },
            {
                label: role === 'hr' ? 'HR Dashboard' : 'Manager Dashboard',
                path: `/${role}`
            },
            { label: sectionLabels[newSection] || newSection }
        ]

        // Update state AFTER processing callback
        setState({
            currentSection: newSection,
            previousSection: currentSection,
            isNavigating: false,
            navigationHistory: [...state.navigationHistory, newSection].slice(-10),
            breadcrumbs: newBreadcrumbs,
            activeIndex: -1
        })

        // Reset processing flag quickly to allow different transitions
        setTimeout(() => {
            globalNavigationState.isProcessing = false
        }, 50)

        lastPathRef.current = currentPath
    }, [location.pathname, state.currentSection, state.navigationHistory])

    // Navigate to section
    const navigateToSection = useCallback((section: string) => {
        const validSections = role === 'hr'
            ? ['properties', 'managers', 'employees', 'applications', 'analytics']
            : ['applications', 'employees', 'analytics']

        if (!validSections.includes(section)) {
            return
        }

        if (state.currentSection === section) {
            return
        }

        const path = `/${role}/${section}`

        if (location.pathname === path) {
            return
        }

        setState(prev => ({ ...prev, isNavigating: true }))
        navigate(path) // Simple navigate, no replace
    }, [role, state.currentSection, location.pathname, navigate])

    // Handle navigation item click
    const handleNavigationClick = useCallback((item: NavigationItem) => {
        navigateToSection(item.key)
    }, [navigateToSection])

    // Browser navigation
    const goBack = useCallback(() => {
        window.history.back()
    }, [])

    const goForward = useCallback(() => {
        window.history.forward()
    }, [])

    const isActive = useCallback((section: string) => {
        return state.currentSection === section
    }, [state.currentSection])

    const getSectionPath = useCallback((section: string) => {
        return `/${role}/${section}`
    }, [role])

    const canGoBack = useCallback(() => {
        return state.navigationHistory.length > 1
    }, [state.navigationHistory])

    const canGoForward = useCallback(() => {
        return false // Limited detection
    }, [])

    // Bookmark support
    const getBookmarkUrl = useCallback((section?: string) => {
        const targetSection = section || state.currentSection
        return `${window.location.origin}/${role}/${targetSection}`
    }, [role, state.currentSection])

    const copyBookmarkUrl = useCallback(async (section?: string) => {
        const url = getBookmarkUrl(section)
        try {
            await navigator.clipboard.writeText(url)
            return true
        } catch (error) {
            console.error('Failed to copy URL to clipboard:', error)
            return false
        }
    }, [getBookmarkUrl])

    return {
        // State
        currentSection: state.currentSection,
        previousSection: state.previousSection,
        isNavigating: state.isNavigating,
        navigationHistory: state.navigationHistory,
        breadcrumbs: state.breadcrumbs,
        activeIndex: state.activeIndex,

        // Navigation actions
        navigateToSection,
        handleNavigationClick,
        goBack,
        goForward,

        // Utilities
        isActive,
        getSectionPath,
        getCurrentSection,
        canGoBack,
        canGoForward,

        // Bookmark support
        getBookmarkUrl,
        copyBookmarkUrl,

        // State management
        setActiveIndex: useCallback((index: number) => {
            setState(prev => ({ ...prev, activeIndex: index }))
        }, [])
    }
}

// Simple analytics hook
export function useNavigationAnalytics() {
    const [analytics, setAnalytics] = useState({
        totalNavigations: 0,
        sectionVisits: {} as Record<string, number>,
        averageTimePerSection: {} as Record<string, number>,
        lastVisitTime: {} as Record<string, number>
    })

    const trackNavigation = useCallback((from: string, to: string) => {
        const now = Date.now()

        setAnalytics(prev => {
            const newAnalytics = { ...prev }

            newAnalytics.totalNavigations += 1
            newAnalytics.sectionVisits[to] = (newAnalytics.sectionVisits[to] || 0) + 1

            if (prev.lastVisitTime[from]) {
                const timeSpent = now - prev.lastVisitTime[from]
                const currentAverage = prev.averageTimePerSection[from] || 0
                const visitCount = prev.sectionVisits[from] || 1

                newAnalytics.averageTimePerSection[from] =
                    (currentAverage * (visitCount - 1) + timeSpent) / visitCount
            }

            newAnalytics.lastVisitTime[to] = now

            return newAnalytics
        })
    }, [])

    const getAnalytics = useCallback(() => analytics, [analytics])

    const resetAnalytics = useCallback(() => {
        setAnalytics({
            totalNavigations: 0,
            sectionVisits: {},
            averageTimePerSection: {},
            lastVisitTime: {}
        })
    }, [])

    return {
        trackNavigation,
        getAnalytics,
        resetAnalytics,
        analytics
    }
}