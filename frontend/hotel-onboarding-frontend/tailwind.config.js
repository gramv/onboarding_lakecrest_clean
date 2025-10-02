/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			hotel: {
  				primary: 'hsl(var(--hotel-primary))',
  				'primary-light': 'hsl(var(--hotel-primary-light))',
  				'primary-dark': 'hsl(var(--hotel-primary-dark))',
  				secondary: 'hsl(var(--hotel-secondary))',
  				neutral: {
  					50: 'hsl(var(--hotel-neutral-50))',
  					100: 'hsl(var(--hotel-neutral-100))',
  					200: 'hsl(var(--hotel-neutral-200))',
  					300: 'hsl(var(--hotel-neutral-300))',
  					400: 'hsl(var(--hotel-neutral-400))',
  					500: 'hsl(var(--hotel-neutral-500))',
  					600: 'hsl(var(--hotel-neutral-600))',
  					700: 'hsl(var(--hotel-neutral-700))',
  					800: 'hsl(var(--hotel-neutral-800))',
  					900: 'hsl(var(--hotel-neutral-900))'
  				}
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			error: {
  				DEFAULT: 'hsl(var(--error))',
  				foreground: 'hsl(var(--error-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))'
  			}
  		},
  		fontFamily: {
  			sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
  			mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
  		},
  		spacing: {
  			'0': 'var(--spacing-0)',
  			'1': 'var(--spacing-1)',
  			'2': 'var(--spacing-2)',
  			'3': 'var(--spacing-3)',
  			'4': 'var(--spacing-4)',
  			'5': 'var(--spacing-5)',
  			'6': 'var(--spacing-6)',
  			'8': 'var(--spacing-8)',
  			'10': 'var(--spacing-10)',
  			'12': 'var(--spacing-12)',
  			'16': 'var(--spacing-16)',
  			'20': 'var(--spacing-20)',
  			'24': 'var(--spacing-24)'
  		},
  		fontSize: {
  			'xs': 'var(--font-size-xs)',
  			'sm': 'var(--font-size-sm)',
  			'base': 'var(--font-size-base)',
  			'lg': 'var(--font-size-lg)',
  			'xl': 'var(--font-size-xl)',
  			'2xl': 'var(--font-size-2xl)',
  			'3xl': 'var(--font-size-3xl)',
  			'4xl': 'var(--font-size-4xl)'
  		},
  		boxShadow: {
  			'sm': 'var(--shadow-sm)',
  			'md': 'var(--shadow-md)',
  			'lg': 'var(--shadow-lg)',
  			'xl': 'var(--shadow-xl)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-in': {
  				'0%': { opacity: '0', transform: 'translateY(10px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' }
  			},
  			'slide-in-right': {
  				'0%': { opacity: '0', transform: 'translateX(20px)' },
  				'100%': { opacity: '1', transform: 'translateX(0)' }
  			},
  			'pulse-soft': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.8' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.3s ease-out',
  			'slide-in-right': 'slide-in-right 0.3s ease-out',
  			'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  		}
  	}
  },
  plugins: [import("tailwindcss-animate")],
}

